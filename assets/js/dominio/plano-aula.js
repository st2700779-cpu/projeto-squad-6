// Plano de aula com habilidades da BNCC. O protótipo confere só o FORMATO do código e se ele combina com a etapa e o ano da turma;
// o texto de cada habilidade deve ser conferido na BNCC (basenacionalcomum.mec.gov.br).
// Formato: EF06MA01 = Ensino Fundamental · 6º ano · Matemática · habilidade 01 ("EF69LP01": do 6º ao 9º ano; "EF67": 6º e 7º).
// Ensino Médio: EM13MAT101 = área ou componente (LP, LGG, MAT, CNT, CHS) e número da habilidade.
import { diasEntreDatas } from './hoje.js';

export const CODIGO_BNCC = /^(EI\d{2}[A-Z]{2}\d{2}|EF\d{2}[A-Z]{2}\d{2}|EM13(?:LGG|MAT|CNT|CHS)\d{3}|EM13LP\d{2})$/;
export const EXEMPLOS_DE_CODIGOS = [
  ['EF06MA01', 'Matemática · 6º ano · números naturais e racionais na reta numérica'],
  ['EF07MA04', 'Matemática · 7º ano · problemas com números inteiros'],
  ['EF08MA06', 'Matemática · 8º ano · valor numérico de expressões algébricas'],
  ['EF09MA09', 'Matemática · 9º ano · fatoração e equações do 2º grau'],
  ['EM13MAT101', 'Matemática · Ensino Médio · variação de grandezas e gráficos de funções'],
  ['EM13MAT302', 'Matemática · Ensino Médio · funções polinomiais do 2º grau']
];
export const PLANO = { temaMin: 5, textoMin: 10, aulasMax: 6 };

/** Códigos separados por espaço, vírgula ou ponto e vírgula, em maiúsculas e sem repetir. */
export const normalizarCodigos = (texto) => [...new Set(String(texto ?? '').toUpperCase().split(/[\s,;]+/).filter(Boolean))];

/** Anos do Ensino Fundamental a que um código EF se refere (ex.: EF06 → [6]; EF67 → [6, 7]; EF69 → [6, 9] como faixa). */
function faixaDoCodigo(codigo) {
  const [a, b] = [codigo[2], codigo[3]];
  return a === '0' ? [Number(b), Number(b)] : [Number(a), Number(b)];
}
/** O código combina com a série da turma? (EM13 só no Ensino Médio; EF só no ano que o código cobre). */
export function codigoCombinaComSerie(codigo, serie) {
  const medio = /EM/.test(serie);
  if (codigo.startsWith('EM13')) return medio;
  if (medio) return false;
  const ano = Number(/^(\d+)º ano/.exec(serie)?.[1]);
  if (!ano) return codigo.startsWith('EF');
  if (!codigo.startsWith('EF')) return false;
  const [de, ate] = faixaDoCodigo(codigo);
  return ano >= de && ano <= ate;
}

/**
 * @param {object} f turma ("turmaId|componente"), tema, data, aulas, habilidades (texto), objetivos, atividades, recursos, avaliacao
 * @param {{minhasTurmas: Array<{id: string, serie: string}>, hoje: string}} ctx
 */
export function validarPlano(f, { minhasTurmas, hoje }) {
  const e = {};
  const [turmaId] = String(f.turma || '').split('|');
  const turma = minhasTurmas.find((t) => t.id === turmaId);
  if (!turma) e.turma = 'Escolha uma das suas turmas.';
  const tema = String(f.tema ?? '').trim();
  if (tema.length < PLANO.temaMin) e.tema = `Dê um tema à aula (pelo menos ${PLANO.temaMin} letras).`;
  else if (tema.length > 90) e.tema = 'O tema pode ter até 90 letras.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.data || '') || Number.isNaN(Date.parse(f.data + 'T00:00:00Z'))) e.data = 'Informe a data prevista da aula.';
  else if (Math.abs(diasEntreDatas(hoje, f.data)) > 400) e.data = 'Confira a data: ela está a mais de um ano de hoje.';
  const n = Number(f.aulas);
  if (!Number.isInteger(n) || n < 1 || n > PLANO.aulasMax) e.aulas = `Informe de 1 a ${PLANO.aulasMax} aulas.`;
  const codigos = normalizarCodigos(f.habilidades);
  const invalidos = codigos.filter((c) => !CODIGO_BNCC.test(c));
  if (!codigos.length) e.habilidades = 'Informe pelo menos uma habilidade da BNCC, pelo código (ex.: EF06MA01).';
  else if (invalidos.length) e.habilidades = `Código fora do formato da BNCC: ${invalidos.join(', ')}. Exemplo: EF06MA01 ou EM13MAT101.`;
  else if (codigos.length > 6) e.habilidades = 'Use até 6 habilidades por plano.';
  else if (turma) {
    const fora = codigos.filter((c) => !codigoCombinaComSerie(c, turma.serie));
    if (fora.length) e.habilidades = `${fora.join(', ')} não combina${fora.length > 1 ? 'm' : ''} com a ${turma.serie} (confira a etapa e o ano no código).`;
  }
  for (const [campo, rotulo] of [['objetivos', 'os objetivos'], ['atividades', 'as atividades']]) {
    const t = String(f[campo] ?? '').trim();
    if (t.length < PLANO.textoMin) e[campo] = `Descreva ${rotulo} (pelo menos ${PLANO.textoMin} letras).`;
    else if (t.length > 800) e[campo] = 'Resuma em até 800 letras.';
  }
  for (const campo of ['recursos', 'avaliacao']) if (String(f[campo] ?? '').trim().length > 400) e[campo] = 'Resuma em até 400 letras.';
  return { ok: !Object.keys(e).length, erros: e };
}

export function montarPlano(f, { id, professorId, turmaNome, agora }) {
  const [turmaId, componente] = String(f.turma).split('|');
  return {
    id, professorId, turmaId, turma: turmaNome, componente, tema: f.tema.trim(), data: f.data, aulas: Number(f.aulas), habilidades: normalizarCodigos(f.habilidades),
    objetivos: f.objetivos.trim(), atividades: f.atividades.trim(), recursos: String(f.recursos ?? '').trim(), avaliacao: String(f.avaliacao ?? '').trim(), criadoEm: agora
  };
}
