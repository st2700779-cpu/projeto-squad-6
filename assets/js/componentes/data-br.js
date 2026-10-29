// Campo de data sempre no padrão brasileiro (dd/mm/aaaa), em qualquer navegador.
// O <input type="date"> mostra o formato do idioma do navegador (em inglês fica mm/dd/yyyy), por isso as datas usam um campo
// de texto com máscara. Para o resto do código nada muda: o .value do campo continua lendo e gravando AAAA-MM-DD, que é o
// formato guardado nos dados e conferido pelas regras (dataValida em dominio/cadastros.js).
// Uso: <input type="text" data-campo-data ...> (componentes/formulario.js já monta assim quando tipo: 'date').
const nativo = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

/** "2026-10-07" → "07/10/2026" (outro texto volta igual). */
export const isoParaBR = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v ?? '')); return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v ?? ''); };
/** "07/10/2026" → "2026-10-07". Data incompleta volta como foi digitada, para a regra do campo dizer o que falta. */
export const brParaISO = (v) => { const t = String(v ?? '').trim(); const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t); return m ? `${m[3]}-${m[2]}-${m[1]}` : t; };
/** Máscara enquanto digita: só números, com as barras no lugar. */
export const mascararData = (texto) => {
  const n = String(texto ?? '').replace(/\D/g, '').slice(0, 8);
  return n.length > 4 ? `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}` : n.length > 2 ? `${n.slice(0, 2)}/${n.slice(2)}` : n;
};

function preparar(campo) {
  if (campo.dataset.campoDataPronto) return;
  campo.dataset.campoDataPronto = '1';
  const inicial = nativo.get.call(campo);
  Object.defineProperty(campo, 'value', {
    configurable: true,
    get() { return brParaISO(nativo.get.call(this)); },
    set(v) { nativo.set.call(this, isoParaBR(v)); }
  });
  nativo.set.call(campo, isoParaBR(inicial));
  if (!campo.placeholder) campo.placeholder = 'dd/mm/aaaa';
  campo.inputMode = 'numeric';
  campo.maxLength = 10;
  campo.autocomplete = 'off';
}
const prepararTodos = (raiz) => raiz.querySelectorAll?.('input[data-campo-data]').forEach(preparar);

if (typeof document !== 'undefined' && !globalThis.__dataBR) {
  globalThis.__dataBR = true;
  prepararTodos(document);
  new MutationObserver((mudancas) => mudancas.forEach((m) => m.addedNodes.forEach((n) => {
    if (n.nodeType !== 1) return;
    if (n.matches('input[data-campo-data]')) preparar(n); else prepararTodos(n);
  }))).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('input', (e) => {
    const c = e.target;
    if (!c.matches?.('input[data-campo-data]')) return;
    preparar(c);
    const antes = nativo.get.call(c);
    const depois = mascararData(antes);
    if (depois !== antes) nativo.set.call(c, depois);
  });
}
