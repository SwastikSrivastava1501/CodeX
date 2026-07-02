/**
 * CodeX API proxy — FREE VERSION using Cloudflare Workers AI.
 * No Anthropic billing required.
 */

const ALLOWED_ORIGIN = '*';
const MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';

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

    try {
      const aiResult = await env.AI.run(MODEL, {
        messages: body.messages,
        max_tokens: body.max_tokens || 1000,
      });

      let text = aiResult.response;
if (typeof text !== 'string') {
  text = JSON.stringify(text ?? '');
}
      return new Response(
        JSON.stringify({ content: [{ type: 'text', text }] }),
        { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    } catch (e) {
      return new Response(
        JSON.stringify({ error: { message: e.message || 'Workers AI request failed' } }),
        { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
