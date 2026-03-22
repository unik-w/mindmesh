/**
 * Vercel serverless function: proxies /bey-api/* → https://api.bey.dev/*
 * Keeps BEY_API_KEY server-side so it is never exposed to the browser.
 */
export const config = { runtime: 'edge' }

const TARGET = 'https://api.bey.dev'

export default async function handler(req) {
  const url = new URL(req.url)

  // Strip the /bey-api prefix to get the real path
  const upstreamPath = url.pathname.replace(/^\/api\/bey-proxy/, '') || '/'
  const upstreamUrl = `${TARGET}${upstreamPath}${url.search}`

  const headers = new Headers(req.headers)
  headers.set('host', 'api.bey.dev')

  const apiKey = process.env.BEY_API_KEY
  if (apiKey) headers.set('x-api-key', apiKey)

  // Do not forward these hop-by-hop headers
  headers.delete('connection')
  headers.delete('keep-alive')
  headers.delete('transfer-encoding')

  const upstream = await fetch(upstreamUrl, {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
    duplex: 'half',
  })

  const resHeaders = new Headers(upstream.headers)
  resHeaders.delete('transfer-encoding')
  resHeaders.set('access-control-allow-origin', '*')

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: resHeaders,
  })
}
