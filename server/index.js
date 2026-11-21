import { createServer } from 'node:http'
import { randomBytes, randomUUID, scrypt as scryptCallback, createHash, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

const scrypt = promisify(scryptCallback)
const here = path.dirname(fileURLToPath(import.meta.url))
const projectDir = path.resolve(here, '..')
const dataDir = path.resolve(process.env.DATA_DIR || path.join(here, 'data'))
const dbFile = path.join(dataDir, 'buddyboard.sqlite')
const legacyFile = path.join(dataDir, 'requests.json')
const distDir = path.join(projectDir, 'dist')
const port = Number(process.env.API_PORT || process.env.PORT || 4000)
const host = process.env.HOST || '0.0.0.0'
const categories = ['Borrow', 'Company', 'Skill swap', 'Tiny mission', 'Offer a hand']
const palette = ['lavender', 'peach', 'mint', 'yellow']
mkdirSync(dataDir, { recursive: true })
const db = new DatabaseSync(dbFile)
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;')
function transaction(work) {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = work()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, full_name TEXT NOT NULL, email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    student_id TEXT NOT NULL COLLATE NOCASE UNIQUE, branch TEXT NOT NULL, study_year INTEGER NOT NULL,
    salt TEXT NOT NULL, password_hash TEXT NOT NULL, rank_points INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY, author_id TEXT REFERENCES users(id), person TEXT NOT NULL,
    tag TEXT NOT NULL, icon TEXT NOT NULL, title TEXT NOT NULL, detail TEXT NOT NULL,
    swap_details TEXT NOT NULL DEFAULT '', place TEXT NOT NULL, need TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open', created_at INTEGER NOT NULL,
    legacy_helped INTEGER NOT NULL DEFAULT 0, color TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS help_events (
    id TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    helper_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', swap_offer TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL, completed_at INTEGER, base_points INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY, help_id TEXT NOT NULL UNIQUE REFERENCES help_events(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES users(id), helper_id TEXT NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), comment TEXT NOT NULL DEFAULT '',
    points_awarded INTEGER NOT NULL, created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS requests_created_idx ON requests(created_at DESC);
  CREATE INDEX IF NOT EXISTS help_request_idx ON help_events(request_id);
  CREATE INDEX IF NOT EXISTS feedback_helper_idx ON feedback(helper_id);
`)

const seed = [
  { id: 'seed-calculator', tag: 'Borrow', icon: '📚', title: 'A calculator for one tiny exam panic', detail: 'Mine chose today to disappear. Any scientific calculator I can borrow for the 2pm quiz?', person: 'Mira S.', initials: 'MS', place: 'North Block · Room 204', need: 'Just 2 hours', helped: 3, createdAt: Date.now() - 12 * 60_000, status: 'open', authorId: 'demo-mira', color: 'lavender' },
  { id: 'seed-lunch', tag: 'Company', icon: '🫶', title: 'Lunch table has one extra seat', detail: 'New to campus and trying the canteen thali. Come be my first lunch buddy?', person: 'Aarav K.', initials: 'AK', place: 'Main Canteen', need: 'Today · 1:15 pm', helped: 5, createdAt: Date.now() - 28 * 60_000, status: 'open', authorId: 'demo-aarav', color: 'peach' },
  { id: 'seed-skill', tag: 'Skill swap', icon: '🎨', title: 'Trade: poster feedback for chai', detail: 'I’ll give your portfolio a fresh pair of eyes if you help me pick between two poster colors.', swapDetails: 'I can offer poster feedback; hoping to learn a few Figma shortcuts.', person: 'Zoya R.', initials: 'ZR', place: 'Design Studio', need: 'A quick 10 min', helped: 2, createdAt: Date.now() - 45 * 60_000, status: 'open', authorId: 'demo-zoya', color: 'mint' },
  { id: 'seed-plants', tag: 'Tiny mission', icon: '🌱', title: 'The thirsty plant rescue squad', detail: 'Three plants in the library corner need a little water while the usual caretaker is away.', person: 'Library crew', initials: 'LC', place: 'Library · Window seats', need: 'Anytime today', helped: 7, createdAt: Date.now() - 60 * 60_000, status: 'open', authorId: 'demo-library', color: 'yellow' },
]

function seedOrImportRequests() {
  if (db.prepare('SELECT COUNT(*) AS count FROM requests').get().count) return
  let records = seed
  if (existsSync(legacyFile)) {
    try {
      const old = JSON.parse(readFileSync(legacyFile, 'utf8'))
      if (Array.isArray(old.requests) && old.requests.length) records = old.requests
    } catch (error) { console.error('Could not import existing request file:', error.message) }
  }
  const insertUser = db.prepare(`INSERT OR IGNORE INTO users
    (id,full_name,email,student_id,branch,study_year,salt,password_hash,created_at)
    VALUES (?,?,?,?,?,?,?,?,?)`)
  const insertRequest = db.prepare(`INSERT OR IGNORE INTO requests
    (id,author_id,person,tag,icon,title,detail,swap_details,place,need,status,created_at,legacy_helped,color)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
  transaction(() => {
    for (const item of records) {
      const authorId = `legacy-${String(item.authorId || item.id).replace(/[^a-z0-9_-]/gi, '').slice(0, 50)}`
      const fullName = String(item.person || 'Campus buddy').slice(0, 40)
      insertUser.run(authorId, fullName, `${authorId}@legacy.invalid`, authorId, 'Legacy board', 1, 'legacy', 'not-a-login', Date.now())
      insertRequest.run(String(item.id || randomUUID()), authorId, fullName, categories.includes(item.tag) ? item.tag : 'Borrow', item.icon || '✨', String(item.title || 'Campus ask').slice(0, 70), String(item.detail || '').slice(0, 220), String(item.swapDetails || '').slice(0, 180), String(item.place || 'IIIT Kota campus').slice(0, 80), String(item.need || 'Whenever works').slice(0, 50), item.status === 'completed' ? 'completed' : 'open', Number(item.createdAt) || Date.now(), Math.max(0, Number(item.helped) || 0), palette.includes(item.color) ? item.color : palette[0])
    }
  })
}
seedOrImportRequests()

function send(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(payload))
}

async function readBody(req) {
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (raw.length > 20_000) throw Object.assign(new Error('Request is too large.'), { status: 413 })
  }
  try { return raw ? JSON.parse(raw) : {} }
  catch { throw Object.assign(new Error('Please send valid JSON.'), { status: 400 }) }
}

function ageLabel(timestamp) {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  return `${hours} hr${hours === 1 ? '' : 's'} ago`
}

function rankFor(points) {
  if (points >= 300) return { name: 'Campus Star', nextAt: null }
  if (points >= 150) return { name: 'Bloom', nextAt: 300 }
  if (points >= 50) return { name: 'Bud', nextAt: 150 }
  return { name: 'Seedling', nextAt: 50 }
}

function userSummary(userId) {
  const user = db.prepare('SELECT id,full_name,email,student_id,branch,study_year,rank_points,created_at FROM users WHERE id=?').get(userId)
  if (!user) return null
  const helped = db.prepare("SELECT COUNT(*) AS count FROM help_events WHERE helper_id=? AND status='completed'").get(userId).count
  const asked = db.prepare('SELECT COUNT(*) AS count FROM requests WHERE author_id=?').get(userId).count
  const rank = rankFor(user.rank_points)
  return { id: user.id, fullName: user.full_name, email: user.email, studentId: user.student_id, branch: user.branch, year: user.study_year, rankPoints: user.rank_points, helpedCount: helped, asksCount: asked, rank: rank.name, nextRankAt: rank.nextAt }
}

function tokenFrom(req) {
  const match = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)
  return match?.[1] || ''
}

function currentUser(req) {
  const token = tokenFrom(req)
  if (!token) return null
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const session = db.prepare('SELECT user_id,expires_at FROM sessions WHERE token_hash=?').get(tokenHash)
  if (!session || session.expires_at < Date.now()) {
    if (session) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash)
    return null
  }
  return db.prepare('SELECT id,full_name FROM users WHERE id=?').get(session.user_id) || null
}

function createSession(userId) {
  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000
  db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (?,?,?)').run(tokenHash, userId, expiresAt)
  return { token, user: userSummary(userId) }
}

function presentRequest(row, viewerId) {
  const isMine = row.author_id === viewerId
  const helpers = db.prepare(`SELECT h.id,h.helper_id,h.status,h.swap_offer,h.created_at,
      u.full_name,f.rating,f.comment,f.points_awarded
    FROM help_events h JOIN users u ON u.id=h.helper_id LEFT JOIN feedback f ON f.help_id=h.id
    WHERE h.request_id=? ORDER BY h.created_at DESC`).all(row.id)
  const myEvent = helpers.find(helper => helper.helper_id === viewerId)
  const shapedHelpers = helpers.map(helper => ({
    id: helper.id, name: helper.full_name, status: helper.status, offer: helper.swap_offer,
    hasFeedback: helper.rating !== null, rating: helper.rating, comment: helper.comment,
    pointsAwarded: helper.points_awarded,
  }))
  const swapOffers = helpers.filter(helper => helper.swap_offer).map(helper => ({
    id: helper.id, senderName: helper.full_name, offer: helper.swap_offer,
    status: helper.status === 'accepted' || helper.status === 'completed' ? 'accepted' : 'pending',
  }))
  return {
    id: row.id, tag: row.tag, icon: row.icon, title: row.title, detail: row.detail,
    swapDetails: row.swap_details, person: row.person, initials: row.person.split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() || '').join(''),
    place: row.place, need: row.need, status: row.status, color: row.color,
    time: ageLabel(row.created_at), helped: Number(row.legacy_helped) + helpers.length,
    helpedByMe: Boolean(myEvent), myHelpStatus: myEvent?.status || null,
    mySwapOfferStatus: myEvent?.swap_offer ? (myEvent.status === 'accepted' || myEvent.status === 'completed' ? 'accepted' : 'pending') : null,
    ...(myEvent?.rating ? { myFeedback: { rating: myEvent.rating, comment: myEvent.comment, pointsAwarded: myEvent.points_awarded } } : {}),
    isMine, ...(isMine ? { helpers: shapedHelpers, swapOffers } : {}),
  }
}

function requireUser(req, res) {
  const user = currentUser(req)
  if (!user) { send(res, 401, { error: 'Sign in to continue.' }); return null }
  return user
}

function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) }

function serveFrontend(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 404, { error: 'Route not found.' })
  let decoded
  try { decoded = decodeURIComponent(pathname) }
  catch { return send(res, 400, { error: 'Invalid URL path.' }) }
  const requested = path.resolve(distDir, `.${decoded}`)
  if (requested !== distDir && !requested.startsWith(`${distDir}${path.sep}`)) return send(res, 403, { error: 'Path is outside the public directory.' })
  const candidate = existsSync(requested) && statSync(requested).isFile() ? requested : path.join(distDir, 'index.html')
  if (!existsSync(candidate)) return send(res, 503, { error: 'The frontend has not been built yet. Run npm run build.' })
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2' }
  res.writeHead(200, { 'Content-Type': types[path.extname(candidate).toLowerCase()] || 'application/octet-stream', 'Cache-Control': candidate.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable' })
  if (req.method === 'HEAD') return res.end()
  createReadStream(candidate).pipe(res)
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  try {
    if (url.pathname === '/api/health' && req.method === 'GET') return send(res, 200, { ok: true, campus: 'Indian Institute of Information Technology Kota', database: 'sqlite' })
    if (!url.pathname.startsWith('/api/')) return serveFrontend(req, res, url.pathname)

    if (url.pathname === '/api/auth/register' && req.method === 'POST') {
      const body = await readBody(req)
      const fullName = String(body.fullName || '').trim()
      const email = String(body.email || '').trim().toLowerCase()
      const studentId = String(body.studentId || '').trim()
      const branch = String(body.branch || '').trim()
      const year = Number(body.year)
      const password = String(body.password || '')
      if (fullName.length < 2 || fullName.length > 60) return send(res, 400, { error: 'Enter your name (2–60 characters).' })
      if (!validEmail(email)) return send(res, 400, { error: 'Enter a valid email address.' })
      if (studentId.length < 3 || studentId.length > 30) return send(res, 400, { error: 'Enter a valid student ID.' })
      if (!branch || branch.length > 80) return send(res, 400, { error: 'Enter your branch or program.' })
      if (!Number.isInteger(year) || year < 1 || year > 6) return send(res, 400, { error: 'Choose a valid study year.' })
      if (password.length < 8 || password.length > 128) return send(res, 400, { error: 'Password must be 8–128 characters.' })
      const salt = randomBytes(16).toString('hex')
      const passwordHash = (await scrypt(password, salt, 64)).toString('hex')
      const userId = randomUUID()
      try {
        db.prepare(`INSERT INTO users(id,full_name,email,student_id,branch,study_year,salt,password_hash,created_at)
          VALUES (?,?,?,?,?,?,?,?,?)`).run(userId, fullName, email, studentId, branch, year, salt, passwordHash, Date.now())
      } catch (error) {
        if (String(error.message).includes('UNIQUE')) return send(res, 409, { error: 'That email or student ID already has an account. Try signing in.' })
        throw error
      }
      return send(res, 201, createSession(userId))
    }

    if (url.pathname === '/api/auth/login' && req.method === 'POST') {
      const body = await readBody(req)
      const email = String(body.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      const user = db.prepare('SELECT id,salt,password_hash FROM users WHERE email=?').get(email)
      if (!user || user.password_hash === 'not-a-login') return send(res, 401, { error: 'Email or password is incorrect.' })
      const candidate = Buffer.from(await scrypt(password, user.salt, 64))
      const expected = Buffer.from(user.password_hash, 'hex')
      if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) return send(res, 401, { error: 'Email or password is incorrect.' })
      return send(res, 200, createSession(user.id))
    }

    if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
      const token = tokenFrom(req)
      if (token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(createHash('sha256').update(token).digest('hex'))
      return send(res, 200, { ok: true })
    }

    const user = requireUser(req, res)
    if (!user) return

    if (url.pathname === '/api/me' && req.method === 'GET') return send(res, 200, { user: userSummary(user.id) })

    if (url.pathname === '/api/me/helps' && req.method === 'GET') {
      const helps = db.prepare(`SELECT h.id,h.status,h.created_at,h.base_points,r.title,r.id AS request_id,
          f.rating,f.comment,f.points_awarded
        FROM help_events h JOIN requests r ON r.id=h.request_id LEFT JOIN feedback f ON f.help_id=h.id
        WHERE h.helper_id=? ORDER BY h.created_at DESC LIMIT 12`).all(user.id)
      return send(res, 200, { helps: helps.map(help => ({ id: help.id, title: help.title, requestId: help.request_id,
        status: help.status, basePoints: help.base_points, rating: help.rating,
        comment: help.comment, feedbackPoints: help.points_awarded })) })
    }

    if (url.pathname === '/api/leaderboard' && req.method === 'GET') {
      const leaders = db.prepare('SELECT id,full_name,branch,study_year,rank_points FROM users WHERE password_hash != ? ORDER BY rank_points DESC,full_name LIMIT 10').all('not-a-login')
      return send(res, 200, { leaders: leaders.map((leader, index) => ({ id: leader.id, position: index + 1, name: leader.full_name, branch: leader.branch, year: leader.study_year, rankPoints: leader.rank_points, rank: rankFor(leader.rank_points).name })) })
    }

    if (url.pathname === '/api/stats' && req.method === 'GET') {
      return send(res, 200, {
        openRequests: db.prepare("SELECT COUNT(*) AS count FROM requests WHERE status='open'").get().count,
        helpersShowingUp: db.prepare("SELECT COUNT(*) AS count FROM help_events WHERE status IN ('pending','accepted')").get().count,
        completedRequests: db.prepare("SELECT COUNT(*) AS count FROM requests WHERE status='completed'").get().count,
      })
    }

    if (url.pathname === '/api/requests' && req.method === 'GET') {
      const status = url.searchParams.get('status') || 'open'
      const category = url.searchParams.get('category')
      const query = (url.searchParams.get('q') || '').trim().toLowerCase()
      const mine = url.searchParams.get('mine') === 'true'
      let rows = db.prepare(`SELECT * FROM requests WHERE (?='all' OR status=?) AND (? IS NULL OR tag=?) AND (?=0 OR author_id=?) ORDER BY created_at DESC`).all(status, status, category, category, mine ? 1 : 0, user.id)
      if (query) rows = rows.filter(row => `${row.title} ${row.detail} ${row.place} ${row.person} ${row.swap_details}`.toLowerCase().includes(query))
      return send(res, 200, { requests: rows.map(row => presentRequest(row, user.id)) })
    }

    if (url.pathname === '/api/requests' && req.method === 'POST') {
      const body = await readBody(req)
      const title = String(body.title || '').trim()
      const detail = String(body.detail || '').trim()
      const tag = String(body.tag || '')
      const swapDetails = String(body.swapDetails || '').trim()
      if (!title || title.length > 70) return send(res, 400, { error: 'Add a headline of 1–70 characters.' })
      if (detail.length > 220) return send(res, 400, { error: 'Details must be 220 characters or fewer.' })
      if (!categories.includes(tag)) return send(res, 400, { error: 'Choose one of the available ask types.' })
      if (tag === 'Skill swap' && !swapDetails) return send(res, 400, { error: 'Tell buddies what you can offer and what you hope to learn.' })
      if (swapDetails.length > 180) return send(res, 400, { error: 'Swap details must be 180 characters or fewer.' })
      const id = randomUUID()
      const icon = ({ Borrow: '📦', Company: '☕', 'Skill swap': '🔄', 'Tiny mission': '✨', 'Offer a hand': '🙌' })[tag]
      db.prepare(`INSERT INTO requests(id,author_id,person,tag,icon,title,detail,swap_details,place,need,created_at,color)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, user.id, user.full_name, tag, icon, title, detail || 'A little campus moment where a buddy could make all the difference.', swapDetails, String(body.place || 'IIIT Kota campus').trim().slice(0, 80) || 'IIIT Kota campus', String(body.need || 'Whenever works').trim().slice(0, 50) || 'Whenever works', Date.now(), palette[Math.floor(Math.random() * palette.length)])
      const row = db.prepare('SELECT * FROM requests WHERE id=?').get(id)
      return send(res, 201, { request: presentRequest(row, user.id) })
    }

    const offerMatch = url.pathname.match(/^\/api\/requests\/([^/]+)\/offers\/([^/]+)$/)
    if (offerMatch && req.method === 'PATCH') {
      const [, requestId, helpId] = offerMatch
      const request = db.prepare('SELECT * FROM requests WHERE id=?').get(requestId)
      const event = db.prepare('SELECT * FROM help_events WHERE id=? AND request_id=?').get(helpId, requestId)
      if (!request || !event || !event.swap_offer) return send(res, 404, { error: 'That swap offer could not be found.' })
      if (request.author_id !== user.id) return send(res, 403, { error: 'Only the person who posted this swap can accept an offer.' })
      if (db.prepare("SELECT COUNT(*) AS count FROM help_events WHERE request_id=? AND status IN ('accepted','completed')").get(requestId).count) return send(res, 409, { error: 'You have already matched with a swap buddy for this post.' })
      db.prepare("UPDATE help_events SET status='accepted' WHERE id=?").run(helpId)
      return send(res, 200, { request: presentRequest(request, user.id) })
    }

    const completeHelpMatch = url.pathname.match(/^\/api\/helps\/([^/]+)\/complete$/)
    if (completeHelpMatch && req.method === 'POST') {
      const event = db.prepare(`SELECT h.*,r.author_id FROM help_events h JOIN requests r ON r.id=h.request_id WHERE h.id=?`).get(completeHelpMatch[1])
      if (!event) return send(res, 404, { error: 'Help response not found.' })
      if (event.author_id !== user.id) return send(res, 403, { error: 'Only the person who asked for help can confirm it.' })
      if (event.status === 'completed') return send(res, 200, { ok: true, pointsAwarded: event.base_points })
      transaction(() => {
        db.prepare("UPDATE help_events SET status='completed',completed_at=?,base_points=10 WHERE id=?").run(Date.now(), event.id)
        db.prepare('UPDATE users SET rank_points=rank_points+10 WHERE id=?').run(event.helper_id)
      })
      return send(res, 200, { ok: true, pointsAwarded: 10, user: userSummary(event.helper_id) })
    }

    const feedbackMatch = url.pathname.match(/^\/api\/helps\/([^/]+)\/feedback$/)
    if (feedbackMatch && req.method === 'POST') {
      const body = await readBody(req)
      const rating = Number(body.rating)
      const comment = String(body.comment || '').trim()
      const event = db.prepare(`SELECT h.*,r.author_id FROM help_events h JOIN requests r ON r.id=h.request_id WHERE h.id=?`).get(feedbackMatch[1])
      if (!event) return send(res, 404, { error: 'Help response not found.' })
      if (event.author_id !== user.id) return send(res, 403, { error: 'Only the person who asked for help can leave feedback.' })
      if (event.status !== 'completed') return send(res, 409, { error: 'Confirm that you received help before leaving feedback.' })
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) return send(res, 400, { error: 'Choose a rating from 1 to 5 stars.' })
      if (comment.length > 300) return send(res, 400, { error: 'Feedback must be 300 characters or fewer.' })
      if (db.prepare('SELECT id FROM feedback WHERE help_id=?').get(event.id)) return send(res, 409, { error: 'Feedback has already been submitted for this help.' })
      const points = rating * 2
      transaction(() => {
        db.prepare('INSERT INTO feedback(id,help_id,author_id,helper_id,rating,comment,points_awarded,created_at) VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(), event.id, user.id, event.helper_id, rating, comment, points, Date.now())
        db.prepare('UPDATE users SET rank_points=rank_points+? WHERE id=?').run(points, event.helper_id)
      })
      return send(res, 201, { ok: true, feedbackPoints: points, user: userSummary(event.helper_id) })
    }

    const helpMatch = url.pathname.match(/^\/api\/requests\/([^/]+)\/help$/)
    if (helpMatch && req.method === 'POST') {
      const request = db.prepare('SELECT * FROM requests WHERE id=?').get(helpMatch[1])
      if (!request) return send(res, 404, { error: 'That ask could not be found.' })
      if (request.author_id === user.id) return send(res, 409, { error: 'You cannot respond to your own ask.' })
      if (request.status !== 'open') return send(res, 409, { error: 'This ask is already complete.' })
      const body = await readBody(req)
      const offer = request.tag === 'Skill swap' ? String(body.offer || '').trim() : ''
      if (request.tag === 'Skill swap' && (!offer || offer.length > 180)) return send(res, 400, { error: 'Describe your trade in 1–180 characters.' })
      if (db.prepare('SELECT id FROM help_events WHERE request_id=? AND helper_id=?').get(request.id, user.id)) return send(res, 409, { error: 'You already responded to this ask.' })
      const eventId = randomUUID()
      db.prepare('INSERT INTO help_events(id,request_id,helper_id,status,swap_offer,created_at) VALUES(?,?,?,\'pending\',?,?)').run(eventId, request.id, user.id, offer, Date.now())
      return send(res, 201, { request: presentRequest(request, user.id) })
    }

    const requestMatch = url.pathname.match(/^\/api\/requests\/([^/]+)(?:\/complete)?$/)
    if (requestMatch && url.pathname.endsWith('/complete') && req.method === 'PATCH') {
      const request = db.prepare('SELECT * FROM requests WHERE id=?').get(requestMatch[1])
      if (!request) return send(res, 404, { error: 'That ask could not be found.' })
      const canFinishMission = request.tag === 'Tiny mission' && Boolean(db.prepare("SELECT id FROM help_events WHERE request_id=? AND helper_id=? AND status='pending'").get(request.id, user.id))
      if (request.author_id !== user.id && !canFinishMission) return send(res, 403, { error: 'Only the asker, or a buddy who claimed this mission, can mark it complete.' })
      const next = request.status === 'completed' ? 'open' : 'completed'
      db.prepare('UPDATE requests SET status=? WHERE id=?').run(next, request.id)
      return send(res, 200, { request: presentRequest(db.prepare('SELECT * FROM requests WHERE id=?').get(request.id), user.id) })
    }

    return send(res, 404, { error: 'Route not found.' })
  } catch (error) {
    console.error(error)
    return send(res, error.status || 500, { error: error.status ? error.message : 'Something went wrong on the server.' })
  }
})

server.on('error', error => {
  console.error(`Could not start Buddy Board API on port ${port}: ${error.message}`)
  process.exitCode = 1
})
server.listen(port, host, () => console.log(`Buddy Board server listening at http://${host}:${port} (SQLite)`))
