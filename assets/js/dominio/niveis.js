// Domínio: níveis de ensino e as séries (anos, séries, etapas ou módulos) de cada um.
// A lista vem de data/niveis.json e é mantida pela SEED em Rede › Cadastros. Os valores abaixo são o padrão: valem nos testes
// e até os dados carregarem. aplicarNiveis() troca o conteúdo das listas no lugar, então todo módulo que importou ETAPAS,
// SERIES ou HORAS_MINIMAS passa a enxergar os níveis cadastrados sem precisar importar de novo.
// Funções puras, sem tela, testadas em tools/testar-cadastros.mjs.
import { normalizar } from './texto.js';

/** Como cada nível chama as suas divisões. Muda só o nome: a regra de matrícula, vagas e turmas é a mesma. */
export const NOMENCLATURAS = {
  ano: { rotulo: 'Anos', singular: 'ano', plural: 'anos', exemplo: '1º ano, 2º ano, 3º ano' },
  serie: { rotulo: 'Séries', singular: 'série', plural: 'séries', exemplo: '1ª série, 2ª série, 3ª série' },
  etapa: { rotulo: 'Etapas', singular: 'etapa', plural: 'etapas', exemplo: 'Etapa I, Etapa II' },
  modulo: { rotulo: 'Módulos', singular: 'módulo', plural: 'módulos', exemplo: 'Módulo I, Módulo II' }
};

/** Níveis de ensino padrão (o mesmo conteúdo de data/niveis.json). */
export const NIVEIS_PADRAO = [
  { id: 'n-ei', etapa: 'Educação Infantil', curto: 'Educação Infantil', nomenclatura: 'etapa', series: ['Creche', 'Pré-escola'], ativo: false, matricula: false, horasMinimas: 800, aulasPadrao: 25, continuaEm: 'n-ai', observacao: 'Oferecida pelos municípios. Fica desativada na rede estadual.' },
  { id: 'n-ai', etapa: 'Ensino Fundamental — Anos Iniciais', curto: 'Anos Iniciais', nomenclatura: 'ano', series: ['1º ano', '2º ano', '3º ano', '4º ano', '5º ano'], ativo: true, matricula: true, horasMinimas: 800, aulasPadrao: 25, continuaEm: 'n-af' },
  { id: 'n-af', etapa: 'Ensino Fundamental — Anos Finais', curto: 'Anos Finais', nomenclatura: 'ano', series: ['6º ano', '7º ano', '8º ano', '9º ano'], ativo: true, matricula: true, horasMinimas: 800, aulasPadrao: 25, continuaEm: 'n-em' },
  { id: 'n-em', etapa: 'Ensino Médio', curto: 'Ensino Médio', nomenclatura: 'serie', series: ['1ª série EM', '2ª série EM', '3ª série EM'], ativo: true, matricula: true, horasMinimas: 1000, aulasPadrao: 30, continuaEm: null },
  { id: 'n-ejaf', etapa: 'EJA — Ensino Fundamental', curto: 'EJA Fundamental', nomenclatura: 'etapa', series: ['EJA EF — Etapa I', 'EJA EF — Etapa II', 'EJA EF — Etapa III', 'EJA EF — Etapa IV'], ativo: true, matricula: false, horasMinimas: 800, aulasPadrao: 25, continuaEm: 'n-ejam' },
  { id: 'n-ejam', etapa: 'EJA — Ensino Médio', curto: 'EJA Médio', nomenclatura: 'etapa', series: ['EJA EM — Etapa I', 'EJA EM — Etapa II', 'EJA EM — Etapa III'], ativo: true, matricula: false, horasMinimas: 800, aulasPadrao: 25, continuaEm: null },
  { id: 'n-prof', etapa: 'Educação Profissional — Técnico subsequente', curto: 'Técnico subsequente', nomenclatura: 'modulo', series: ['Técnico — Módulo I', 'Técnico — Módulo II', 'Técnico — Módulo III'], ativo: true, matricula: false, horasMinimas: 800, aulasPadrao: 25, continuaEm: null, observacao: 'Centros de educação profissional: para quem já concluiu o Ensino Médio.' }
];

/** Todos os níveis (ativos e desativados), na ordem do cadastro: { id, etapa, curto, resumo, nomenclatura, series[], ativo, matricula, ... }. */
export const ETAPAS = [];
/** Séries da matrícula on-line, em ordem: as dos níveis ativos marcados como "aparece na matrícula". */
export const SERIES = [];
/** Carga mínima por ano de cada nível, em horas ({ [etapa]: horas }). */
export const HORAS_MINIMAS = {};

const romanoOuNumero = (s) => /^(\d+)[ºª]/.exec(s)?.[1];
/** "1º ao 5º ano", "1ª a 3ª série" ou "4 etapas". */
export function resumoDoNivel(n) {
  if (n.resumo) return n.resumo;
  const s = n.series || [];
  if (!s.length) return `nenhuma ${NOMENCLATURAS[n.nomenclatura]?.singular || 'série'} cadastrada`;
  const a = romanoOuNumero(s[0]), b = romanoOuNumero(s[s.length - 1]);
  if (n.nomenclatura === 'ano' && a && b) return s.length === 1 ? s[0] : `${a}º ao ${b}º ano`;
  if (n.nomenclatura === 'serie' && a && b) return s.length === 1 ? s[0].replace(' EM', '') : `${a}ª a ${b}ª série`;
  const nome = NOMENCLATURAS[n.nomenclatura] || NOMENCLATURAS.etapa;
  return `${s.length} ${s.length === 1 ? nome.singular : nome.plural}`;
}

/**
 * Troca o conteúdo de ETAPAS, SERIES e HORAS_MINIMAS pelos níveis cadastrados (no lugar: quem já importou vê a mudança).
 * Lista vazia ou inválida mantém o padrão.
 */
export function aplicarNiveis(niveis) {
  const lista = Array.isArray(niveis) && niveis.length && niveis.every((n) => n && n.etapa && Array.isArray(n.series)) ? niveis : NIVEIS_PADRAO;
  ETAPAS.splice(0, ETAPAS.length, ...lista.map((n) => ({ ...n, ativo: n.ativo !== false, resumo: resumoDoNivel(n) })));
  SERIES.splice(0, SERIES.length, ...ETAPAS.filter((n) => n.ativo && n.matricula).flatMap((n) => n.series));
  for (const k of Object.keys(HORAS_MINIMAS)) delete HORAS_MINIMAS[k];
  for (const n of ETAPAS) HORAS_MINIMAS[n.etapa] = Number(n.horasMinimas) || 800;
  return ETAPAS;
}
aplicarNiveis(NIVEIS_PADRAO);

/** Níveis que podem ser escolhidos em cadastros novos (escola, curso). */
export const niveisAtivos = () => ETAPAS.filter((n) => n.ativo);
/** Nível da série (ou undefined se a série não está em nenhum nível). */
export const nivelDaSerie = (serie) => ETAPAS.find((n) => n.series.includes(serie));
/** Todas as séries de todos os níveis, em ordem (para ordenar listas de turmas). */
export const todasAsSeries = () => ETAPAS.flatMap((n) => n.series);
/** Posição da série na ordem geral (séries desconhecidas vão para o fim). */
export const ordemDaSerie = (serie) => { const i = todasAsSeries().indexOf(serie); return i < 0 ? 999 : i; };
/** Nome de uma divisão do nível: "ano", "série", "etapa" ou "módulo". */
export const nomeDaDivisao = (nivel, plural = false) => (NOMENCLATURAS[nivel?.nomenclatura] || NOMENCLATURAS.serie)[plural ? 'plural' : 'singular'];

const resultado = (erros) => ({ ok: Object.keys(erros).length === 0, erros });
const igual = (a, b) => normalizar(a).replace(/\s+/g, ' ').trim() === normalizar(b).replace(/\s+/g, ' ').trim();

/**
 * Cadastro e edição de nível de ensino.
 * @param {object} f etapa (nome completo), curto, nomenclatura, horasMinimas, aulasPadrao, continuaEm, observacao
 * @param {{niveis: object[], id?: string}} ctx id: o nível que está sendo editado (fica fora da conferência de nome repetido)
 */
export function validarNivel(f, { niveis, id = null }) {
  const e = {};
  const outros = niveis.filter((n) => n.id !== id);
  if (String(f.etapa ?? '').trim().length < 5) e.etapa = 'Escreva o nome do nível, com pelo menos 5 letras. Exemplo: EJA — Ensino Médio.';
  else if (outros.some((n) => igual(n.etapa, f.etapa))) e.etapa = 'Já existe um nível com esse nome.';
  if (String(f.curto ?? '').trim().length < 3) e.curto = 'Escreva o nome curto, com pelo menos 3 letras. Exemplo: EJA Médio.';
  else if (String(f.curto).trim().length > 30) e.curto = 'O nome curto tem no máximo 30 letras.';
  else if (outros.some((n) => igual(n.curto, f.curto))) e.curto = 'Já existe um nível com esse nome curto.';
  if (!NOMENCLATURAS[f.nomenclatura]) e.nomenclatura = 'Escolha como o nível se divide: anos, séries, etapas ou módulos.';
  const h = Number(f.horasMinimas);
  if (!Number.isInteger(h) || h < 400 || h > 2000) e.horasMinimas = 'Carga mínima por ano: um número de 400 a 2.000 horas.';
  const a = Number(f.aulasPadrao);
  if (!Number.isInteger(a) || a < 15 || a > 40) e.aulasPadrao = 'Aulas por semana: de 15 a 40.';
  if (f.continuaEm && (f.continuaEm === id || !outros.some((n) => n.id === f.continuaEm))) e.continuaEm = 'Escolha um nível da lista (ou nenhum).';
  if (String(f.observacao ?? '').trim().length > 200) e.observacao = 'A observação tem no máximo 200 letras.';
  return resultado(e);
}
export function montarNivel(f, { niveis }) {
  const n = 1 + Math.max(0, ...niveis.map((x) => Number(/^n(\d+)$/.exec(x.id)?.[1] || 0)));
  return {
    id: `n${n}`, etapa: f.etapa.trim(), curto: f.curto.trim(), nomenclatura: f.nomenclatura, series: [], ativo: true, matricula: false,
    horasMinimas: Number(f.horasMinimas), aulasPadrao: Number(f.aulasPadrao), continuaEm: f.continuaEm || null, observacao: String(f.observacao ?? '').trim()
  };
}
export const aplicarEdicaoDeNivel = (n, f) => ({
  ...n, etapa: n.etapa, curto: f.curto.trim(), nomenclatura: f.nomenclatura, horasMinimas: Number(f.horasMinimas), aulasPadrao: Number(f.aulasPadrao),
  continuaEm: f.continuaEm || null, observacao: String(f.observacao ?? '').trim()
});

/**
 * Sugestão do nome da próxima divisão (a pessoa pode mudar): o número seguinte ao da última ("4ª série EM", "6º ano") ou a próxima
 * etapa/módulo em romanos ("EJA Médio — Etapa IV"). Vazio quando a sugestão já existe em algum nível ou passaria do 9º ano.
 * @param {object} nivel
 * @param {string[]} [existentes] todas as séries de todos os níveis (para não sugerir nome repetido)
 */
export function sugerirSerie(nivel, existentes = []) {
  const series = nivel.series || [];
  const ultima = series[series.length - 1] || '';
  const num = Number(/^(\d+)[ºª]/.exec(ultima)?.[1] || 0) + 1;
  const sufixo = /^\d+[ºª] (ano|série)(.*)$/.exec(ultima)?.[2] || '';
  const romano = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][series.length] || String(series.length + 1);
  let s;
  if (nivel.nomenclatura === 'ano') s = num <= 9 ? `${num}º ano${sufixo}` : '';
  else if (nivel.nomenclatura === 'serie') s = `${num}ª série${sufixo}`;
  else s = `${nivel.curto} — ${nivel.nomenclatura === 'modulo' ? 'Módulo' : 'Etapa'} ${romano}`;
  return s && !existentes.some((x) => normalizar(x) === normalizar(s)) ? s : '';
}

/** Nova série num nível: nome com 3 a 40 letras e que não exista em nenhum nível (a série identifica turmas, vagas e pedidos). */
export function validarSerieNova(nome, { niveis }) {
  const s = String(nome ?? '').trim();
  if (s.length < 3) return resultado({ serie: 'Escreva o nome, com pelo menos 3 letras. Exemplo: 1º ano, 2ª série, Etapa I.' });
  if (s.length > 40) return resultado({ serie: 'O nome tem no máximo 40 letras.' });
  const dono = niveis.find((n) => n.series.some((x) => igual(x, s)));
  if (dono) return resultado({ serie: `Esse nome já existe em ${dono.curto}. Use outro nome, por exemplo com a sigla do nível no fim.` });
  return resultado({});
}

/**
 * Onde a série é usada: turmas, atos que a listam e pedidos de matrícula. Série em uso não pode sair do nível.
 * @returns {{turmas: number, atos: number, pedidos: number, total: number}}
 */
export function usoDaSerie(serie, { turmas = [], atos = [], pedidos = [] }) {
  const t = turmas.filter((x) => x.serie === serie).length;
  const a = atos.filter((x) => Array.isArray(x.series) && x.series.includes(serie)).length;
  const p = pedidos.filter((x) => x.serie === serie).length;
  return { turmas: t, atos: a, pedidos: p, total: t + a + p };
}
export function podeRemoverSerie(serie, uso) {
  if (!uso.total) return { ok: true, motivo: '' };
  const partes = [uso.turmas && `${uso.turmas} ${uso.turmas === 1 ? 'turma' : 'turmas'}`, uso.atos && `${uso.atos} ${uso.atos === 1 ? 'escola oferece' : 'escolas oferecem'}`, uso.pedidos && `${uso.pedidos} ${uso.pedidos === 1 ? 'pedido de matrícula' : 'pedidos de matrícula'}`].filter(Boolean);
  return { ok: false, motivo: `${serie} está em uso (${partes.join(', ')}). Ela não pode sair do nível: desative o nível inteiro se ele deixar de ser oferecido.` };
}

/** Nível com escola autorizada, curso ou turma não pode ser apagado (pode ser desativado). */
export function usoDoNivel(nivel, { atos = [], cursos = [], turmas = [] }) {
  const escolas = new Set(atos.filter((a) => a.etapa === nivel.etapa).map((a) => a.escolaId)).size;
  const c = cursos.filter((x) => x.etapa === nivel.etapa).length;
  const t = turmas.filter((x) => nivel.series.includes(x.serie)).length;
  return { escolas, cursos: c, turmas: t, total: escolas + c + t };
}
export function podeApagarNivel(nivel, uso) {
  if (!uso.total) return { ok: true, motivo: '' };
  const partes = [uso.escolas && `${uso.escolas} ${uso.escolas === 1 ? 'escola autorizada' : 'escolas autorizadas'}`, uso.cursos && `${uso.cursos} ${uso.cursos === 1 ? 'curso' : 'cursos'}`, uso.turmas && `${uso.turmas} ${uso.turmas === 1 ? 'turma' : 'turmas'}`].filter(Boolean);
  return { ok: false, motivo: `${nivel.curto} tem ${partes.join(', ')}. Desative o nível em vez de apagar: o que já existe continua valendo.` };
}
