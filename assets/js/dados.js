// Acesso aos dados. Com o servidor local (iniciar.bat) tudo passa pela API em /api/
// e as alterações ficam salvas em disco (pasta dados-salvos/). Em hospedagem estática
// (GitLab Pages, Live Server) não há API: lê data/*.json e guarda as alterações no localStorage.
import { obter, definir, reiniciar, proximoProtocolo, recarregar } from './estado.js';
import { sessao, restaurarSenhas } from './auth.js';
import { abonosPorEstudante, aplicarAbonos } from './dominio/vida-escolar.js';
import { estudantesInativos } from './dominio/movimentacao.js';
import { calcularVagas, vagasPorSerie } from './dominio/vagas.js';
import { hojeISO } from './dominio/hoje.js';

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
const fetchBase = (nome) => usarApi()
  .then((api) => fetch(api ? new URL(nome, API) : new URL(`data/${nome}.json`, RAIZ), { cache: 'no-store' }))
  .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });
export async function carregar(nome) {
  if (cache.has(nome)) return cache.get(nome);
  const promessa = fetchBase(nome)
    .then((base) => (ACRESCIMOS[nome] ? acrescentar(base, ACRESCIMOS[nome], nome) : base))
    .catch((e) => { cache.delete(nome); const erro = new Error('DADOS_INDISPONIVEIS'); erro.causa = e; throw erro; });
  cache.set(nome, promessa);
  return promessa;
}

// Cadastros feitos durante a demonstração (nova escola, novo ato, novo professor) ficam em conjuntos próprios e são somados
// ao arquivo-base quando alguém lê 'escolas', 'atos' ou 'professores'. Assim todas as telas já enxergam o que foi cadastrado.
const ACRESCIMOS = { escolas: 'escolas-novas', atos: 'atos-novos', professores: 'professores-novos' };
// Um registro do conjunto extra com a mesma chave de um do arquivo-base SUBSTITUI o original: é assim que a edição de uma escola,
// a renovação de um ato e a mudança de um professor funcionam sem mexer nos arquivos de data/.
const CHAVE_DO_REGISTRO = { escolas: (r) => r.id, atos: (r) => `${r.escolaId}|${r.etapa}`, professores: (r) => r.id };
export const mesclar = (nome, base, extra) => {
  const chave = CHAVE_DO_REGISTRO[nome];
  const novas = new Set(extra.map(chave));
  return [...base.filter((r) => !novas.has(chave(r))), ...extra];
};
// Nomes antigos das DREs (antes das 10 diretorias oficiais da SEDUC/SE): escolas salvas no navegador com o nome antigo
// passam a aparecer na diretoria certa. A lista oficial, com os municípios de cada uma, está em data/dres.json.
const DRE_RENOMEADA = { 'DRE — Grande Aracaju': 'DRE 8 — Nossa Senhora do Socorro', 'DRE — Centro-Sul': 'DRE 2 — Lagarto', 'DRE — Agreste Central': 'DRE 3 — Itabaiana' };
/** Nome atual da DRE (troca os nomes antigos pelos oficiais; os demais ficam como estão). */
export const nomeAtualDaDre = (nome) => DRE_RENOMEADA[nome] || nome;
async function acrescentar(base, nomeExtra, nome) {
  const extra = await alteravel(nomeExtra, () => carregar(nomeExtra));
  const todos = nome === 'escolas' ? mesclar(nome, base, extra).map((e) => (DRE_RENOMEADA[e.dre] ? { ...e, dre: DRE_RENOMEADA[e.dre] } : e)) : mesclar(nome, base, extra);
  // Professor desligado da escola não conta em habilitação nem em alocação; a tela de professores usa professoresComInativos().
  return nome === 'professores' ? todos.filter((p) => p.ativo !== false) : todos;
}
/** Todos os professores, inclusive os desligados (para a tela de cadastro poder reativar). */
export async function professoresComInativos() {
  const base = await fetchBase('professores');
  const extra = await alteravel('professores-novos', () => carregar('professores-novos'));
  return mesclar('professores', base, extra);
}

// Dados que o usuário altera durante a demonstração.
async function alteravel(nome, semApi) {
  if (await usarApi()) return carregar(nome);
  return obter(nome, null) ?? (await semApi());
}
export const matriculas = () => alteravel('matriculas', () => carregar('matriculas'));
// As turmas dos anos finais da escola do protótipo (r1 a r4) passaram de data/turmas-rede.json para data/turmas.json: a direção
// gerencia todas as turmas da escola num lugar só. Quem salvou turmas antes dessa mudança recebe de volta as que faltam
// (essas turmas têm estudantes, então nunca são apagadas pela direção).
const TURMAS_MOVIDAS = ['r1', 'r2', 'r3', 'r4'];
const arquivoDeDados = (nome) => fetch(new URL(`data/${nome}.json`, RAIZ), { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });
/** Turmas da escola do protótipo (e1), gerenciadas pela direção (Direção › Turmas). Conjunto alterável 'turmas'. */
export async function turmasEscola() {
  const lista = await alteravel('turmas', () => carregar('turmas'));
  if (TURMAS_MOVIDAS.every((id) => lista.some((t) => t.id === id))) return lista;
  try {
    const base = await arquivoDeDados('turmas');
    lista.push(...base.filter((t) => TURMAS_MOVIDAS.includes(t.id) && !lista.some((x) => x.id === t.id)));
  } catch { /* sem o arquivo-base, segue com o que está salvo */ }
  return lista;
}
/**
 * Turmas da rede toda: as da escola do protótipo (alteráveis), as das outras escolas (data/turmas-rede.json)
 * e as que a rede abriu em rodadas anteriores para escolas sem direção no protótipo (conjunto turmas-rede-novas).
 * Um id repetido vale uma vez só (a versão alterável ganha).
 */
export async function turmasDaRede() {
  const [minhas, outras, abertasPelaRede] = await Promise.all([turmasEscola(), carregar('turmas-rede'), conjunto('turmas-rede-novas')]);
  const vistos = new Set();
  return [...minhas, ...outras, ...abertasPelaRede].filter((t) => !vistos.has(t.id) && vistos.add(t.id));
}
/**
 * Vagas calculadas a partir das turmas (ninguém digita o número): lugares livres nas turmas aprovadas menos os pedidos de
 * matrícula que ainda não têm turma. Detalhe por escola e série, com os turnos e as turmas (ver dominio/vagas.js).
 */
export async function vagasDetalhadas() {
  const [turmas, pedidos, enturmacao, atos] = await Promise.all([turmasDaRede(), matriculas(), conjunto('enturmacao'), carregar('atos')]);
  return calcularVagas({ turmas, pedidos, enturmacao, atos, hoje: hojeISO() });
}
/** Vagas por escola e série ({ e1: { '6º ano': 3 } }): o formato que a matrícula, a transferência e o mapa da família usam. */
export const vagas = async () => vagasPorSerie(await vagasDetalhadas());
/** Diário de classe por turma: { [turmaId]: [{id, nome, n1, n2, faltas}] }. Base inicial em professor.json. */
export const diario = () => alteravel('diario', async () => (await carregar('professor')).diario);
/**
 * Diário só para leitura (frequência de aluno, responsável, painéis): as faltas abonadas por justificativa aceita já saem descontadas
 * e cada estudante afetado traz `abonadas`. Quem grava no diário (professor) usa diario(), que guarda as faltas como foram registradas.
 * soAtivos: tira transferidos e cancelados (use nos painéis da escola e do professor; o estudante vê o próprio boletim completo).
 */
export async function diarioParaLeitura({ soAtivos = false } = {}) {
  const [dia, chamadas, justificativas, movs] = await Promise.all([diario(), conjunto('chamadas'), conjunto('justificativas'), soAtivos ? conjunto('movimentacoes') : []]);
  const comAbonos = aplicarAbonos(dia, abonosPorEstudante(chamadas, justificativas));
  if (!soAtivos) return comAbonos;
  const fora = estudantesInativos(movs);
  return Object.fromEntries(Object.entries(comAbonos).map(([turmaId, alunos]) => [turmaId, alunos.filter((a) => !fora.has(a.id))]));
}
/** Dados do ano letivo (aulas dadas, bimestre atual). Fonte única para o cálculo de frequência. */
export const letivo = () => carregar('letivo');
// Demais conjuntos alteráveis, cada um com arquivo-base em data/:
// chamadas, historico, enturmacao, alocacoes, renovacoes, equivalencias, niveis, vinculos, salas (lista em tools/servidor.ps1).
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
  // Quem soma este conjunto ao arquivo-base precisa reler: o resultado em memória ficou velho.
  for (const [base, extra] of Object.entries(ACRESCIMOS)) if (extra === nome) cache.delete(base);
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

/** Descarta o que esta página guardou em memória e relê o armazenamento (útil depois de uma sincronização ou de outra aba gravar). */
export function recarregarDoServidor() { recarregar(); cache.clear(); }

/** Restaura os dados de demonstração: apaga o que foi salvo no navegador e na API local. */
export async function reiniciarDados() {
  reiniciar();
  restaurarSenhas();
  cache.clear();
  await import('./idb.js').then((m) => m.limpar()).catch(() => { /* sem IndexedDB não há fila para limpar */ });
  await import('./arquivos.js').then((m) => m.limparArquivos()).catch(() => { /* sem IndexedDB não há anexo para apagar */ });
  if (await usarApi()) {
    const r = await fetch(new URL('dados', API), { method: 'DELETE' });
    if (!r.ok) throw new Error('FALHA_AO_SALVAR');
  }
}

// Estudantes que a sessão pode ver. Aluno: só o próprio cadastro. Responsável: os filhos (seletor no topo).
// Sem login (matrícula pública) ou com outro perfil: o cadastro todo. O estudante escolhido fica guardado no navegador.
export async function estudantes() {
  let lista = await carregar('estudantes');
  const login = sessao();
  let id;
  if (login?.perfil === 'aluno' && lista.some((e) => e.id === login.refId)) { lista = lista.filter((e) => e.id === login.refId); id = login.refId; }
  else if (login?.perfil === 'responsavel') { const filhos = lista.filter((e) => e.responsavelId === login.refId); if (filhos.length) lista = filhos; }
  id ??= obter('estudanteId', lista[0].id);
  return { lista, atual: lista.find((e) => e.id === id) || lista[0] };
}
export function escolherEstudante(id) {
  definir('estudanteId', id);
  globalThis.dispatchEvent?.(new Event('estudante-escolhido')); // o aviso de matrícula e o contador de avisos do menu acompanham a troca de filho
}

/** Data de referência da demonstração (AAAA-MM-DD): "hoje" para agenda, prazos e horário do dia. Vem de data/letivo.json. */
export async function dataDeReferencia() { return (await letivo()).dataReferencia; }
