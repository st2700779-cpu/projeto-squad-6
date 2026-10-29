// Arquivos anexados (PDF da resolução do ato autorizativo). Ficam no IndexedDB do navegador: o PDF é grande demais para o
// localStorage e para a API local do protótipo. Nos dados do ato fica só { id, nome, tamanho }.
// Limite do protótipo: o PDF só abre no navegador em que foi anexado. Em produção ele iria para um servidor de arquivos.
const BANCO = 'portal-arquivos';
const LOJA = 'arquivos';
export const TAMANHO_MAXIMO = 5 * 1024 * 1024; // 5 MB
let aberto;

function abrir() {
  aberto ??= new Promise((ok, falha) => {
    if (!('indexedDB' in globalThis)) { falha(new Error('IDB_INDISPONIVEL')); return; }
    const pedido = indexedDB.open(BANCO, 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(LOJA, { keyPath: 'id' });
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

/** Confere o arquivo escolhido: só PDF, até 5 MB. Devolve a mensagem de erro ou ''. */
export function conferirPdf(arquivo) {
  if (!arquivo) return '';
  const ehPdf = arquivo.type === 'application/pdf' || /\.pdf$/i.test(arquivo.name);
  if (!ehPdf) return 'Escolha um arquivo PDF.';
  if (arquivo.size > TAMANHO_MAXIMO) return 'O PDF tem mais de 5 MB. Diminua o arquivo e tente de novo.';
  return '';
}

/** Guarda o PDF e devolve o que fica no ato: { id, nome, tamanho }. */
export async function guardarPdf(arquivo) {
  const id = `pdf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  await pedir('readwrite', (l) => l.put({ id, nome: arquivo.name, tamanho: arquivo.size, tipo: arquivo.type || 'application/pdf', conteudo: arquivo }));
  return { id, nome: arquivo.name, tamanho: arquivo.size };
}

/** Abre o PDF numa aba nova. Devolve false se ele não está neste navegador. */
export async function abrirPdf(id) {
  const registro = await pedir('readonly', (l) => l.get(id)).catch(() => null);
  if (!registro) return false;
  const url = URL.createObjectURL(new Blob([registro.conteudo], { type: registro.tipo }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return true;
}

/** Apaga todos os anexos (usado por "Restaurar dados de demonstração"). */
export const limparArquivos = () => pedir('readwrite', (l) => l.clear());

/** "1,2 MB" ou "340 KB". */
export const tamanhoLegivel = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
