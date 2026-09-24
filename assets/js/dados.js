// Acesso aos dados. Com o servidor local (iniciar.bat) tudo passa pela API em /api/
// e as alterações ficam salvas em disco (pasta dados-salvos/). Em hospedagem estática
// (GitLab Pages, Live Server) não há API: lê data/*.json e guarda as alterações no localStorage.
import { obter, definir, reiniciar, proximoProtocolo } from './estado.js';

export const RAIZ = new URL('../../', import.meta.url);
const API = new URL('api/', RAIZ);
const cache = new Map();

let temApi;
export function usarApi() {
  temApi ??= fetch(new URL('saude', API), { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => d?.ok === true)
    .catch(() => false);
  return temApi;
}

export async function carregar(nome) {
  if (cache.has(nome)) return cache.get(nome);
  const promessa = usarApi()
    .then((api) => fetch(api ? new URL(nome, API) : new URL(`data/${nome}.json`, RAIZ), { cache: 'no-store' }))
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .catch((e) => { cache.delete(nome); const erro = new Error('DADOS_INDISPONIVEIS'); erro.causa = e; throw erro; });
  cache.set(nome, promessa);
  return promessa;
}

// Dados que o usuário altera durante a demonstração.
async function alteravel(nome, semApi) {
  if (await usarApi()) return carregar(nome);
  return obter(nome, null) ?? (await semApi());
}
export const matriculas = () => alteravel('matriculas', () => carregar('matriculas'));
export const vagas = () => alteravel('vagas', () => carregar('vagas'));
export const turmasEscola = () => alteravel('turmas', () => carregar('turmas'));
export const diario = () => alteravel('diario', async () => (await carregar('professor')).diario);

// Salva um conjunto alterável (matriculas, vagas, turmas ou diario). Lança erro se a API recusar.
export async function salvar(nome, valor) {
  if (!(await usarApi())) { definir(nome, valor); return; }
  const r = await fetch(new URL(nome, API), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(valor) });
  if (!r.ok) throw new Error('FALHA_AO_SALVAR');
  cache.set(nome, Promise.resolve(valor));
}

export async function novoProtocolo(prefixo) {
  if (!(await usarApi())) return proximoProtocolo(prefixo);
  const r = await fetch(new URL(`protocolo/${prefixo}`, API), { method: 'POST' });
  if (!r.ok) throw new Error('FALHA_AO_SALVAR');
  return (await r.json()).protocolo;
}

// Volta a demonstração ao estado inicial (preferências locais e dados salvos na API).
export async function reiniciarDados() {
  reiniciar();
  cache.clear();
  if (await usarApi()) {
    const r = await fetch(new URL('dados', API), { method: 'DELETE' });
    if (!r.ok) throw new Error('FALHA_AO_SALVAR');
  }
}
