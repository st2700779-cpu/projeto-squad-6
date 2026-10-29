// Domínio: indicadores dos painéis (semáforo, margem de faltas, nota necessária, prazos, agenda, selos e faixa etária).
// Funções puras, sem acesso a tela nem armazenamento. As regras de aprovação continuam em notas.js.
//
// Semáforo (sempre mostrado com cor, símbolo e palavra):
//  - Nota (média na matéria):  verde 6,0 ou mais · amarelo de 4,0 a 5,9 · vermelho abaixo de 4,0.
//  - Frequência:               verde 85% ou mais · amarelo de 75% a menos de 85% · vermelho abaixo de 75%.
//  - Prazo (dias que faltam):  vermelho vencido ou até 3 dias · amarelo de 4 a 14 dias · verde mais de 14 dias.
import { MEDIA_APROVACAO, MEDIA_RECUPERACAO, PRESENCA_MINIMA, media, presenca, situacao } from './notas.js';

export const FREQUENCIA_BOA = 85;
const NIVEIS = {
  verde: { chave: 'verde', tipo: 'ok', icone: 'ok' },
  amarelo: { chave: 'amarelo', tipo: 'atencao', icone: 'alerta' },
  vermelho: { chave: 'vermelho', tipo: 'erro', icone: 'fechar' },
  neutro: { chave: 'neutro', tipo: 'neutra', icone: '' }
};
const nivel = (chave, texto, fala = texto) => ({ ...NIVEIS[chave], texto, fala });

/** @param {number|null} mediaMateria @returns {{chave: string, tipo: string, icone: string, texto: string, fala: string}} */
export function semaforoNota(mediaMateria) {
  if (mediaMateria === null || mediaMateria === undefined) return nivel('neutro', 'Sem nota', 'ainda sem nota');
  if (mediaMateria >= MEDIA_APROVACAO) return nivel('verde', 'Boa', 'nota boa');
  if (mediaMateria >= MEDIA_RECUPERACAO) return nivel('amarelo', 'Atenção', 'nota pede atenção');
  return nivel('vermelho', 'Em risco', 'nota em risco');
}
/** @param {number} pct Frequência em %. */
export function semaforoFrequencia(pct) {
  if (pct >= FREQUENCIA_BOA) return nivel('verde', 'Boa', 'frequência boa');
  if (pct >= PRESENCA_MINIMA) return nivel('amarelo', 'Atenção', 'frequência pede atenção');
  return nivel('vermelho', 'Abaixo do mínimo', 'frequência abaixo do mínimo');
}

/** Dias inteiros de uma data ISO (AAAA-MM-DD) até outra. Negativo quando a segunda já passou. */
const utc = (iso) => { const [a, m, d] = iso.split('-').map(Number); return Date.UTC(a, m - 1, d); };
export const diasEntre = (de, ate) => Math.round((utc(ate) - utc(de)) / 86400000);

/** Texto curto do prazo: "Vence amanhã", "Atrasado há 2 dias". */
export function rotuloDoPrazo(dias) {
  if (dias < 0) return `Atrasado há ${-dias} ${-dias === 1 ? 'dia' : 'dias'}`;
  if (dias === 0) return 'Vence hoje';
  if (dias === 1) return 'Vence amanhã';
  return `Vence em ${dias} dias`;
}
export function semaforoPrazo(dias) {
  const texto = rotuloDoPrazo(dias);
  if (dias <= 3) return nivel('vermelho', texto);
  if (dias <= 14) return nivel('amarelo', texto);
  return nivel('verde', texto);
}

// ---------- Frequência proativa ----------

/** Quantas faltas cabem até chegar aos 75% (com as aulas dadas até agora). */
export const limiteDeFaltas = (aulasDadas) => Math.floor((aulasDadas * (100 - PRESENCA_MINIMA)) / 100);

/**
 * Margem de segurança: quantas faltas ainda restam antes de comprometer a aprovação por frequência.
 * @returns {{limite: number, faltas: number, restantes: number, estado: 'folga'|'no-limite'|'acima'}}
 */
export function margemDeFaltas(faltas, aulasDadas) {
  const limite = limiteDeFaltas(aulasDadas);
  const restantes = limite - faltas;
  return { limite, faltas, restantes, estado: restantes > 0 ? 'folga' : restantes === 0 ? 'no-limite' : 'acima' };
}

/** Frase neutra sobre a margem (sem metáfora de jogo). */
export function fraseDaMargem(m) {
  const plural = (n, a, b) => (n === 1 ? a : b);
  if (m.estado === 'folga') return `Ainda é possível faltar a ${m.restantes} ${plural(m.restantes, 'aula', 'aulas')} sem comprometer a aprovação por frequência.`;
  if (m.estado === 'no-limite') return 'A frequência está no limite: mais uma falta compromete a aprovação por frequência.';
  const a = -m.restantes;
  return `A frequência já está abaixo do mínimo, ${a} ${plural(a, 'falta', 'faltas')} além do limite. Procure a secretaria para saber como recuperar.`;
}

/**
 * Situação da frequência depois de faltar `n` aulas (as aulas também contam como dadas).
 * @returns {{faltas: number, aulasDadas: number, presenca: number, margem: object, semaforo: object}}
 */
export function simularFaltas(faltas, aulasDadas, n = 1) {
  const f = faltas + n;
  const a = aulasDadas + n;
  const p = presenca(f, a);
  return { faltas: f, aulasDadas: a, presenca: p, margem: margemDeFaltas(f, a), semaforo: semaforoFrequencia(p) };
}

// ---------- Quanto preciso tirar ----------

const preenchida = (n) => n !== null && n !== undefined && n !== '' && !Number.isNaN(Number(n));

/**
 * Calculadora "Quanto preciso tirar". A média do ano é a média dos bimestres; os que estão em branco ainda vão acontecer.
 * @param {Array<number|null|string>} notas Uma posição por bimestre (em branco = ainda não tem nota).
 * @param {number} [meta] Média que a pessoa quer fechar.
 * @returns {{estado: 'completo'|'ja-alcancada'|'possivel'|'impossivel', restantes: number, media: number|null, precisa: number|null, precisaRecuperacao: number|null}}
 *   `precisa`: média necessária em cada bimestre que falta para chegar à meta; `precisaRecuperacao`: o mesmo para a média 4,0.
 */
export function notaNecessaria(notas, meta = MEDIA_APROVACAO) {
  const total = notas.length;
  const valores = notas.filter(preenchida).map(Number);
  const soma = valores.reduce((s, n) => s + n, 0);
  const restantes = total - valores.length;
  if (restantes === 0) return { estado: 'completo', restantes, media: Math.round((soma / total) * 10) / 10, precisa: null, precisaRecuperacao: null };
  const exigida = (m) => Math.ceil(((m * total - soma) / restantes) * 10 - 1e-9) / 10;
  const precisa = Math.max(0, exigida(meta));
  const precisaRecuperacao = Math.max(0, exigida(MEDIA_RECUPERACAO));
  const estado = precisa <= 0 ? 'ja-alcancada' : precisa > 10 ? 'impossivel' : 'possivel';
  return { estado, restantes, media: null, precisa, precisaRecuperacao: precisaRecuperacao > 10 ? null : precisaRecuperacao };
}

// ---------- Agenda por urgência ----------

const GRUPOS = [
  [(d) => d < 0, 'Atrasado', 0], [(d) => d === 0, 'Hoje', 1], [(d) => d === 1, 'Amanhã', 2],
  [(d) => d <= 7, 'Esta semana', 3], [() => true, 'Mais adiante', 4]
];
export const TIPOS_DA_AGENDA = { prova: 'Prova', trabalho: 'Trabalho', entrega: 'Entrega' };

/**
 * Agenda única do estudante: provas, trabalhos e entregas de todas as matérias, da mais urgente para a menos.
 * @param {{serie: string, agenda: Array<object>, hoje: string, feitos?: string[]}} p
 * @returns {{aFazer: Array<object>, feitos: Array<object>}} Cada item ganha `dias`, `grupo`, `semaforo`.
 */
export function montarAgenda({ serie, agenda, hoje, feitos = [] }) {
  const itens = agenda.filter((a) => a.serie === serie).map((a) => {
    const dias = diasEntre(hoje, a.data);
    const [, grupo, ordem] = GRUPOS.find(([ok]) => ok(dias));
    return { ...a, dias, grupo, ordem, feito: feitos.includes(a.id), semaforo: semaforoPrazo(dias) };
  });
  const ordenar = (x, y) => x.data.localeCompare(y.data) || (x.hora || '').localeCompare(y.hora || '');
  return { aFazer: itens.filter((i) => !i.feito).sort(ordenar), feitos: itens.filter((i) => i.feito).sort(ordenar) };
}

/** A prova mais próxima (hoje ou depois) para o modo Dia de Prova. */
export const proximaProva = (aFazer) => aFazer.filter((i) => i.tipo === 'prova' && i.dias >= 0).sort((a, b) => a.data.localeCompare(b.data) || (a.hora || '').localeCompare(b.hora || ''))[0] || null;

// ---------- Faixa etária ----------

export const FAIXAS = {
  iniciais: 'Anos iniciais (1º ao 5º ano)',
  finais: 'Anos finais (6º ao 9º ano)',
  medio: 'Ensino Médio'
};
/** "3º ano" → "iniciais"; "7º ano" → "finais"; "1ª série EM" → "medio". */
export function faixaDaSerie(serie) {
  const m = /^(\d)º ano$/.exec(serie || '');
  if (m) return Number(m[1]) <= 5 ? 'iniciais' : 'finais';
  return 'medio';
}

// ---------- Selos (conquistas estáticas, sem placar nem backend) ----------

/**
 * @param {{linhas: Array<{materia: string, n1: number|null, n2: number|null, media: number|null}>, presenca: number, tentativasDoQuiz: Array<{certas: number, total: number}>}} d
 * @returns {Array<{id: string, nome: string, conquistado: boolean, como: string}>}
 */
export function selosDoEstudante({ linhas, presenca: pct, tentativasDoQuiz = [] }) {
  const notas = linhas.flatMap((l) => [l.n1, l.n2]).filter(preenchida).map(Number);
  const comMedia = linhas.filter((l) => l.media !== null);
  return [
    { id: 'nota-10', nome: 'Primeira nota 10', conquistado: notas.some((n) => n >= 10), como: 'Tirar 10 em qualquer prova.' },
    { id: 'presenca', nome: 'Presença acima de 90%', conquistado: pct >= 90, como: 'Manter a frequência em 90% ou mais.' },
    { id: 'todas-na-media', nome: 'Todas as matérias na média', conquistado: comMedia.length > 0 && comMedia.every((l) => l.media >= MEDIA_APROVACAO), como: 'Fechar todas as matérias com média 6,0 ou mais.' },
    { id: 'subiu', nome: 'Nota que subiu', conquistado: linhas.some((l) => preenchida(l.n1) && preenchida(l.n2) && l.n2 - l.n1 >= 0.5), como: 'Melhorar em 0,5 ponto ou mais de um bimestre para o outro.' },
    { id: 'quiz', nome: 'Quiz concluído', conquistado: tentativasDoQuiz.length > 0, como: 'Terminar um quiz de qualquer matéria.' },
    { id: 'quiz-80', nome: 'Quiz com 80% de acertos', conquistado: tentativasDoQuiz.some((t) => t.total > 0 && t.certas / t.total >= 0.8), como: 'Acertar 80% ou mais em um quiz.' }
  ];
}

// ---------- Turma: mapa de calor e comparativo ----------

/**
 * Resumo de uma turma a partir do diário (professor.json: [{id, nome, n1, n2, faltas}]).
 * @returns {{alunos: number, frequenciaMedia: number, abaixo75: number, emRisco: number, mediaMatematica: number|null}}
 */
export function resumoDoDiario(alunos, aulasDadas) {
  if (!alunos.length) return { alunos: 0, frequenciaMedia: 100, abaixo75: 0, emRisco: 0, mediaMatematica: null };
  const linhas = alunos.map((a) => { const f = presenca(a.faltas, aulasDadas); const m = media(a.n1, a.n2); return { f, m, s: situacao(m, f) }; });
  const comNota = linhas.filter((l) => l.m !== null);
  return {
    alunos: alunos.length,
    frequenciaMedia: Math.round((linhas.reduce((s, l) => s + l.f, 0) / linhas.length) * 10) / 10,
    abaixo75: linhas.filter((l) => l.f < PRESENCA_MINIMA).length,
    emRisco: linhas.filter((l) => ['recuperacao', 'reprovado'].includes(l.s.chave)).length,
    mediaMatematica: comNota.length ? Math.round((comNota.reduce((s, l) => s + l.m, 0) / comNota.length) * 10) / 10 : null
  };
}

/**
 * Indicadores de uma turma: do diário quando existe (Matemática e frequência), com as demais matérias vindas da semente.
 * @param {{id: string, matriculados: number}} turma
 * @param {object[]|undefined} alunosDoDiario
 * @param {{alunos?: number, componentes?: object, frequencia?: number, abaixo75?: number, emRisco?: number}|undefined} semente
 */
export function desempenhoDaTurma(turma, alunosDoDiario, semente, aulasDadas) {
  const base = semente || { componentes: {} };
  if (alunosDoDiario?.length) {
    const r = resumoDoDiario(alunosDoDiario, aulasDadas);
    return { alunos: r.alunos, frequencia: r.frequenciaMedia, abaixo75: r.abaixo75, emRisco: r.emRisco, componentes: { ...base.componentes, ...(r.mediaMatematica === null ? {} : { 'Matemática': r.mediaMatematica }) }, doDiario: true };
  }
  return { alunos: base.alunos ?? turma.matriculados, frequencia: base.frequencia ?? null, abaixo75: base.abaixo75 ?? 0, emRisco: base.emRisco ?? 0, componentes: { ...base.componentes }, doDiario: false };
}

/** Média geral de uma turma entre as matérias que têm nota. */
export function mediaGeral(componentes) {
  const v = Object.values(componentes).filter(preenchida).map(Number);
  return v.length ? Math.round((v.reduce((s, n) => s + n, 0) / v.length) * 10) / 10 : null;
}

// ---------- Painel de prioridade do responsável ----------

const dataCurta = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const emDias = (dias) => (dias === 0 ? 'Hoje' : dias === 1 ? 'Amanhã' : `Em ${dias} dias`);

/**
 * "O que precisa da sua atenção": junta, numa lista só, a frequência, as notas, os documentos pendentes e as próximas datas.
 * Do mais grave para o menos grave; cada item leva nível (cor, símbolo e palavra), título e frase curta.
 * @param {{nome: string, presenca: number, margem: {restantes: number}, linhas: Array<{materia: string, media: number|null}>, documentos?: Array<{nome: string, situacao: string, prazo?: string}>, eventos?: Array<{inicio: string, titulo: string, tipo?: string}>, hoje: string}} d
 * @returns {Array<{ordem: number, nivel: object, titulo: string, texto: string, destino: 'frequencia'|'notas'|'documentos'|'calendario'}>}
 */
export function prioridades({ nome, presenca: pct, margem, linhas, documentos = [], eventos = [], hoje }) {
  const itens = [];
  const sf = semaforoFrequencia(pct);
  const pc = String(Math.round(pct * 10) / 10).replace('.', ',');
  if (sf.chave === 'vermelho') itens.push({ ordem: 0, nivel: sf, titulo: 'Frequência abaixo do mínimo', texto: `${nome} está com ${pc}% de presença. O mínimo é ${PRESENCA_MINIMA}%. Procure a escola.`, destino: 'frequencia' });
  else if (sf.chave === 'amarelo') itens.push({ ordem: 2, nivel: sf, titulo: 'Faltas perto do limite', texto: `${nome} está com ${pc}% de presença. Ainda pode faltar a ${Math.max(0, margem.restantes)} ${margem.restantes === 1 ? 'aula' : 'aulas'}.`, destino: 'frequencia' });
  const notas = linhas.filter((l) => l.media !== null && semaforoNota(l.media).chave !== 'verde').sort((a, b) => a.media - b.media);
  for (const l of notas.slice(0, 3)) {
    const n = semaforoNota(l.media);
    itens.push({ ordem: n.chave === 'vermelho' ? 1 : 3, nivel: n, titulo: `${l.materia}: nota ${n.chave === 'vermelho' ? 'em risco' : 'pede atenção'}`, texto: `A média é ${String(l.media).replace('.', ',')}. Para passar, precisa ser ${String(MEDIA_APROVACAO).replace('.', ',')} ou mais.`, destino: 'notas' });
  }
  if (notas.length > 3) itens.push({ ordem: 3.5, nivel: semaforoNota(5), titulo: `Mais ${notas.length - 3} ${notas.length - 3 === 1 ? 'matéria' : 'matérias'} com nota abaixo da média`, texto: 'Veja todas no boletim.', destino: 'notas' });
  for (const doc of documentos.filter((x) => x.situacao === 'pendente')) {
    const dias = doc.prazo ? diasEntre(hoje, doc.prazo) : 99;
    const n = semaforoPrazo(dias);
    itens.push({ ordem: n.chave === 'vermelho' ? 1 : n.chave === 'amarelo' ? 3 : 5, nivel: n, titulo: `Documento pendente: ${doc.nome}`, texto: doc.prazo ? `Entregar na secretaria até ${dataCurta(doc.prazo)}.` : 'Entregar na secretaria.', destino: 'documentos' });
  }
  const futuros = eventos.filter((e) => e.inicio >= hoje).sort((a, b) => a.inicio.localeCompare(b.inicio));
  const escolhidos = [futuros.find((e) => e.tipo === 'reuniao'), futuros.find((e) => e.tipo !== 'feriado')].filter(Boolean);
  for (const e of new Set(escolhidos)) {
    const dias = diasEntre(hoje, e.inicio);
    itens.push({ ordem: 6 + dias / 1000, nivel: { ...nivel('neutro', emDias(dias)), icone: 'calendario' }, titulo: e.titulo, texto: `Data: ${dataCurta(e.inicio)}.`, destino: 'calendario' });
  }
  return itens.sort((a, b) => a.ordem - b.ordem);
}
