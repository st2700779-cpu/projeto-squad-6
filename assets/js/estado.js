// Estado da sessão simulada. Fica no localStorage apenas por conveniência,
// para os dados alterados sobreviverem à troca de página durante a demonstração.
const CHAVE = 'portal-academico-squad6-v1';

function ler() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch { return {}; }
}
let estado = ler();

/** Lê uma preferência ou dado da sessão simulada (localStorage). */
export function obter(chave, padrao) {
  return estado[chave] !== undefined ? estado[chave] : padrao;
}
/** Grava um valor na sessão simulada; sem armazenamento, segue só em memória. */
export function definir(chave, valor) {
  estado[chave] = valor;
  try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch { /* armazenamento indisponível: segue só em memória */ }
}
/** Apaga o estado local (usado por "Reiniciar demonstração"). */
export function reiniciar() {
  estado = {};
  try { localStorage.removeItem(CHAVE); } catch { /* nada a fazer */ }
}
/** Próximo protocolo sem API (ex.: MAT-2026-0003). */
export function proximoProtocolo(prefixo) {
  const cont = obter('contadores', {});
  const n = (cont[prefixo] || 2) + 1;
  cont[prefixo] = n;
  definir('contadores', cont);
  return `${prefixo}-2026-${String(n).padStart(4, '0')}`;
}
