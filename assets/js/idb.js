// Invólucro mínimo de IndexedDB para a fila do diário offline: um banco, uma loja ("pendentes"), chave textual.
const BANCO = 'portal-offline';
const LOJA = 'pendentes';
let aberto;

function abrir() {
  aberto ??= new Promise((ok, falha) => {
    if (!('indexedDB' in globalThis)) { falha(new Error('IDB_INDISPONIVEL')); return; }
    const pedido = indexedDB.open(BANCO, 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(LOJA, { keyPath: 'chave' });
    pedido.onsuccess = () => ok(pedido.result);
    pedido.onerror = () => { aberto = null; falha(pedido.error); };
  });
  return aberto;
}
const pedir = (modo, fazer) => abrir().then((db) => new Promise((ok, falha) => {
  const t = db.transaction(LOJA, modo);
  const r = fazer(t.objectStore(LOJA));
  t.oncomplete = () => ok(r?.result);
  t.onerror = () => falha(t.error);
  t.onabort = () => falha(t.error);
}));

/** Grava ou substitui um registro (a chave é o campo `chave`). */
export const gravar = (registro) => pedir('readwrite', (l) => l.put(registro));
export const remover = (chave) => pedir('readwrite', (l) => l.delete(chave));
export const buscar = (chave) => pedir('readonly', (l) => l.get(chave));
export const listar = () => pedir('readonly', (l) => l.getAll());
export const limpar = () => pedir('readwrite', (l) => l.clear());
