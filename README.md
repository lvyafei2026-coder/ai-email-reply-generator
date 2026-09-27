# AI Email Reply Generator

A Cloudflare Worker that drafts email replies using Workers AI (Llama 3.2 3B).

## Features

- Four tone options: professional, friendly, concise, firm
- Optional context field to guide the reply
- Runs on Cloudflare Workers AI — no API keys
- Built-in rate limiting (30 requests/min per IP)
- Text is not stored or logged
- 5,000 character limit per request
- Multi-language interface (EN + ZH)

## Setup

```bash
npm install
npx wrangler login
npx wrangler deploy
```

## Routes

Add to `tool-proxy`:
- `toolara.dev/ai-email-reply-generator/*`
- `www.toolara.dev/ai-email-reply-generator/*`

## License

MIT
