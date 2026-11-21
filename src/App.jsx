import { useCallback, useEffect, useState } from 'react'
import { ArrowUpRight, Check, Clock3, Heart, LogOut, MapPin, Plus, Search, Send, Sparkles, Star, Trophy, X, Zap } from 'lucide-react'
import './App.css'
import './Backend.css'

const categories = ['Borrow', 'Company', 'Skill swap', 'Tiny mission', 'Offer a hand']
const filters = ['Everything', ...categories]
const prompts = ['Could someone…', 'I can trade…', 'Come with me…', 'Tiny mission…']

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('register')
  const [form, setForm] = useState({ fullName: '', email: '', studentId: '', branch: '', year: '1', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Could not sign in.')
      onAuthenticated(result)
    } catch (submitError) { setError(submitError.message) }
    finally { setBusy(false) }
  }
  return <div className="auth-page"><div className="auth-art"><span className="auth-flower">✳</span><div className="eyebrow">INDIAN INSTITUTE OF INFORMATION TECHNOLOGY KOTA</div><h1>Campus is better<br/>with a <em>buddy.</em></h1><p>Little asks, tiny missions and skill swaps make this campus feel a little more like home.</p><div className="auth-sticker">🌱 <span>Good things grow<br/>when we show up.</span></div></div><form className="auth-card" onSubmit={submit}><div className="brand auth-brand"><span className="brand-icon">✳</span><span>buddy<span className="brand-dot">.</span>board</span></div><div className="auth-tabs"><button type="button" className={mode === 'register' ? 'selected' : ''} onClick={() => { setMode('register'); setError('') }}>Create account</button><button type="button" className={mode === 'login' ? 'selected' : ''} onClick={() => { setMode('login'); setError('') }}>Sign in</button></div><h2>{mode === 'register' ? 'Join your campus community' : 'Welcome back, buddy'}</h2><p className="auth-subtitle">{mode === 'register' ? 'A few basics, then you’re in.' : 'Sign in to pick up where you left off.'}</p>{mode === 'register' && <><label>Full name<input name="fullName" required minLength="2" maxLength="60" value={form.fullName} onChange={change} placeholder="Your name" autoComplete="name"/></label><div className="auth-row"><label>Student ID<input name="studentId" required minLength="3" maxLength="30" value={form.studentId} onChange={change} placeholder="e.g. 2026UG..." autoComplete="off"/></label><label>Year<select name="year" value={form.year} onChange={change}><option value="1">1st year</option><option value="2">2nd year</option><option value="3">3rd year</option><option value="4">4th year</option><option value="5">5th year</option><option value="6">Other</option></select></label></div><label>Branch / program<input name="branch" required maxLength="80" value={form.branch} onChange={change} placeholder="e.g. Computer Science"/></label></>}<label>Email<input name="email" type="email" required value={form.email} onChange={change} placeholder="you@example.com" autoComplete="email"/></label><label>Password<input name="password" type="password" required minLength="8" maxLength="128" value={form.password} onChange={change} placeholder="At least 8 characters" autoComplete={mode === 'register' ? 'new-password' : 'current-password'}/></label>{error && <div className="auth-error">{error}</div>}<button className="primary-btn auth-submit" type="submit" disabled={busy}>{busy ? 'One moment…' : mode === 'register' ? 'Create my account' : 'Sign in to Buddy Board'} <ArrowUpRight size={16}/></button><small className="auth-note">Accounts are stored securely on this project’s local server.</small></form></div>
}

function RequestCard({ post, busyId, highlighted, onHelp, onComplete, onConfirmHelp, onFeedback, onAcceptSwap }) {
  const canFinishMission = post.tag === 'Tiny mission' && post.helpedByMe
  const matched = post.swapOffers?.some(offer => offer.status === 'accepted')
  return <article id={`ask-${post.id}`} className={`request-card ${post.color} ${post.status === 'completed' ? 'request-completed' : ''} ${highlighted ? 'request-highlight' : ''}`}>
    <div className="card-top"><span className="card-type"><span>{post.icon}</span>{post.tag}</span><span className="time-stamp"><Clock3 size={12}/>{post.time}</span></div>
    <h3>{post.title}</h3><p className="card-detail">{post.detail}</p>
    {post.tag === 'Skill swap' && post.swapDetails && <div className="swap-details"><b>Trade proposal</b><span>{post.swapDetails}</span></div>}
    <div className="request-meta"><span><MapPin size={13}/>{post.place}</span><span><Zap size={13}/>{post.need}</span></div>
    <div className="card-bottom"><div className="requester"><span className="avatar">{post.initials}</span><span><b>{post.person}</b><small>{post.status === 'completed' ? 'ask completed' : 'needs a buddy'}</small></span></div>
      {post.isMine || canFinishMission ? <button className={`help-btn ${post.status === 'completed' ? 'helped' : ''}`} disabled={busyId === post.id} onClick={() => onComplete(post)}>{post.status === 'completed' ? <><Check size={14}/> Reopen</> : <><Check size={14}/>{canFinishMission ? 'Mark mission done' : 'Mark complete'}</>}</button>
        : post.status === 'completed' ? <span className="complete-badge"><Check size={14}/> Complete</span>
          : <button className={`help-btn ${post.helpedByMe ? 'helped' : ''}`} disabled={post.helpedByMe || busyId === post.id} onClick={() => onHelp(post)}>{post.helpedByMe ? <><Check size={14}/>{post.tag === 'Skill swap' ? post.mySwapOfferStatus === 'accepted' ? 'Matched!' : 'Offer sent' : post.myHelpStatus === 'completed' ? 'Help confirmed' : 'You’re in'}</> : post.tag === 'Skill swap' ? <><Heart size={14}/> Propose a swap</> : post.tag === 'Tiny mission' ? <><Zap size={14}/> Take mission</> : <><Heart size={14}/> I can help</>}</button>}
    </div>
    <div className="helpers"><span className="helper-faces">{post.helped ? '🧑🏽‍🎓 👩🏻‍🎓' : '✨'}</span><span>{post.helped ? `${post.helped} buddies already leaning in` : 'Be the first to make this happen'}</span></div>
    {post.myFeedback && <div className="my-help-feedback"><Star size={13} fill="currentColor"/><b>{post.myFeedback.rating}/5</b><span>Requester feedback · +{post.myFeedback.pointsAwarded} points</span>{post.myFeedback.comment && <q>{post.myFeedback.comment}</q>}</div>}
    {post.isMine && post.helpers?.length > 0 && <div className="help-inbox"><b>Buddy responses ({post.helpers.length})</b>{post.helpers.map(helper => <div className="help-response" key={helper.id}><div className="help-response-copy"><strong>{helper.name}</strong>{helper.offer && <p>Swap offer: “{helper.offer}”</p>}{helper.status === 'pending' && <small>Waiting for you to confirm the help.</small>}{helper.status === 'accepted' && <small>Swap accepted · confirm when you’ve received help.</small>}{helper.status === 'completed' && helper.hasFeedback && <small className="feedback-received">{helper.rating}/5 · {helper.pointsAwarded} feedback points awarded{helper.comment ? ` · “${helper.comment}”` : ''}</small>}</div><div className="help-response-actions">{helper.status === 'pending' || helper.status === 'accepted' ? <button className="help-btn" disabled={busyId === helper.id} onClick={() => onConfirmHelp(helper)}>Confirm help · +10 pts</button> : helper.status === 'completed' && !helper.hasFeedback ? <button className="help-btn" onClick={() => onFeedback(helper)}>Give feedback</button> : helper.hasFeedback ? <span className="complete-badge"><Check size={13}/> Rated</span> : null}</div></div>)}</div>}
    {post.isMine && post.tag === 'Skill swap' && post.swapOffers?.length > 0 && <div className="swap-inbox"><b>Swap offers</b>{post.swapOffers.map(offer => <div className="swap-offer" key={offer.id}><div><strong>{offer.senderName}</strong><p>“{offer.offer}”</p></div>{offer.status === 'accepted' ? <span className="complete-badge"><Check size={13}/> Matched</span> : matched ? <span className="complete-badge">Already matched</span> : <button className="help-btn" disabled={busyId === offer.id} onClick={() => onAcceptSwap(post, offer)}>Accept buddy</button>}</div>)}</div>}
  </article>
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('buddy-board-token') || '')
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(Boolean(localStorage.getItem('buddy-board-token')))
  const [posts, setPosts] = useState([])
  const [leaders, setLeaders] = useState([])
  const [helpHistory, setHelpHistory] = useState([])
  const [stats, setStats] = useState({ openRequests: 0, helpersShowingUp: 0, completedRequests: 0 })
  const [filter, setFilter] = useState('Everything')
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState(false)
  const [kind, setKind] = useState('Borrow')
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [swapDetails, setSwapDetails] = useState('')
  const [place, setPlace] = useState('')
  const [need, setNeed] = useState('')
  const [toast, setToast] = useState('')
  const [tab, setTab] = useState('Ask & offer')
  const [showCompleted, setShowCompleted] = useState(false)
  const [swapModalPost, setSwapModalPost] = useState(null)
  const [swapOffer, setSwapOffer] = useState('')
  const [highlightedId, setHighlightedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [feedbackTarget, setFeedbackTarget] = useState(null)
  const [feedbackRating, setFeedbackRating] = useState(5)
  const [feedbackComment, setFeedbackComment] = useState('')
  const userName = user?.fullName || ''
  const userId = user?.id || ''

  const acceptSession = session => {
    localStorage.setItem('buddy-board-token', session.token)
    setToken(session.token); setUser(session.user); setAuthLoading(false); setError('')
  }

  useEffect(() => {
    if (!token) { setAuthLoading(false); return }
    fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(async response => { const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || 'Please sign in again.'); setUser(result.user) })
      .catch(() => { localStorage.removeItem('buddy-board-token'); setToken(''); setUser(null) })
      .finally(() => setAuthLoading(false))
  }, [token])

  const api = useCallback(async (path, options = {}) => {
    const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.error || 'The server could not complete that action.')
    return body
  }, [token])

  const reload = useCallback(async (signal, quiet = false) => {
    if (!token || !userId) { setLoading(false); return }
    if (!quiet) { setLoading(true); setError('') }
    const params = new URLSearchParams()
    const category = tab === 'Kindness map' ? 'Tiny mission' : tab === 'Swap buddies' ? 'Skill swap' : filter
    if (category !== 'Everything') params.set('category', category)
    if (query.trim()) params.set('q', query.trim())
    params.set('status', showCompleted ? 'completed' : 'open')
    if (tab === 'My ripple') params.set('mine', 'true')
    try {
      const [requestData, statsData, profileData] = await Promise.all([api(`/api/requests?${params}`, { signal }), api('/api/stats', { signal }), api('/api/me', { signal })])
      setPosts(requestData.requests); setStats(statsData); setUser(profileData.user)
      if (tab === 'My ripple') {
        const [rankingData, historyData] = await Promise.all([api('/api/leaderboard', { signal }), api('/api/me/helps', { signal })])
        setLeaders(rankingData.leaders); setHelpHistory(historyData.helps)
      }
    } catch (loadError) {
      if (loadError.name !== 'AbortError') setError(loadError.message)
    } finally { if (!signal?.aborted && !quiet) setLoading(false) }
  }, [api, filter, query, showCompleted, tab, token, userId])

  useEffect(() => {
    if (!userId) { setLoading(false); return undefined }
    const controller = new AbortController()
    const timer = window.setTimeout(() => reload(controller.signal), 160)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [reload, userId])

  useEffect(() => {
    if (!userId) return undefined
    const timer = window.setInterval(() => reload(undefined, true), 15000)
    return () => window.clearInterval(timer)
  }, [reload, userId])

  const announce = message => { setToast(message); window.setTimeout(() => setToast(''), 3000) }

  const publish = async event => {
    event.preventDefault(); if (!title.trim()) return
    setBusyId('new')
    try {
      await api('/api/requests', { method: 'POST', body: JSON.stringify({ title, detail, swapDetails, tag: kind, place, need }) })
      setTitle(''); setDetail(''); setSwapDetails(''); setPlace(''); setNeed(''); setModal(false)
      setTab('Ask & offer'); setFilter('Everything'); setShowCompleted(false)
      announce('Your little ask is out in the world 🌼')
    } catch (actionError) { setError(actionError.message) }
    finally { setBusyId(null) }
  }

  const join = async post => {
    if (post.helpedByMe || busyId) return
    if (post.tag === 'Skill swap') { setSwapModalPost(post); setSwapOffer(''); return }
    setBusyId(post.id)
    try { await api(`/api/requests/${post.id}/help`, { method: 'POST' }); await reload(); announce('You’re in! A little kindness is on its way ✨') }
    catch (actionError) { setError(actionError.message) }
    finally { setBusyId(null) }
  }

  const submitSwapOffer = async event => {
    event.preventDefault(); if (!swapModalPost || !swapOffer.trim()) return
    setBusyId(swapModalPost.id)
    try {
      await api(`/api/requests/${swapModalPost.id}/help`, { method: 'POST', body: JSON.stringify({ offer: swapOffer }) })
      setSwapModalPost(null); setSwapOffer(''); await reload(); announce('Swap offer sent! They can find it in My ripple 🔄')
    } catch (actionError) { setError(actionError.message) }
    finally { setBusyId(null) }
  }

  const acceptSwapOffer = async (post, offer) => {
    setBusyId(offer.id)
    try { await api(`/api/requests/${post.id}/offers/${offer.id}`, { method: 'PATCH' }); await reload(); announce(`You and ${offer.senderName} are swap buddies! ✨`) }
    catch (actionError) { setError(actionError.message) }
    finally { setBusyId(null) }
  }

  const completeRequest = async post => {
    setBusyId(post.id)
    try { await api(`/api/requests/${post.id}/complete`, { method: 'PATCH' }); await reload(); announce(post.status === 'completed' ? 'Ask reopened on the board.' : 'Lovely! Your ask is marked complete 💛') }
    catch (actionError) { setError(actionError.message) }
    finally { setBusyId(null) }
  }

  const confirmHelp = async helper => {
    setBusyId(helper.id)
    try { const result = await api(`/api/helps/${helper.id}/complete`, { method: 'POST' }); await reload(); announce(`Help confirmed! Your buddy earned ${result.pointsAwarded} points 🌟`) }
    catch (actionError) { setError(actionError.message) }
    finally { setBusyId(null) }
  }

  const giveFeedback = async event => {
    event.preventDefault(); if (!feedbackTarget) return
    setBusyId(feedbackTarget.id)
    try {
      const result = await api(`/api/helps/${feedbackTarget.id}/feedback`, { method: 'POST', body: JSON.stringify({ rating: feedbackRating, comment: feedbackComment }) })
      setFeedbackTarget(null); setFeedbackComment(''); setFeedbackRating(5); await reload()
      announce(`Feedback sent! Your buddy earned ${result.feedbackPoints} rank points 💛`)
    } catch (actionError) { setError(actionError.message) }
    finally { setBusyId(null) }
  }

  const logout = async () => {
    try { await api('/api/auth/logout', { method: 'POST' }) } catch { /* The session may already have expired. */ }
    localStorage.removeItem('buddy-board-token'); setToken(''); setUser(null); setPosts([]); setLeaders([]); setHelpHistory([])
  }

  const changeTab = nextTab => {
    setTab(nextTab)
    if (nextTab === 'Kindness map') { setFilter('Tiny mission'); setShowCompleted(false) }
    if (nextTab === 'Swap buddies') { setFilter('Skill swap'); setShowCompleted(false) }
    if (nextTab === 'Ask & offer' || nextTab === 'My ripple') { setFilter('Everything'); setShowCompleted(false) }
  }

  const surprise = () => {
    const choices = posts.filter(post => post.status === 'open')
    if (!choices.length) { announce('No open asks to surprise you with right now.'); return }
    const pick = choices[Math.floor(Math.random() * choices.length)]
    setHighlightedId(pick.id)
    window.setTimeout(() => document.getElementById(`ask-${pick.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
    window.setTimeout(() => setHighlightedId(null), 3200)
    announce(`Your kindness quest: ${pick.title} 🎲`)
  }

  if (authLoading) return <div className="auth-loading">Getting your Buddy Board ready…</div>
  if (!user) return <AuthScreen onAuthenticated={acceptSession}/>

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#top"><span className="brand-icon">✳</span><span>buddy<span className="brand-dot">.</span>board</span></a><nav><button className={tab === 'Ask & offer' ? 'nav-active' : ''} onClick={() => changeTab('Ask & offer')}>The board</button><button className={tab === 'Kindness map' ? 'nav-active' : ''} onClick={() => changeTab('Kindness map')}>Tiny missions</button><button className={tab === 'Swap buddies' ? 'nav-active' : ''} onClick={() => changeTab('Swap buddies')}>Swap buddies</button><button className={tab === 'My ripple' ? 'nav-active' : ''} onClick={() => changeTab('My ripple')}>My ripple</button></nav><div className="top-right"><span className="campus-pill" title="Indian Institute of Information Technology Kota"><span className="online-dot"/><span className="campus-full">Indian Institute of Information Technology Kota</span><span className="campus-short">IIIT Kota</span></span><button className="avatar top-avatar" title={`${user.fullName} · sign out`} onClick={logout}>{user.fullName[0]?.toUpperCase() || 'S'}</button></div></header>
    <main id="top">
      <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-spark">✦</span> SMALL FAVORS. BIGGER FEELING.</div><h1>Campus is better<br/>with a <em>buddy.</em></h1><p className="hero-sub">Need a hand? Have one to spare? The little things are easier when we do them together.</p><div className="hero-actions"><button className="primary-btn" onClick={() => { setKind('Borrow'); setModal(true) }}><Plus size={17}/> Put a little ask out</button><button className="text-link" onClick={() => { changeTab('Ask & offer'); document.getElementById('board').scrollIntoView({ behavior: 'smooth' }) }}>Find your next good deed <ArrowUpRight size={15}/></button></div><div className="social-proof"><div className="mini-faces"><span>🧑🏽‍🎓</span><span>👩🏻‍🎓</span><span>🧑🏿‍🎓</span><span>👩🏽‍🎓</span></div><span><b>{stats.completedRequests} little wins</b> completed on campus</span></div></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-blob"><span className="blob-spark s1">✦</span><span className="blob-spark s2">✳</span><span className="blob-spark s3">♡</span><div className="buddy-faces"><span className="face face-a">😊</span><span className="face face-b">😄</span><span className="face face-c">🙂</span></div><div className="floating-note"><span>✦</span> You make this place warmer</div></div><div className="orbit-label label-a">kindness, in orbit</div><div className="orbit-label label-b">✳ give a little</div></div></section>
      <section className="stats-strip"><div className="stat"><span className="stat-emoji">🌱</span><div><strong>{stats.openRequests}</strong><small>asks waiting for buddies</small></div></div><div className="stat-divider"/><div className="stat"><span className="stat-emoji">🤝</span><div><strong>{stats.helpersShowingUp}</strong><small>buddies showing up</small></div></div><div className="stat-divider"/><div className="stat"><span className="stat-emoji">✨</span><div><strong>{stats.completedRequests}</strong><small>asks completed</small></div></div><div className="kindness-quote">“Alone we can do so little; together we can do so much.” <span>— Helen Keller</span></div></section>
      {tab === 'My ripple' && user && <section className="profile-grid"><div className="rank-panel"><span className="rank-medal"><Trophy size={22}/></span><div><div className="eyebrow">YOUR KINDNESS RANK</div><h2>{user.rank}</h2><p><b>{user.rankPoints} points</b> · {user.helpedCount} times helped · {user.asksCount} asks posted</p>{user.nextRankAt && <div className="rank-progress"><span style={{ width: `${Math.min(100, Math.round(user.rankPoints / user.nextRankAt * 100))}%` }}/></div>}<small>{user.nextRankAt ? `${user.nextRankAt - user.rankPoints} points to your next rank` : 'You’ve reached the top rank!'}</small></div></div><div className="leader-panel"><div className="eyebrow">CAMPUS KINDNESS LEADERS</div>{leaders.length ? leaders.slice(0, 5).map(leader => <div className="leader-row" key={leader.id}><span>{leader.position <= 3 ? ['🥇', '🥈', '🥉'][leader.position - 1] : leader.position}</span><b>{leader.name}</b><small>{leader.rankPoints} pts</small></div>) : <p className="leader-empty">The leaderboard will grow as buddies help each other.</p>}</div><div className="activity-panel"><div className="eyebrow">YOUR HELP HISTORY</div>{helpHistory.length ? helpHistory.map(help => <div className="activity-row" key={help.id}><b>{help.title}</b><span>{help.status === 'completed' ? `Help confirmed · +${help.basePoints} points` : help.status === 'accepted' ? 'Swap accepted · waiting to help' : 'Waiting for the asker to confirm'}</span>{help.rating && <small>{'★'.repeat(help.rating)} · “{help.comment || 'Thanks for helping!'}” · +{help.feedbackPoints} feedback points</small>}</div>) : <p className="leader-empty">Your completed helps and feedback will show up here.</p>}</div></section>}
      <section className="main-content" id="board"><div className="board-heading"><div><div className="eyebrow">{tab === 'My ripple' ? 'YOUR LITTLE RIPPLE' : tab === 'Kindness map' ? 'TINY MISSIONS AROUND CAMPUS' : tab === 'Swap buddies' ? 'TRADE A SKILL. FIND YOUR PEOPLE.' : 'THE CAMPUS NOTICEBOARD, BUT NICER'}</div><h2>{tab === 'My ripple' ? <>Your asks. <em>Your ripple.</em></> : tab === 'Swap buddies' ? <>Find your <em>swap buddy.</em></> : tab === 'Kindness map' ? <>Little missions. <em>Right here.</em></> : <>A little ask. <em>A little offer.</em></>}</h2><p>{tab === 'My ripple' ? 'Keep track of your asks and the buddies who answered.' : tab === 'Swap buddies' ? 'Offer a skill, meet someone who has the one you need.' : tab === 'Kindness map' ? 'Pick a tiny campus quest, claim it, and mark it done.' : 'Real people, small moments, zero awkward group chats.'}</p></div><div className="board-heading-actions">{tab === 'My ripple' && <button className="secondary-btn" onClick={() => setShowCompleted(!showCompleted)}>{showCompleted ? 'Show my open asks' : 'Show completed'}</button>}<button className="secondary-btn" onClick={() => { setKind(tab === 'Swap buddies' ? 'Skill swap' : 'Offer a hand'); setModal(true) }}><Heart size={16}/>{tab === 'Swap buddies' ? 'Post a skill to trade' : 'I have a hand to lend'}</button></div></div>
        {tab !== 'My ripple' && <div className="feature-row"><button className="feature-card feature-quest" onClick={() => changeTab('Kindness map')}><span className="feature-icon">🧭</span><div><b>Take a tiny mission</b><small>Quick quests, instant good karma</small></div><ArrowUpRight size={16}/></button><button className="feature-card feature-swap" onClick={() => changeTab('Swap buddies')}><span className="feature-icon">🔄</span><div><b>Find a swap buddy</b><small>Trade your superpower with theirs</small></div><ArrowUpRight size={16}/></button><button className="feature-card feature-spark" onClick={surprise}><span className="feature-icon">🎲</span><div><b>Surprise me</b><small>Jump into a random live ask</small></div><Sparkles size={16}/></button></div>}
        {tab === 'Ask & offer' && <div className="board-tools"><div className="filter-pills">{filters.map(item => <button key={item} onClick={() => setFilter(item)} className={filter === item ? 'filter-active' : ''}>{item === 'Borrow' ? '📦 ' : item === 'Company' ? '☕ ' : item === 'Skill swap' ? '🔄 ' : item === 'Tiny mission' ? '✨ ' : item === 'Offer a hand' ? '🙌 ' : ''}{item}</button>)}</div><label className="search-box"><Search size={15}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search little asks…"/></label></div>}
        {error && <div className="api-error"><span>{error}</span><button onClick={() => reload()}>Try again</button></div>}
        {loading ? <div className="empty-state"><span>⏳</span><b>Gathering the little asks…</b></div> : <div className="request-grid">{posts.map(post => <RequestCard key={post.id} post={post} busyId={busyId} highlighted={highlightedId === post.id} onHelp={join} onComplete={completeRequest} onConfirmHelp={confirmHelp} onFeedback={helper => { setFeedbackTarget(helper); setFeedbackRating(5); setFeedbackComment('') }} onAcceptSwap={acceptSwapOffer}/ >)}{posts.length === 0 && <div className="empty-state"><span>🪺</span><b>{tab === 'My ripple' ? showCompleted ? 'No completed asks yet.' : 'Your board is waiting for its first ask.' : tab === 'Swap buddies' ? 'No swap posts yet.' : 'No asks here yet.'}</b><p>{tab === 'My ripple' ? 'Put a little ask out and it will show up here.' : tab === 'Swap buddies' ? 'Start a skill swap and find someone with a superpower to trade.' : 'Be the first buddy to start a little ripple.'}</p><button className="primary-btn" onClick={() => { setKind(tab === 'Swap buddies' ? 'Skill swap' : 'Borrow'); setModal(true) }}><Plus size={16}/> {tab === 'Swap buddies' ? 'Post a skill swap' : 'Start one'}</button></div>}</div>}
      </section>
      <section className="bottom-banner"><div className="banner-doodle">✳</div><div><div className="eyebrow">YOUR KINDNESS HAS A KINDA THING</div><h2>Every little yes makes a <em>ripple.</em></h2><p>One borrowed pen. One shared lunch. One less person figuring it out alone.</p></div><button className="primary-btn" onClick={() => { setKind('Borrow'); setModal(true) }}>Make a ripple <ArrowUpRight size={16}/></button></section>
      <footer><a className="brand footer-brand" href="#top"><span className="brand-icon">✳</span><span>buddy<span className="brand-dot">.</span>board</span></a><span>Made for the moments that make a campus feel like a community.</span><span className="footer-right">A little kindness goes a long way <Heart size={13}/></span><button className="footer-signout" onClick={logout}><LogOut size={13}/> Sign out</button></footer>
    </main>
    {modal && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busyId) setModal(false) }}><form className="ask-modal" onSubmit={publish}><button type="button" className="close-btn" onClick={() => setModal(false)} aria-label="Close"><X size={18}/></button><div className="modal-kicker"><span>✦</span> PUT A LITTLE SOMETHING OUT THERE</div><h2>What’s your <em>little ask?</em></h2><p className="posting-as">Posting as <b>{user.fullName}</b> · {user.branch}</p><p className="modal-intro">Asking is a kind of courage. Keep it small, keep it human.</p><label className="field-label">Choose your vibe</label><div className="kind-options">{categories.map((category, index) => <button type="button" className={kind === category ? 'kind-selected' : ''} key={category} onClick={() => setKind(category)}>{['📦', '☕', '🔄', '✨', '🙌'][index]} {category}</button>)}</div><label className="field-label" htmlFor="ask-title">Give it a friendly headline</label><input id="ask-title" maxLength="70" required value={title} onChange={event => setTitle(event.target.value)} placeholder={kind === 'Company' ? 'Lunch is better with company…' : kind === 'Skill swap' ? 'Trade my ___ for your ___…' : 'Could someone lend me a hand with…'}/>{kind === 'Skill swap' && <><label className="field-label" htmlFor="swap-details">What can you offer, and what do you want to learn?</label><textarea id="swap-details" rows="2" maxLength="180" required value={swapDetails} onChange={event => setSwapDetails(event.target.value)} placeholder="I can help with Python; hoping to learn Figma basics."/></>}<label className="field-label" htmlFor="ask-detail">Add the little details <span>optional</span></label><textarea id="ask-detail" rows="3" maxLength="220" value={detail} onChange={event => setDetail(event.target.value)} placeholder="What would make this easier for you?"/><div className="form-row"><label className="field-group"><span className="field-label">Where on campus?</span><input maxLength="80" value={place} onChange={event => setPlace(event.target.value)} placeholder="e.g. Main canteen"/></label><label className="field-group"><span className="field-label">When / how long?</span><input maxLength="50" value={need} onChange={event => setNeed(event.target.value)} placeholder="e.g. Today, 1:15 pm"/></label></div><div className="prompt-strip"><Sparkles size={15}/><span>Try starting with:</span>{prompts.slice(0, 3).map(prompt => <button type="button" key={prompt} onClick={() => setTitle(prompt)}>{prompt}</button>)}</div><div className="privacy-note"><Heart size={14}/> Kindness rules: no judgement, no pressure, just people helping people.</div><button className="primary-btn submit-btn" type="submit" disabled={busyId === 'new'}><Send size={15}/> {busyId === 'new' ? 'Putting it on the board…' : 'Put it on the board'}</button></form></div>}
    {swapModalPost && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busyId) setSwapModalPost(null) }}><form className="ask-modal" onSubmit={submitSwapOffer}><button type="button" className="close-btn" onClick={() => setSwapModalPost(null)} aria-label="Close"><X size={18}/></button><div className="modal-kicker"><span>🔄</span> START A SKILL SWAP</div><h2>Offer your <em>superpower.</em></h2><p className="modal-intro"><b>{swapModalPost.title}</b><br/>{swapModalPost.swapDetails || swapModalPost.detail}</p><label className="field-label" htmlFor="swap-offer">What can you trade or teach?</label><textarea id="swap-offer" rows="3" required maxLength="180" value={swapOffer} onChange={event => setSwapOffer(event.target.value)} placeholder="I can help with… and would love to learn…"/><div className="privacy-note"><Heart size={14}/> Your offer goes to the person who posted this swap.</div><button className="primary-btn submit-btn" type="submit" disabled={Boolean(busyId)}><Send size={15}/>{busyId ? 'Sending offer…' : 'Send swap offer'}</button></form></div>}
    {feedbackTarget && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busyId) setFeedbackTarget(null) }}><form className="ask-modal feedback-modal" onSubmit={giveFeedback}><button type="button" className="close-btn" onClick={() => setFeedbackTarget(null)} aria-label="Close"><X size={18}/></button><div className="modal-kicker"><span>💛</span> CLOSE THE KINDNESS LOOP</div><h2>How was <em>{feedbackTarget.name}’s help?</em></h2><p className="modal-intro">Your feedback rewards helpful buddies and builds their campus rank.</p><div className="rating-picker" role="radiogroup" aria-label="Rating">{[1, 2, 3, 4, 5].map(value => <button key={value} type="button" className={value <= feedbackRating ? 'star-selected' : ''} onClick={() => setFeedbackRating(value)} aria-label={`${value} star${value === 1 ? '' : 's'}`}><Star size={30} fill={value <= feedbackRating ? 'currentColor' : 'none'}/></button>)}</div><p className="points-preview">This rating gives {feedbackRating * 2} bonus rank points</p><label className="field-label" htmlFor="feedback-comment">Leave a little note <span>optional</span></label><textarea id="feedback-comment" rows="3" maxLength="300" value={feedbackComment} onChange={event => setFeedbackComment(event.target.value)} placeholder="What did this buddy do that helped?"/><button className="primary-btn submit-btn" type="submit" disabled={Boolean(busyId)}><Send size={15}/>{busyId ? 'Sending feedback…' : 'Send feedback'}</button></form></div>}
    {toast && <div className="toast"><Sparkles size={16}/>{toast}</div>}
  </div>
}

export default App
