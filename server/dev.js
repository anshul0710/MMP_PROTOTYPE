import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const node = process.execPath
const children = []
let stopping = false

function findFreePort(port) {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(port, '127.0.0.1', () => {
      const available = probe.address().port
      probe.close(error => error ? reject(error) : resolve(available))
    })
  })
}

function stopAll() {
  if (stopping) return
  stopping = true
  for (const child of children) if (!child.killed) child.kill()
}

let apiPort
try {
  apiPort = await findFreePort(4000)
} catch (error) {
  if (error.code !== 'EADDRINUSE') throw error
  apiPort = await findFreePort(0)
  console.log(`Port 4000 was busy; Buddy Board API will use port ${apiPort}.`)
}

const env = { ...process.env, API_PORT: String(apiPort) }
children.push(
  spawn(node, ['server/index.js'], { cwd: root, stdio: 'inherit', env }),
  spawn(node, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1'], { cwd: root, stdio: 'inherit', env }),
)

for (const child of children) child.on('exit', code => {
  if (code && code !== 0) process.exitCode = code
  stopAll()
})
process.on('SIGINT', stopAll)
process.on('SIGTERM', stopAll)
