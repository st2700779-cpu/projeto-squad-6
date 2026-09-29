// Acesso aos dados. Com o servidor local (iniciar.bat) tudo passa pela API em /api/
// e as alterações ficam salvas em disco (pasta dados-salvos/). Em hospedagem estática
// (GitLab Pages, Live Server) não há API: lê data/*.json e guarda as alterações no localStorage.
import { obter, definir, reiniciar, proximoProtocolo } from './estado.js';
import { sessao } from './auth.js';

export const RAIZ = new URL('../../', import.meta.url);
const API = new URL('api/', RAIZ);
const cache = new Map();

let temApi;
/**
 * Diz se o site está sendo servido com a API local (tools/servidor.ps1).
 * A sonda lê o cabeçalho X-Portal-Api de uma página que sempre existe; assim, em hospedagem
 * estática não há resposta 404 e o console do navegador fica limpo.
 * @returns {Promise<boolean>}
 */
export function usarApi() {
  temApi ??= fetch(new URL('config.js', RAIZ), { cache: 'no-store' })
    .then((r) => r.headers.get('X-Portal-Api') === '1')
    .catch(() => false);
  return temApi;
}

/**
 * Lê um conjunto de dados (API local ou data/{nome}.json), com cache por página.
 * @param {string} nome Ex.: 'escolas', 'atos', 'letivo'.
 * @throws {Error} DADOS_INDISPONIVEIS quando a leitura falha.
 */
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
/** Diário de classe por turma: { [turmaId]: [{id, nome, n1, n2, faltas}] }. Base inicial em professor.json. */
export const diario = () => alteravel('diario', async () => (await carregar('professor')).diario);
/** Dados do ano letivo (aulas dadas, bimestre atual). Fonte única para o cálculo de frequência. */
export const letivo = () => carregar('letivo');
// Demais conjuntos alteráveis, cada um com arquivo-base em data/:
// chamadas, historico, enturmacao, alocacoes, renovacoes, equivalencias.
export const conjunto = (nome) => alteravel(nome, () => carregar(nome));

/** Registra no histórico de ações quem fez o quê, em quê e quando (o mais recente fica no topo). */
export async function registrarAcao(quem, acao, alvo) {
  const lista = await conjunto('historico');
  lista.unshift({ quando: new Date().toISOString(), quem, acao, alvo });
  await salvar('historico', lista.slice(0, 200));
}
// Última ação registrada sobre um alvo (ex.: um protocolo), ou null.
export async function ultimaAcao(alvo) {
  return (await conjunto('historico')).find((h) => h.alvo === alvo) || null;
}

/** Salva um conjunto alterável (API ou localStorage). Lança FALHA_AO_SALVAR se a API recusar. */
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

/** Restaura os dados de demonstração: apaga o que foi salvo no navegador e na API local. */
export async function reiniciarDados() {
  reiniciar();
  cache.clear();
  if (await usarApi()) {
    const r = await fetch(new URL('dados', API), { method: 'DELETE' });
    if (!r.ok) throw new Error('FALHA_AO_SALVAR');
  }
}

// Família com mais de um estudante: lista e estudante escolhido no seletor do topo.
export async function estudantes() {
  let lista = await carregar('estudantes');
  const login = sessao();
  // Com login de aluno, a pessoa só vê o próprio cadastro.
  if (login?.perfil === 'aluno' && lista.some((e) => e.id === login.refId)) { lista = lista.filter((e) => e.id === login.refId); definir('estudanteId', login.refId); }
  const id = obter('estudanteId', lista[0].id);
  return { lista, atual: lista.find((e) => e.id === id) || lista[0] };
}
export const escolherEstudante = (id) => definir('estudanteId', id);
