// Leitura dos dados simulados (pasta data/). Trocar por uma API real no futuro
// exige mudar só este módulo.
import { obter } from './estado.js';

export const RAIZ = new URL('../../', import.meta.url);
const cache = new Map();

export async function carregar(nome) {
  if (cache.has(nome)) return cache.get(nome);
  const promessa = fetch(new URL(`data/${nome}.json`, RAIZ))
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .catch((e) => { cache.delete(nome); const erro = new Error('DADOS_INDISPONIVEIS'); erro.causa = e; throw erro; });
  cache.set(nome, promessa);
  return promessa;
}

// Dados que o usuário altera durante a demonstração: base simulada + alterações salvas.
export async function matriculas() {
  return obter('matriculas', null) ?? (await carregar('matriculas'));
}
export async function vagas() {
  return obter('vagas', null) ?? (await carregar('vagas'));
}
export async function turmasEscola() {
  return obter('turmas', null) ?? (await carregar('turmas'));
}
export async function diario() {
  const prof = await carregar('professor');
  return obter('diario', null) ?? prof.diario;
}
