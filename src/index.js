export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.includes('/api/') && request.method === 'POST') {
      return handleApi(request, env, url);
    }

    return env.ASSETS.fetch(request);
  }
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

async function handleApi(request, env, url) {
  const path = url.pathname.replace(/\/$/, '');

  if (!path.endsWith('/api/generate-reply')) {
    return json({ error: 'Not found' }, 404);
  }

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const { success } = await env.AI_RATE_LIMITER.limit({ key: 'email-reply:' + ip });

  if (!success) {
    return json({
      error: 'Too many requests. Please wait a minute and try again.',
      code: 'RATE_LIMITED'
    }, 429);
  }

  return handleGenerate(request, env);
}

const TONE_PROMPTS = {
  professional: 'Write a professional, polite, and clear reply. Use a neutral business tone. Address every question or request in the original email.',
  friendly: 'Write a warm, friendly, conversational reply. Sound like a helpful colleague. Use contractions and natural language.',
  concise: 'Write a very short, direct reply. No filler, no pleasantries beyond a brief greeting. Get straight to the point.',
  firm: 'Write a firm, professional reply that politely but clearly holds a boundary. Be respectful but unambiguous about what you will or will not do.'
};

async function handleGenerate(request, env) {
  try {
    const body = await request.json();
    const email = (body.email || '').trim();
    const tone = body.tone || 'professional';
    const context = (body.context || '').trim();

    if (email.length < 20) {
      return json({ error: 'Email content is too short.' }, 400);
    }

    const MAX_CHARS = 5000;
    const input = email.length > MAX_CHARS ? email.slice(0, MAX_CHARS) : email;

    const systemPrompt = 'You are an experienced professional who writes clear, effective email replies. You output ONLY the reply text, with no preamble, no explanations, and no subject line. Start directly with the greeting.';

    let userPrompt = (TONE_PROMPTS[tone] || TONE_PROMPTS.professional) + '\n\n';

    if (context) {
      userPrompt += 'Additional context you should incorporate:\n' + context.slice(0, 500) + '\n\n';
    }

    userPrompt += 'Original email to reply to:\n' + input + '\n\nWrite the reply now.';

    const response = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 900,
      temperature: 0.6
    });

    const output = (response.response || '').trim();

    if (!output) {
      return json({ error: 'Model returned empty output. Please try again.' }, 500);
    }

    return json({ output: output });
  } catch (err) {
    console.error('Generate error:', err);
    return json({ error: 'Processing failed. Please try again in a moment.' }, 500);
  }
}
