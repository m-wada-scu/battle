import './load-env.ts'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { POST as threadsPOST } from '../api/threads.ts'
import { POST as triggerPOST } from '../api/trigger.ts'
import { POST as watchPOST } from '../api/watch.ts'

const PORT = Number(process.env.LOCAL_API_PORT ?? 3001)

type RouteHandler = (request: Request) => Promise<Response>

const routes: Record<string, Partial<Record<string, RouteHandler>>> = {
  '/api/threads': { POST: threadsPOST },
  '/api/watch': { POST: watchPOST },
  '/api/trigger': { POST: triggerPOST },
}

async function readBody(req: IncomingMessage): Promise<Buffer | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined

  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return chunks.length > 0 ? Buffer.concat(chunks) : undefined
}

function writeResponse(res: ServerResponse, response: Response): void {
  res.statusCode = response.status
  response.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })
  void response.arrayBuffer().then((body) => {
    res.end(Buffer.from(body))
  })
}

const server = createServer((req, res) => {
  void (async () => {
    try {
      const host = req.headers.host ?? `127.0.0.1:${PORT}`
      const url = new URL(req.url ?? '/', `http://${host}`)
      const handler = routes[url.pathname]?.[req.method ?? '']

      if (!handler) {
        res.statusCode = 404
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Not found' }))
        return
      }

      const body = await readBody(req)
      const request = new Request(url, {
        method: req.method,
        headers: req.headers as HeadersInit,
        body: body ? new Uint8Array(body) : undefined,
      })

      writeResponse(res, await handler(request))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('[local-api]', message)
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ ok: false, error: message }))
    }
  })()
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Local API listening on http://127.0.0.1:${PORT}`)
})
