/**
 * CodeX API proxy — deploy this as a Cloudflare Worker (free tier is plenty).
 * It forwards requests to Anthropic's API, attaching your secret key server-side
 * so it never appears in the browser. It also adds CORS headers so your
 * GitHub Pages site is allowed to call it.
 *
 * Setup:
 *   1. npm install -g wrangler
 *   2. wrangler login
 *   3. wrangler secret put ANTHROPIC_API_KEY   (paste your key when prompted)
 *   4. wrangler deploy
 *   5. Copy the resulting *.workers.dev URL into VITE_CODEX_PROXY_URL
 */

const ALLOWED_ORIGIN = '*'; // tighten to your GitHub Pages origin once deployed,
// e.g. 'https://your-username.github.io'

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders() });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response('Invalid JSON body', { status: 400, headers: corsHeaders() });
    }

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await anthropicResponse.text();

    return new Response(data, {
      status: anthropicResponse.status,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
