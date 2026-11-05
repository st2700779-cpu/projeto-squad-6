// Domínio: estrutura da escola, gerenciada só pela direção (Direção › Estrutura da escola e Direção › Turmas).
//  - séries que a escola oferece (dentro dos níveis que o ato autorizativo libera);
//  - salas, com o número de lugares;
//  - turnos em que a escola funciona (Manhã, Tarde, Noite e Integral);
//  - turmas: série, turno, sala e vagas. As vagas da matrícula nascem daqui (ver dominio/vagas.js).
// Quem cadastra a escola (SEED/DRE) não cria turmas nem vagas. Funções puras, testadas em tools/testar-cadastros.mjs.
import { normalizar } from './texto.js';
import { ETAPAS } from './niveis.js';
import { seriesEscolhidas, seriesDaEtapa } from './cadastros.js';
import { situacaoAto } from './matricula.js';
import { TURNOS, turnosSeCruzam } from './vagas.js';

const resultado = (erros) => ({ ok: Object.keys(erros).length === 0, erros });
const igual = (a, b) => normalizar(a).replace(/\s+/g, ' ').trim() === normalizar(b).replace(/\s+/g, ' ').trim();
/** Turma que ainda existe (a turma apagada sai da lista; a encerrada, no futuro, também não conta). */
const ativa = (t) => t.situacao !== 'Encerrada';

// ---------------- Séries ----------------
/** Atos da escola, um por nível, na ordem dos níveis. */
export const atosDaEscola = (atos, escolaId) => ETAPAS.map((n) => atos.find((a) => a.escolaId === escolaId && a.etapa === n.etapa)).filter(Boolean);
/** Séries que a escola oferece hoje (todas as dos atos, vigentes ou não). */
export const seriesDaEscola = (atos, escolaId) => atosDaEscola(atos, escolaId).flatMap((a) => seriesEscolhidas(a.etapa, a.series));

/** Acrescentar série: tem de ser do nível do ato e ainda não oferecida. Devolve { ok, erros, ato } com o ato já atualizado. */
export function acrescentarSerie(ato, serie) {
  if (!ato) return { ...resultado({ serie: 'A escola não tem ato autorizativo nesse nível.' }), ato: null };
  const doNivel = seriesDaEtapa(ato.etapa);
  if (!doNivel.includes(serie)) return { ...resultado({ serie: 'Escolha uma série do nível liberado pelo ato.' }), ato };
  const atuais = seriesEscolhidas(ato.etapa, ato.series);
  if (atuais.includes(serie)) return { ...resultado({ serie: 'A escola já oferece essa série.' }), ato };
  return { ...resultado({}), ato: { ...ato, series: doNivel.filter((s) => s === serie || atuais.includes(s)) } };
}
/**
 * Tirar série: só sem turma nessa série e deixando pelo menos uma série no nível (para tirar o nível inteiro, a SEED muda o ato).
 * @returns {{ok: boolean, motivo: string, ato: object}}
 */
export function tirarSerie(ato, serie, turmasDaEscola) {
  const atuais = seriesEscolhidas(ato.etapa, ato.series);
  if (!atuais.includes(serie)) return { ok: false, motivo: 'A escola não oferece essa série.', ato };
  const n = turmasDaEscola.filter((t) => t.serie === serie && ativa(t)).length;
  if (n) return { ok: false, motivo: `${serie} tem ${n} ${n === 1 ? 'turma' : 'turmas'}. Apague ou mude as turmas antes de tirar a série.`, ato };
  if (atuais.length === 1) return { ok: false, motivo: `${serie} é a única série do nível. Para deixar de oferecer o nível, fale com a SEED (o ato autorizativo muda).`, ato };
  return { ok: true, motivo: '', ato: { ...ato, series: atuais.filter((s) => s !== serie) } };
}

// ---------------- Salas ----------------
export function validarSala(f, { salas, escolaId, id = null }) {
  const e = {};
  const nome = String(f.nome ?? '').trim();
  if (nome.length < 3) e.nome = 'Escreva o nome da sala, com pelo menos 3 letras. Exemplo: Bloco A, sala 01.';
  else if (nome.length > 60) e.nome = 'O nome tem no máximo 60 letras.';
  else if (salas.some((s) => s.escolaId === escolaId && s.id !== id && igual(s.nome, nome))) e.nome = 'Já existe uma sala com esse nome na escola.';
  const c = Number(f.capacidade);
  if (!Number.isInteger(c) || c < 5 || c > 80) e.capacidade = 'Lugares na sala: um número de 5 a 80.';
  return resultado(e);
}
export function montarSala(f, { salas, escolaId }) {
  const n = 1 + Math.max(0, ...salas.map((s) => Number(/^s(\d+)$/.exec(s.id)?.[1] || 0)));
  return { id: `s${n}`, escolaId, nome: String(f.nome).trim(), capacidade: Number(f.capacidade) };
}
/** Turmas que usam a sala. */
export const turmasDaSala = (sala, turmas) => turmas.filter((t) => t.salaId === sala.id && ativa(t));
/** Sala com turma não sai. Diminuir os lugares: nunca abaixo das vagas de uma turma que usa a sala. */
export function podeRemoverSala(sala, turmas) {
  const usam = turmasDaSala(sala, turmas);
  return usam.length ? { ok: false, motivo: `${sala.nome} é usada por ${usam.map((t) => `${t.nome} (${t.turno})`).join(', ')}. Mude a sala dessas turmas antes de apagar.` } : { ok: true, motivo: '' };
}
export function validarEdicaoDeSala(f, sala, { salas, turmas }) {
  const r = validarSala(f, { salas, escolaId: sala.escolaId, id: sala.id });
  const maior = Math.max(0, ...turmasDaSala(sala, turmas).map((t) => t.capacidade || 0));
  if (!r.erros.capacidade && Number(f.capacidade) < maior) r.erros.capacidade = `Uma turma desta sala tem ${maior} vagas. A sala precisa de pelo menos ${maior} lugares.`;
  return resultado(r.erros);
}

// ---------------- Turnos ----------------
/** Turnos da escola: os escolhidos pela direção; sem escolha registrada, os das turmas que ela já tem (ou manhã e tarde). */
export function turnosDaEscola(escola, turmasDaEscola = []) {
  if (Array.isArray(escola?.turnos) && escola.turnos.length) return TURNOS.filter((t) => escola.turnos.includes(t));
  const usados = TURNOS.filter((t) => turmasDaEscola.some((x) => x.turno === t && ativa(x)));
  return usados.length ? usados : ['Manhã', 'Tarde'];
}
/** Tirar um turno: só sem turma nele, e a escola fica com pelo menos um turno. */
export function podeTirarTurno(turno, { turnos, turmasDaEscola }) {
  if (!turnos.includes(turno)) return { ok: false, motivo: 'A escola não tem esse turno.' };
  const n = turmasDaEscola.filter((t) => t.turno === turno && ativa(t)).length;
  if (n) return { ok: false, motivo: `${n} ${n === 1 ? 'turma funciona' : 'turmas funcionam'} no turno ${turno.toLowerCase()}. Apague ou mude essas turmas antes de tirar o turno.` };
  if (turnos.length === 1) return { ok: false, motivo: 'A escola precisa de pelo menos um turno.' };
  return { ok: true, motivo: '' };
}
export const validarTurnoNovo = (turno, turnos) => (!TURNOS.includes(turno) ? resultado({ turno: 'Escolha um turno da lista.' }) : turnos.includes(turno) ? resultado({ turno: 'A escola já tem esse turno.' }) : resultado({}));

// ---------------- Turmas ----------------
const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
/** Nome sugerido: a série sem "EM" e a próxima letra livre ("1ª série D", "6º ano B"; na integral, "6º ano A — integral"). */
export function nomeSugerido(serie, turno, turmasDaEscola) {
  const base = String(serie || '').replace(/ EM$/, '');
  const usados = new Set(turmasDaEscola.filter((t) => t.serie === serie && ativa(t)).map((t) => normalizar(t.nome)));
  const letra = [...LETRAS].find((l) => !usados.has(normalizar(`${base} ${l}`)) && !usados.has(normalizar(`${base} ${l} — integral`))) || 'Z';
  return turno === 'Integral' ? `${base} ${letra} — integral` : `${base} ${letra}`;
}

/** Turma que já usa a sala no mesmo turno (a integral conta de manhã e de tarde). */
export const conflitoDeSala = (salaId, turno, turmasDaEscola, ignorarId = null) => turmasDaEscola.find((t) => t.id !== ignorarId && ativa(t) && t.salaId === salaId && turnosSeCruzam(t.turno, turno)) || null;

/**
 * Turma nova (ou edição de série/turno/sala/vagas), criada pela direção.
 * @param {object} f serie, turno, salaId, vagas, nome
 * @param {{escola: object, atos: object[], turmasDaEscola: object[], salas: object[], hoje: string, id?: string, ocupados?: number}} ctx
 *   id: a turma em edição; ocupados: estudantes já na turma (as vagas não podem ficar abaixo disso).
 */
export function validarTurma(f, { escola, atos, turmasDaEscola, salas, hoje, id = null, ocupados = 0 }) {
  const e = {};
  const oferecidas = seriesDaEscola(atos, escola.id);
  if (!oferecidas.includes(f.serie)) e.serie = 'Escolha uma série que a escola oferece.';
  else {
    const ato = atosDaEscola(atos, escola.id).find((a) => seriesEscolhidas(a.etapa, a.series).includes(f.serie));
    if (!situacaoAto(ato, hoje).vigente) e.serie = `A autorização de ${ato.etapa} (${ato.numero}) está vencida. Sem ato vigente, não dá para abrir turma nesse nível.`;
  }
  const turnos = turnosDaEscola(escola, turmasDaEscola);
  if (!TURNOS.includes(f.turno)) e.turno = 'Escolha o turno.';
  else if (!turnos.includes(f.turno)) e.turno = `A escola não funciona no turno ${String(f.turno).toLowerCase()}. Acrescente o turno em Estrutura da escola.`;
  const sala = salas.find((s) => s.id === f.salaId && s.escolaId === escola.id);
  if (!sala) e.salaId = 'Escolha a sala.';
  else if (!e.turno) {
    const outra = conflitoDeSala(sala.id, f.turno, turmasDaEscola, id);
    if (outra) e.salaId = `${sala.nome} já é da turma ${outra.nome} no turno ${outra.turno.toLowerCase()}. Escolha outra sala.`;
  }
  const v = Number(f.vagas);
  const minimo = Math.max(5, ocupados);
  if (!Number.isInteger(v) || v < 1) e.vagas = 'Vagas da turma: um número inteiro.';
  else if (sala && v > sala.capacidade) e.vagas = `${sala.nome} tem ${sala.capacidade} lugares: a turma pode ter no máximo ${sala.capacidade} vagas.`;
  else if (v < minimo) e.vagas = ocupados > 5 ? `A turma já tem ${ocupados} estudantes: as vagas não podem ser menos que isso.` : 'A turma precisa de pelo menos 5 vagas.';
  const nome = String(f.nome ?? '').trim();
  if (nome.length < 3) e.nome = 'Escreva o nome da turma, como 6º ano A.';
  else if (nome.length > 40) e.nome = 'O nome tem no máximo 40 letras.';
  else if (turmasDaEscola.some((t) => t.id !== id && ativa(t) && igual(t.nome, nome) && turnosSeCruzam(t.turno, f.turno))) e.nome = 'Já existe uma turma com esse nome neste turno.';
  return resultado(e);
}
export function montarTurma(f, { escolaId, salas, hoje, por = 'Direção' }) {
  const sala = salas.find((s) => s.id === f.salaId);
  return {
    id: `tt${Date.now().toString(36)}`, nome: String(f.nome).trim(), serie: f.serie, turno: f.turno, sala: sala.nome, salaId: sala.id,
    capacidade: Number(f.vagas), matriculados: 0, situacao: 'Aprovada', escolaId, criadaEm: hoje, historico: [[por, 'Criou a turma', `${Number(f.vagas)} vagas`]]
  };
}
/** Muda série, turno, sala, vagas e nome, e registra no histórico da turma o que mudou. */
export function aplicarEdicaoDeTurma(t, f, { salas, por = 'Direção' }) {
  const sala = salas.find((s) => s.id === f.salaId);
  const mudou = [
    t.nome !== String(f.nome).trim() && `nome: ${String(f.nome).trim()}`, t.serie !== f.serie && `série: ${f.serie}`, t.turno !== f.turno && `turno: ${f.turno}`,
    t.salaId !== sala.id && `sala: ${sala.nome}`, (t.capacidade || 0) !== Number(f.vagas) && `vagas: ${t.capacidade || 0} → ${Number(f.vagas)}`
  ].filter(Boolean);
  return { ...t, nome: String(f.nome).trim(), serie: f.serie, turno: f.turno, sala: sala.nome, salaId: sala.id, capacidade: Number(f.vagas), historico: [...(t.historico || []), [por, 'Alterou a turma', mudou.join('; ')]] };
}
/** Estudantes já na turma: matriculados mais os enturmados pela secretaria. */
export const ocupadosDaTurma = (t, enturmacao = {}) => (t.matriculados || 0) + Object.values(enturmacao).filter((id) => id === t.id).length;
/** Apagar turma: só sem estudante (matriculado ou enturmado). Os professores alocados e a grade de horário saem junto. */
export function podeApagarTurma(t, { enturmacao = {} } = {}) {
  const n = ocupadosDaTurma(t, enturmacao);
  return n ? { ok: false, motivo: `${t.nome} tem ${n} ${n === 1 ? 'estudante' : 'estudantes'}. Turma com estudante não pode ser apagada: transfira os estudantes antes.` } : { ok: true, motivo: '' };
}
/** Uma turma pendente (montada pela coordenação em rodadas anteriores) só é aprovada com série, sala e turno válidos. */
export const situacoesAbertas = ['Rascunho', 'Pendente de aprovação', 'Devolvida'];
