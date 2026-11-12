// Diário por bimestre: a nota de cada bimestre junta prova, atividade e presença, e a falta vem da chamada.
//  - Média do bimestre = prova × 60% + atividade × 30% + presença × 10% (presença em nota: 92% de frequência = 9,2).
//  - Só o bimestre em andamento recebe nota. Os anteriores ficam fechados (só consulta) e os seguintes, bloqueados.
//  - Faltas não são digitadas: cada chamada do registro de aula soma, para quem faltou, o número de aulas do dia na grade.
//  - Faltas (quantas aulas o estudante perdeu) e frequência (a porcentagem de presença) são coisas diferentes e aparecem separadas.
// Funções puras, testadas em tools/testar-cadastros.mjs.

export const PESOS = { prova: 0.6, atividade: 0.3, presenca: 0.1 };
export const PARTES = [['prova', 'Prova'], ['atividade', 'Atividade']];
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const arred1 = (n) => Math.round(n * 10) / 10;
const lancada = (n) => n !== null && n !== undefined && n !== '' && !Number.isNaN(Number(n));

/** Bimestre em andamento: o seguinte ao último lançado (1 a totalBimestres). */
export const bimestreAtual = (letivo) => Math.min(Number(letivo?.totalBimestres || 4), Number(letivo?.bimestresLancados || 0) + 1);

/** 'fechado' (já lançado, só consulta), 'aberto' (em andamento) ou 'bloqueado' (ainda não começou). */
export const estadoDoBimestre = (n, atual) => (n < atual ? 'fechado' : n === atual ? 'aberto' : 'bloqueado');

/** { numero, inicio, fim } do bimestre (data/letivo.json, campo bimestres) ou null. */
export const periodoDoBimestre = (letivo, n) => (letivo?.bimestres || []).find((b) => Number(b.numero) === Number(n)) || null;

/** Dia da semana da data (AAAA-MM-DD) como na grade: 'seg' a 'sex' (fim de semana: 'sab'/'dom'). */
export const diaDaSemana = (iso) => DIAS[new Date(`${iso}T12:00:00`).getDay()];

/**
 * Aulas do componente na turma num dia, pela grade de horários (data/horarios.json).
 * @returns {{quantas: number, posicoes: number[]}} posicoes: 1ª, 2ª... aula do dia
 */
export function aulasNaGrade(horarios, turmaId, componente, iso) {
  const grade = (horarios || []).find((h) => h.turmaId === turmaId);
  const doDia = grade?.aulas?.[diaDaSemana(iso)] || [];
  const posicoes = doDia.map((a, i) => (a?.componente === componente ? i + 1 : 0)).filter(Boolean);
  return { quantas: posicoes.length, posicoes };
}

/**
 * Frequência de um estudante num período, a partir das chamadas registradas (a trilha do registro de aula).
 * Cada chamada vale o número de aulas do dia (chamadas antigas, sem esse dado, valem 1 aula).
 * @returns {{aulas: number, faltas: number, percentual: number|null}} percentual null quando não há aula com chamada
 */
export function frequenciaNoPeriodo(chamadas, turmaId, alunoId, periodo) {
  let aulas = 0, faltas = 0;
  for (const [data, c] of Object.entries(chamadas?.[turmaId] || {})) {
    if (periodo && (data < periodo.inicio || data > periodo.fim)) continue;
    const n = Number(c.aulas) || 1;
    aulas += n;
    if (c.ausentes?.includes(alunoId)) faltas += n;
  }
  return { aulas, faltas, percentual: aulas ? Math.round(((aulas - faltas) / aulas) * 1000) / 10 : null };
}

/** Presença como nota de 0 a 10: 92% vira 9,2. Sem aula com chamada no bimestre, a presença conta 10. */
export const notaDePresenca = (percentual) => (percentual === null || percentual === undefined ? 10 : arred1(Math.max(0, Math.min(100, percentual)) / 10));

/** Média do bimestre (1 casa). Precisa da prova e da atividade; a presença vem da chamada. */
export function mediaDoBimestre({ prova, atividade, presenca }) {
  if (!lancada(prova) || !lancada(atividade)) return null;
  return arred1(Number(prova) * PESOS.prova + Number(atividade) * PESOS.atividade + Number(presenca ?? 10) * PESOS.presenca);
}

/** Nota digitada ("7,5", "10") → número, ou a mensagem de erro. Vazio volta null (ainda não lançada). */
export function lerNota(texto) {
  const t = String(texto ?? '').trim();
  if (!t) return { valor: null, erro: '' };
  const v = Number(t.replace(',', '.'));
  if (Number.isNaN(v) || v < 0 || v > 10) return { valor: null, erro: 'Use uma nota de 0 a 10, como 7,5.' };
  return { valor: arred1(v), erro: '' };
}

/** Notas dos 4 bimestres de um estudante do diário: [n1, n2, n3, n4]. */
export const notasDoAluno = (a) => [a?.n1 ?? null, a?.n2 ?? null, a?.n3 ?? null, a?.n4 ?? null];

/**
 * Lança a prova e a atividade do bimestre aberto e recalcula a média do bimestre (campo n1 a n4, que o boletim usa).
 * Não altera o estudante recebido.
 */
export function lancarBimestre(aluno, bimestre, { prova, atividade }, presencaNota) {
  const partes = { ...(aluno.partes || {}), [bimestre]: { prova, atividade } };
  return { ...aluno, partes, [`n${bimestre}`]: mediaDoBimestre({ prova, atividade, presenca: presencaNota }) };
}

/**
 * Chamada do dia: grava quem faltou e quantas aulas valem, e soma as faltas no diário. Se a data já tem chamada, nada muda.
 * @returns {{chamadas: object, diario: object[], nova: boolean}} cópias
 */
export function aplicarChamada({ chamadas, alunos, turmaId, data, ausentes, aulas, componente, quando, registroId = null }) {
  if (chamadas?.[turmaId]?.[data]) return { chamadas, diario: alunos, nova: false };
  const n = Math.max(1, Number(aulas) || 1);
  return {
    chamadas: { ...chamadas, [turmaId]: { ...(chamadas?.[turmaId] || {}), [data]: { ausentes: [...ausentes], aulas: n, componente, quando, ...(registroId ? { registroId } : {}) } } },
    diario: alunos.map((a) => (ausentes.includes(a.id) ? { ...a, faltas: (a.faltas || 0) + n } : a)),
    nova: true
  };
}

// ───── Lançamento de notas (aba Notas do professor) ─────
// Cada parte (prova, atividade) é lançada UMA vez: depois de lançada, fica travada e não muda mais.
// A média do bimestre acompanha a presença, que continua vindo da chamada (por isso é recalculada quando a chamada muda).

/** A parte (prova ou atividade) do bimestre já foi lançada (e está travada)? */
export const parteLancada = (aluno, bimestre, campo) => lancada(aluno?.partes?.[bimestre]?.[campo]);

/**
 * Lança as partes ainda abertas de um estudante no bimestre. Partes já lançadas não mudam.
 * @param {{prova?: number|null, atividade?: number|null}} valores null ou ausente = não lançar agora
 * @returns {{aluno: object, lancou: string[], erro: string}} cópia do estudante; erro se tentou mudar uma parte travada
 */
export function lancarNotas(aluno, bimestre, valores, presencaNota, quando) {
  const atual = { ...(aluno.partes?.[bimestre] || {}) };
  const lancou = [];
  for (const [campo, rotulo] of PARTES) {
    const v = valores?.[campo];
    if (!lancada(v)) continue;
    if (lancada(atual[campo])) {
      if (Number(atual[campo]) !== Number(v)) return { aluno, lancou: [], erro: `${rotulo} do ${bimestre}º bimestre já foi lançada e não pode ser alterada.` };
      continue;
    }
    atual[campo] = Number(v);
    atual.em = { ...(atual.em || {}), [campo]: quando };
    lancou.push(campo);
  }
  if (!lancou.length) return { aluno, lancou, erro: '' };
  const partes = { ...(aluno.partes || {}), [bimestre]: atual };
  return { aluno: { ...aluno, partes, [`n${bimestre}`]: mediaDoBimestre({ ...atual, presenca: presencaNota }) }, lancou, erro: '' };
}

/** Recalcula a média do bimestre de cada estudante com prova e atividade lançadas, pela frequência atual. Devolve cópias. */
export function atualizarMedias(alunos, chamadas, turmaId, letivo, bimestre = bimestreAtual(letivo)) {
  const per = periodoDoBimestre(letivo, bimestre);
  return alunos.map((a) => {
    const p = a.partes?.[bimestre];
    if (!p || !lancada(p.prova) || !lancada(p.atividade)) return a;
    const pres = notaDePresenca(frequenciaNoPeriodo(chamadas, turmaId, a.id, per).percentual);
    return { ...a, [`n${bimestre}`]: mediaDoBimestre({ prova: p.prova, atividade: p.atividade, presenca: pres }) };
  });
}

// ───── Retirada de falta ─────
// A falta só sai com um motivo da lista (sem digitação). A data e o motivo ficam registrados na chamada.
// Atestado médico não é retirada: é abono, e quem registra é a secretaria (a falta continua na trilha).
export const MOTIVOS_RETIRADA = [
  ['erro-chamada', 'Estava presente: erro na chamada'],
  ['atraso', 'Chegou atrasado e assistiu à aula'],
  ['atividade-escola', 'Em atividade da escola fora da sala'],
  ['representando', 'Representando a escola (jogos, olimpíada, evento)']
];
export const textoDoMotivo = (chave) => MOTIVOS_RETIRADA.find(([k]) => k === chave)?.[1] || '';

/** Datas em que o estudante faltou no período, da mais recente para a mais antiga: [{data, aulas}]. */
export function faltasDoEstudante(chamadas, turmaId, alunoId, periodo) {
  return Object.entries(chamadas?.[turmaId] || {})
    .filter(([d, c]) => (!periodo || (d >= periodo.inicio && d <= periodo.fim)) && c.ausentes?.includes(alunoId))
    .map(([data, c]) => ({ data, aulas: Number(c.aulas) || 1 }))
    .sort((x, y) => y.data.localeCompare(x.data));
}

/**
 * Retira a falta de um estudante numa data, com motivo da lista. Devolve cópias de chamadas e do diário da turma.
 * @returns {{chamadas: object, diario: object[], erro: string}}
 */
export function retirarFalta({ chamadas, alunos, turmaId, data, alunoId, motivo, quando, por }) {
  const c = chamadas?.[turmaId]?.[data];
  if (!c || !c.ausentes?.includes(alunoId)) return { chamadas, diario: alunos, erro: 'Não há falta deste estudante nessa data.' };
  if (!textoDoMotivo(motivo)) return { chamadas, diario: alunos, erro: 'Escolha o motivo da retirada.' };
  const n = Number(c.aulas) || 1;
  const nova = { ...c, ausentes: c.ausentes.filter((id) => id !== alunoId), retiradas: [...(c.retiradas || []), { alunoId, motivo, quando, por }] };
  return {
    chamadas: { ...chamadas, [turmaId]: { ...chamadas[turmaId], [data]: nova } },
    diario: alunos.map((a) => (a.id === alunoId ? { ...a, faltas: Math.max(0, (a.faltas || 0) - n) } : a)),
    erro: ''
  };
}
