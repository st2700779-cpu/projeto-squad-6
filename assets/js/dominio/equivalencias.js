// Domínio: equivalência entre o histórico da escola de origem e a matriz da rede.
import { MEDIA_APROVACAO } from './notas.js';

const SINONIMOS = {
  'lingua portuguesa e literatura': 'lingua portuguesa', portugues: 'lingua portuguesa',
  'lingua inglesa': 'ingles', artes: 'arte', 'educacao digital': 'educacao digital e computacao', computacao: 'educacao digital e computacao'
};
const chaveComponente = (nome) => {
  const n = String(nome).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  return SINONIMOS[n] || n;
};

/**
 * Compara o histórico da escola de origem com a matriz da rede, só com regras:
 * mesmo componente (com sinônimos) e carga de pelo menos 75% da rede é equivalente;
 * carga menor pede complementação; componente não cursado vira adaptação; nota abaixo da média reprova.
 * @param {{componentes: Array<[string, number, number]>}} historico [nome, aulas por semana, nota].
 * @param {Array<Array>} matriz [componente, aulas 1ª série, 2ª série, 3ª série].
 * @param {number} coluna 1 a 3.
 * @returns {{linhas: Array, semCorrespondencia: string[]}} Resultado por componente: equivalente | complementar | adaptacao | reprovado.
 */
export function compararHistorico(historico, matriz, coluna) {
  const origem = new Map(historico.componentes.map(([nome, aulas, nota]) => [chaveComponente(nome), { nome, aulas, nota }]));
  const usados = new Set();
  const linhas = matriz.filter((c) => c[coluna] > 0).map(([componente, ...cargas]) => {
    const aulasRede = cargas[coluna - 1];
    const o = origem.get(chaveComponente(componente));
    if (!o) return { componente, aulasRede, origem: null, resultado: 'adaptacao' };
    usados.add(chaveComponente(componente));
    if (o.nota < MEDIA_APROVACAO) return { componente, aulasRede, origem: o, resultado: 'reprovado' };
    if (o.aulas < aulasRede * 0.75) return { componente, aulasRede, origem: o, resultado: 'complementar', faltam: aulasRede - o.aulas };
    return { componente, aulasRede, origem: o, resultado: 'equivalente' };
  });
  const semCorrespondencia = historico.componentes.filter(([nome]) => !usados.has(chaveComponente(nome))).map(([nome]) => nome);
  return { linhas, semCorrespondencia };
}
