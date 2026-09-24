// Chamada ao proxy do assistente, com tempo-limite, erros padronizados e pausa após falhas.
// Ver Tópico 4.2 (catálogo de erros). Não guarda nada além dos contadores em memória.
import { responderSemIA, acaoDoTema } from './faqLocal.js';

const CONFIG = window.APP_CONFIG || {};
const URL_API = CONFIG.assistenteUrl || '';
const SIMULAR = new URLSearchParams(location.search).get('simular') || CONFIG.simular || '';
const TEMPO_LIMITE = 30000;
const ACOES_PERMITIDAS = ['matricula', 'documentos', 'notas', 'calendario', 'avisos'];

let falhasSeguidas = 0;
let pausadoAte = 0;
let cotaAte = 0;

export const modoSemIA = () => !URL_API && !SIMULAR;
export const segundosDeCota = () => Math.max(0, Math.ceil((cotaAte - Date.now()) / 1000));

export async function perguntar(pergunta, perfil, historico, sinalUsuario) {
  if (Date.now() < pausadoAte) throw erro('PAUSADO');
  if (Date.now() < cotaAte) throw erro('LIMITE_COTA');
  if (modoSemIA()) throw erro('NAO_CONFIGURADO');
  if (!navigator.onLine) throw registrarFalha(erro('SEM_CONEXAO'));

  const controle = new AbortController();
  sinalUsuario?.addEventListener('abort', () => controle.abort('cancelado'));
  const timer = setTimeout(() => controle.abort('tempo'), TEMPO_LIMITE);
  try {
    const r = SIMULAR
      ? await simular(pergunta, controle.signal)
      : await fetch(URL_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pergunta, perfil, historico: historico.slice(-6) }),
          signal: controle.signal
        });
    if (r.status === 429) { cotaAte = Date.now() + 60000; throw erro('LIMITE_COTA'); }
    if (!r.ok) throw registrarFalha(erro('SERVICO_INDISPONIVEL'));
    const dados = validar(await r.json().catch(() => null));
    falhasSeguidas = 0;
    return dados;
  } catch (e) {
    if (e.codigo) throw e;
    if (controle.signal.reason === 'cancelado') throw erro('CANCELADO');
    if (controle.signal.reason === 'tempo') throw registrarFalha(erro('TEMPO_ESGOTADO'));
    throw registrarFalha(erro('SEM_CONEXAO'));
  } finally {
    clearTimeout(timer);
  }
}

function validar(d) {
  if (!d || typeof d.resposta !== 'string' || !d.resposta.trim()) throw registrarFalha(erro('RESPOSTA_INVALIDA'));
  return {
    resposta: d.resposta.trim().slice(0, 600),
    acao: ACOES_PERMITIDAS.includes(d.acao) ? d.acao : null,
    naBase: d.na_base !== false
  };
}
function registrarFalha(e) {
  if (++falhasSeguidas >= 3) { pausadoAte = Date.now() + 5 * 60000; falhasSeguidas = 0; }
  return e;
}
function erro(codigo) { const e = new Error(codigo); e.codigo = codigo; return e; }

// Simulação local para testes de interface, sem chamar a IA (?simular=ok|lento|cota|erro|invalida).
function simular(pergunta, sinal) {
  const resposta = (status, corpo) => ({ status, ok: status < 400, json: async () => corpo });
  const esperar = (ms) => new Promise((ok, falha) => {
    const t = setTimeout(ok, ms);
    sinal.addEventListener('abort', () => { clearTimeout(t); falha(new DOMException('abortado', 'AbortError')); });
  });
  return (async () => {
    if (SIMULAR === 'lento') { await esperar(TEMPO_LIMITE + 5000); }
    await esperar(1200);
    if (SIMULAR === 'cota') return resposta(429, { erro: 'LIMITE_COTA' });
    if (SIMULAR === 'erro') return resposta(502, { erro: 'SERVICO_INDISPONIVEL' });
    if (SIMULAR === 'invalida') return resposta(200, { texto: 'formato inesperado' });
    const item = await responderSemIA(pergunta);
    return item
      ? resposta(200, { resposta: item.resposta, acao: acaoDoTema(item.tema), na_base: true })
      : resposta(200, { resposta: 'Não tenho essa informação. A secretaria da escola pode ajudar. Ela atende de segunda a sexta, das 7h às 17h.', acao: null, na_base: false });
  })();
}
