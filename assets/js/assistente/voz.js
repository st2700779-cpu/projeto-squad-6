// Reconhecimento de voz (Web Speech API). A leitura em voz alta fica em acessibilidade.js.
const Reconhecimento = window.SpeechRecognition || window.webkitSpeechRecognition;
export const podeOuvir = () => Boolean(Reconhecimento);

let ativo = null;
export function ouvir({ aoEntender, aoFalhar, aoTerminar }) {
  if (!Reconhecimento) { aoFalhar('VOZ_INDISPONIVEL'); return; }
  if (ativo) { ativo.stop(); return; }
  const r = new Reconhecimento();
  r.lang = 'pt-BR';
  r.interimResults = false;
  r.maxAlternatives = 1;
  let entendeu = false;
  r.onresult = (e) => { entendeu = true; aoEntender(e.results[0][0].transcript); };
  // "aborted" é o próprio usuário parando: não mostra erro.
  r.onerror = (e) => { if (!entendeu && e.error !== 'aborted') aoFalhar('VOZ_NAO_ENTENDIDA'); entendeu = true; };
  r.onend = () => { if (!entendeu) aoFalhar('VOZ_NAO_ENTENDIDA'); ativo = null; aoTerminar(); };
  ativo = r;
  try { r.start(); } catch { ativo = null; aoFalhar('VOZ_NAO_ENTENDIDA'); aoTerminar(); }
}
export const pararDeOuvir = () => ativo?.stop();
export const estaOuvindo = () => Boolean(ativo);
