export interface Env {
  RESEND_API_KEY: string
  ALLOWED_ORIGINS: string
  CONTACT_TO_EMAIL: string
  CONTACT_FROM_EMAIL: string
  RL: KVNamespace
}

const MAX_NAME = 200
const MAX_EMAIL = 320
const MAX_PHONE = 40
const MAX_MESSAGE = 5000
const RATE_LIMIT_PER_HOUR = 10

function corsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  }
}

function json(status: number, body: unknown, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    const reqOrigin = request.headers.get('Origin') ?? ''
    const origin = allowed.includes(reqOrigin) ? reqOrigin : allowed[0]

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }
    if (request.method !== 'POST') {
      return json(405, { ok: false, error: 'method_not_allowed' }, origin)
    }
    if (!allowed.includes(reqOrigin)) {
      return json(403, { ok: false, error: 'forbidden_origin' }, origin)
    }

    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
    const key = `rl:${ip}`
    const count = parseInt((await env.RL.get(key)) ?? '0', 10)
    if (count >= RATE_LIMIT_PER_HOUR) {
      return json(429, { ok: false, error: 'rate_limited' }, origin)
    }
    await env.RL.put(key, String(count + 1), { expirationTtl: 3600 })

    let body: {
      name?: string
      email?: string
      phone?: string
      message?: string
      hp?: string
    }
    try {
      body = await request.json()
    } catch {
      return json(400, { ok: false, error: 'invalid_json' }, origin)
    }

    if (body.hp) {
      return json(200, { ok: true }, origin)
    }

    const name = (body.name ?? '').trim()
    const email = (body.email ?? '').trim()
    const phone = (body.phone ?? '').trim()
    const message = (body.message ?? '').trim()

    if (!name || name.length > MAX_NAME) {
      return json(400, { ok: false, error: 'invalid_name' }, origin)
    }
    if (!email || email.length > MAX_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(400, { ok: false, error: 'invalid_email' }, origin)
    }
    if (phone.length > MAX_PHONE) {
      return json(400, { ok: false, error: 'invalid_phone' }, origin)
    }
    if (!message || message.length > MAX_MESSAGE) {
      return json(400, { ok: false, error: 'invalid_message' }, origin)
    }

    const lines = [`Od: ${name} <${email}>`]
    if (phone) lines.push(`Telefon: ${phone}`)
    lines.push('', message)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM_EMAIL,
        to: env.CONTACT_TO_EMAIL,
        reply_to: email,
        subject: `Web kontakt: ${name}`,
        text: lines.join('\n'),
      }),
    })

    if (!res.ok) {
      return json(502, { ok: false, error: 'email_send_failed' }, origin)
    }
    return json(200, { ok: true }, origin)
  },
}
