// Proxy do assistente (Cloudflare Workers). Guarda a chave da IA como segredo,
// monta o prompt e devolve { resposta, acao, na_base } ou { erro: CODIGO }.
// Não grava perguntas nem respostas.
import { montarPrompt } from './prompt.js';

const LIMITE_PERGUNTA = 300;
const LIMITE_HISTORICO = 6;
const TEMPO_LIMITE = 25000;

export default {
  async fetch(req, env) {
    const origem = req.headers.get('Origin') || '';
    const permitidas = (env.ORIGEM_PERMITIDA || '').split(',').map((s) => s.trim()).filter(Boolean);
    const cors = {
      'Access-Control-Allow-Origin': permitidas.includes(origem) ? origem : permitidas[0] || '',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin'
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST' || !permitidas.includes(origem)) return json({ erro: 'NAO_PERMITIDO' }, 403, cors);

    const { pergunta, perfil, historico = [] } = await req.json().catch(() => ({}));
    if (typeof pergunta !== 'string' || !pergunta.trim() || pergunta.length > LIMITE_PERGUNTA
        || !Array.isArray(historico) || historico.length > LIMITE_HISTORICO) {
      return json({ erro: 'ENTRADA_INVALIDA' }, 400, cors);
    }
    const trocas = historico.map((h) => ({ usuario: h.papel === 'usuario', texto: String(h.texto ?? '').slice(0, 600) }));
    const sistema = montarPrompt(perfil);

    let texto;
    try {
      texto = env.PROVEDOR === 'groq'
        ? await chamarGroq(env, sistema, trocas, pergunta)
        : await chamarGemini(env, sistema, trocas, pergunta);
    } catch (e) {
      const status = e.codigo === 'LIMITE_COTA' ? 429 : e.codigo === 'TEMPO_ESGOTADO' ? 504 : 502;
      return json({ erro: e.codigo || 'SERVICO_INDISPONIVEL' }, status, cors);
    }

    try {
      const saida = JSON.parse(String(texto).replace(/^```(json)?|```$/g, '').trim());
      if (typeof saida.resposta !== 'string' || !saida.resposta.trim()) throw new Error('sem resposta');
      return json({ resposta: saida.resposta, acao: saida.acao ?? null, na_base: saida.na_base !== false }, 200, cors);
    } catch {
      return json({ erro: 'RESPOSTA_INVALIDA' }, 502, cors);
    }
  }
};

async function chamar(url, opcoes) {
  let r;
  try {
    r = await fetch(url, { ...opcoes, signal: AbortSignal.timeout(TEMPO_LIMITE) });
  } catch (e) {
    throw falha(e.name === 'TimeoutError' ? 'TEMPO_ESGOTADO' : 'SERVICO_INDISPONIVEL');
  }
  if (r.status === 429) throw falha('LIMITE_COTA');
  if (!r.ok) throw falha('SERVICO_INDISPONIVEL');
  return r.json().catch(() => { throw falha('RESPOSTA_INVALIDA'); });
}

async function chamarGemini(env, sistema, trocas, pergunta) {
  const dados = await chamar(`https://generativelanguage.googleapis.com/v1beta/models/${env.MODELO}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sistema }] },
      contents: [
        ...trocas.map((t) => ({ role: t.usuario ? 'user' : 'model', parts: [{ text: t.texto }] })),
        { role: 'user', parts: [{ text: pergunta }] }
      ],
      generationConfig: { temperature: 0.2, maxOutputTokens: 300, responseMimeType: 'application/json' }
    })
  });
  return dados?.candidates?.[0]?.content?.parts?.[0]?.text;
}

async function chamarGroq(env, sistema, trocas, pergunta) {
  const dados = await chamar('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: env.MODELO_GROQ,
      temperature: 0.2,
      max_tokens: 300,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: sistema },
        ...trocas.map((t) => ({ role: t.usuario ? 'user' : 'assistant', content: t.texto })),
        { role: 'user', content: pergunta }
      ]
    })
  });
  return dados?.choices?.[0]?.message?.content;
}

function falha(codigo) { const e = new Error(codigo); e.codigo = codigo; return e; }
const json = (obj, status, headers) =>
  new Response(JSON.stringify(obj), { status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } });
