// Regras de negócio da rede aplicadas sobre os dados simulados.
export const SERIES = ['6º ano', '7º ano', '8º ano', '9º ano', '1ª série EM', '2ª série EM', '3ª série EM'];
export const etapaDaSerie = (serie) => (serie.includes('EM') ? 'Ensino Médio' : 'Ensino Fundamental — Anos Finais');
// "1ª série EM" → "1ª série do Ensino Médio"; "6º ano" → "6º ano do Ensino Fundamental".
export const serieCompleta = (serie) => (serie.includes('EM') ? serie.replace(' EM', ' do Ensino Médio') : `${serie} do Ensino Fundamental`);
// "Colégio Estadual Rio Sergipe" → "C. E. Rio Sergipe" (telas estreitas).
export const nomeCurto = (nome) => nome.replace(/^Colégio Estadual /, 'C. E. ').replace(/^Escola Estadual /, 'E. E. ');
export const MEDIA_APROVACAO = 6;
export const PRESENCA_MINIMA = 75;

// A partir de 120 dias do vencimento, o ato entra em alerta e a rede já pode pedir a renovação.
export const DIAS_RENOVACAO = 120;

// Situação de um ato autorizativo em relação a hoje.
export function situacaoAto(ato, hoje = new Date()) {
  const fim = new Date(ato.validade + 'T23:59:59');
  const dias = Math.ceil((fim - hoje) / 86400000);
  if (dias < 0) return { vigente: false, texto: 'Vencido', tipo: 'erro', dias };
  if (dias <= DIAS_RENOVACAO) return { vigente: true, texto: `Vence em ${dias} dias`, tipo: 'atencao', dias };
  return { vigente: true, texto: 'Vigente', tipo: 'ok', dias };
}

// RN-01 e RN-04: só oferta a série quem tem ato vigente para a etapa.
export function atoDaEtapa(atos, escolaId, serie) {
  return atos.find((a) => a.escolaId === escolaId && a.etapa === etapaDaSerie(serie)) || null;
}
export function motivoBloqueio({ atos, vagas, escolaId, serie }) {
  const ato = atoDaEtapa(atos, escolaId, serie);
  if (!ato) return 'Esta escola não oferece esta série.';
  if (!situacaoAto(ato).vigente) return 'Sem autorização vigente para esta série.';
  if (!(vagas[escolaId]?.[serie] > 0)) return 'Sem vagas nesta série.';
  return null;
}

export const media = (n1, n2) => (Number(n1) + Number(n2)) / 2;
export const presenca = (faltas, aulasDadas) => Math.max(0, 100 - (faltas / aulasDadas) * 100);

// Notas e presença de um estudante. Se a turma tem diário do professor, Matemática e faltas vêm dele.
export function desempenho(est, diario) {
  const doDiario = est.turmaId && diario?.[est.turmaId]?.find((a) => a.id === est.id);
  const notas = { ...est.notas };
  if (doDiario) notas['Matemática'] = [doDiario.n1, doDiario.n2];
  const linhas = Object.entries(notas).map(([materia, [n1, n2]]) => ({ materia, n1, n2, media: media(n1, n2) }));
  linhas.sort((a, b) => (a.materia === 'Matemática' ? -1 : b.materia === 'Matemática' ? 1 : 0));
  const faltas = doDiario ? doDiario.faltas : (est.faltas ?? 0);
  return { linhas, faltas, presenca: presenca(faltas, est.aulasDadas), matematicaDoDiario: Boolean(doDiario) };
}
// Série seguinte, para a rematrícula (null no fim do Ensino Médio).
export const proximaSerie = (serie) => SERIES[SERIES.indexOf(serie) + 1] || null;

// Coluna da matriz do Ensino Médio para a série ("2ª série EM" → 2). Null fora do EM.
export const colunaDaMatriz = (serie) => { const m = /^(\d)ª série/.exec(serie); return m ? Number(m[1]) : null; };

// Alocação (regra de habilitação): o professor só leciona componente compatível com o concurso e a formação,
// e sem passar da carga horária semanal. Devolve o motivo do bloqueio ou null.
export function bloqueioAlocacao({ professor, componente, aulas, aulasJaAlocadas }) {
  if (!professor.habilitacao.includes(componente)) {
    return `${professor.nome} é habilitado(a) em ${professor.habilitacao.join(' e ')}. Pela regra de habilitação, só pode lecionar componentes compatíveis com o concurso (${professor.concurso}) e a formação (${professor.formacao}).`;
  }
  const total = professor.aulasEmOutrasTurmas + aulasJaAlocadas + aulas;
  if (total > professor.cargaHorariaSemanal) {
    return `${professor.nome} passaria de ${professor.cargaHorariaSemanal} aulas semanais (ficaria com ${total}).`;
  }
  return null;
}

// Equivalências: compara o histórico da escola de origem com a matriz da rede, só com regras.
const SINONIMOS = {
  'lingua portuguesa e literatura': 'lingua portuguesa', portugues: 'lingua portuguesa',
  'lingua inglesa': 'ingles', artes: 'arte', 'educacao digital': 'educacao digital e computacao', computacao: 'educacao digital e computacao'
};
const chaveComponente = (nome) => {
  const n = String(nome).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  return SINONIMOS[n] || n;
};
// historico: { componentes: [[nome, aulasSemana, nota]] }; matriz: [[componente, a1, a2, a3]]; coluna: 1..3.
// Resultado por componente da rede: equivalente | complementar | adaptacao | reprovado. Extras: sem correspondência.
export function compararHistorico(historico, matriz, coluna) {
  const origem = new Map(historico.componentes.map(([nome, aulas, nota]) => [chaveComponente(nome), { nome, aulas, nota }]));
  const usados = new Set();
  const linhas = matriz.filter((c) => c[coluna] > 0).map(([componente, ...cargas]) => {
    const aulasRede = cargas[coluna - 1];
    const o = origem.get(chaveComponente(componente));
    if (!o) return { componente, aulasRede, origem: null, resultado: 'adaptacao' };
    usados.add(chaveComponente(componente));
    if (o.nota < MEDIA_APROVACAO) return { componente, aulasRede, origem: o, resultado: 'reprovado' };
    // Carga menor que 75% da rede pede complementação das aulas que faltam.
    if (o.aulas < aulasRede * 0.75) return { componente, aulasRede, origem: o, resultado: 'complementar', faltam: aulasRede - o.aulas };
    return { componente, aulasRede, origem: o, resultado: 'equivalente' };
  });
  const semCorrespondencia = historico.componentes.filter(([nome]) => !usados.has(chaveComponente(nome))).map(([nome]) => nome);
  return { linhas, semCorrespondencia };
}
