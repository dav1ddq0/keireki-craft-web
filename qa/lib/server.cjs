// Starts the app for a browser check: the Vite dev server (`dev`, serves /src modules the PDF checks
// import) or `vite preview` of the build (`preview`, the production bundle with its CSP).
const { spawn } = require('node:child_process')
const net = require('node:net')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '../..')
const BASE_PATH = '/'

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.unref()
    srv.on('error', reject)
    srv.listen(0, () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
  })
}

async function waitFor(url, timeoutMs) {
  const start = Date.now()
  for (;;) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {}
    if (Date.now() - start > timeoutMs) throw new Error(`Server did not answer at ${url}`)
    await new Promise((r) => setTimeout(r, 250))
  }
}

/** Starts `mode` ('dev' | 'preview') and resolves to { url, stop }. */
async function startServer(mode) {
  const port = await freePort()
  const args = mode === 'dev' ? ['--port', String(port), '--strictPort'] : ['preview', '--port', String(port), '--strictPort']
  const child = spawn(path.join(ROOT, 'node_modules/.bin/vite'), args, { cwd: ROOT, stdio: 'ignore' })
  const url = `http://localhost:${port}${BASE_PATH}`
  try {
    await waitFor(url, 60_000)
  } catch (error) {
    child.kill()
    throw error
  }
  return { url, stop: () => child.kill() }
}

module.exports = { ROOT, startServer }
