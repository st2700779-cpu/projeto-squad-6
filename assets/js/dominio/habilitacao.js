// Cruzamento entre a matriz curricular e os professores habilitados lotados em cada escola.

/**
 * REGRA ÚNICA DO MAPA DE FALTA DE PROFESSORES.
 * Um componente da matriz "falta" numa escola quando nenhum professor lotado nela (professor.escolaId) tem esse
 * componente na sua habilitação (professor.habilitacao). Só entram na conta os componentes das etapas em que a escola tem
 * ato autorizativo; os demais aparecem como "não se aplica". Não olha carga horária nem aulas em outras turmas.
 *
 * @param {{escolaId:string, componentes:string[], professores:Array<{escolaId:string, habilitacao:string[]}>}} p
 * @returns {string[]} componentes sem professor habilitado lotado na escola
 */
export function componentesSemProfessor({ escolaId, componentes, professores }) {
  const lotados = professores.filter((p) => p.escolaId === escolaId);
  return componentes.filter((c) => !lotados.some((p) => p.habilitacao.includes(c)));
}

/**
 * Tabela escola × componente.
 * @param {{escolas: object[], atos: object[], professores: object[], componentesPorEtapa: Record<string,string[]>}} dados
 * @returns {{componentes: string[], linhas: Array<{escola: object, etapas: string[], celulas: Record<string,'ok'|'falta'|'na'>, faltam: string[]}>}}
 */
export function mapaDeFalta({ escolas, atos, professores, componentesPorEtapa }) {
  const componentes = [...new Set(Object.values(componentesPorEtapa).flat())];
  const linhas = escolas.map((escola) => {
    const etapas = [...new Set(atos.filter((a) => a.escolaId === escola.id).map((a) => a.etapa))];
    const daEscola = [...new Set(etapas.flatMap((e) => componentesPorEtapa[e] || []))];
    const faltam = componentesSemProfessor({ escolaId: escola.id, componentes: daEscola, professores });
    const celulas = Object.fromEntries(componentes.map((c) => [c, !daEscola.includes(c) ? 'na' : faltam.includes(c) ? 'falta' : 'ok']));
    return { escola, etapas, celulas, faltam };
  });
  return { componentes, linhas };
}
