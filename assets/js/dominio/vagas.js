// Domínio: vagas calculadas a partir das turmas (ninguém digita o número de vagas).
// Vaga = lugar livre numa turma aprovada: capacidade da sala − alunos matriculados − alunos já enturmados.
// Depois, cada pedido de matrícula ainda sem turma segura uma vaga da série (aguardando confirmação ou confirmado e não enturmado).
// Funções puras, sem tela, testadas em tools/testar-cadastros.mjs.
import { atoDaEtapa, situacaoAto } from './matricula.js';

export const TURNOS = ['Manhã', 'Tarde', 'Noite'];

/** Lugares livres de uma turma aprovada (nunca negativo). */
export function lugaresLivres(turma, enturmacao = {}) {
  if (turma.situacao !== 'Aprovada') return 0;
  const enturmados = Object.values(enturmacao).filter((id) => id === turma.id).length;
  return Math.max(0, (turma.capacidade || 0) - (turma.matriculados || 0) - enturmados);
}

/** O pedido segura uma vaga da série: matrícula nova ou transferência ainda sem turma. Rematrícula não usa vaga nova. */
export function pedidoSeguraVaga(pedido, enturmacao = {}) {
  if (pedido.tipo === 'Rematrícula') return false;
  if (pedido.situacao === 'Aguardando confirmação') return true;
  return pedido.situacao === 'Confirmada' && !enturmacao[pedido.protocolo];
}

/**
 * Vagas de cada escola e série, separadas por turno.
 * @param {{turmas: object[], pedidos?: object[], enturmacao?: Record<string,string>, atos?: object[], hoje?: string}} p
 *   atos (opcional): sem ato vigente para a série, a série fica sem vaga (bloqueada).
 * @returns {Record<string, Record<string, {lugares: number, porTurno: Record<string, number>, aguardando: number, aguardandoTurma: number, vagas: number, oferta: number, excesso: number, turmas: object[]}>>}
 *   lugares: soma dos lugares livres nas turmas; aguardando: pedidos aguardando confirmação; aguardandoTurma: confirmados sem turma;
 *   vagas: o que ainda pode ser oferecido a um pedido novo; oferta: vagas sem descontar os pedidos aguardando (usada no mapa,
 *   que soma esses pedidos na procura); excesso: quantos pedidos passam dos lugares livres.
 */
export function calcularVagas({ turmas, pedidos = [], enturmacao = {}, atos = null, hoje }) {
  const r = {};
  const celula = (escolaId, serie) => {
    r[escolaId] ??= {};
    return (r[escolaId][serie] ??= { lugares: 0, porTurno: {}, aguardando: 0, aguardandoTurma: 0, vagas: 0, oferta: 0, excesso: 0, turmas: [] });
  };
  for (const t of turmas) {
    if (t.situacao !== 'Aprovada' || !t.serie) continue;
    const c = celula(t.escolaId, t.serie);
    const livres = lugaresLivres(t, enturmacao);
    c.lugares += livres;
    c.porTurno[t.turno] = (c.porTurno[t.turno] || 0) + livres;
    c.turmas.push({ id: t.id, nome: t.nome, turno: t.turno, capacidade: t.capacidade || 0, ocupados: (t.capacidade || 0) - livres, livres });
  }
  for (const p of pedidos) {
    if (!pedidoSeguraVaga(p, enturmacao) || !p.escolaId || !p.serie) continue;
    const c = celula(p.escolaId, p.serie);
    if (p.situacao === 'Aguardando confirmação') c.aguardando += 1; else c.aguardandoTurma += 1;
  }
  for (const [escolaId, series] of Object.entries(r)) {
    for (const [serie, c] of Object.entries(series)) {
      const ato = atos ? atoDaEtapa(atos, escolaId, serie) : true;
      const liberada = ato === true || (ato && situacaoAto(ato, hoje).vigente);
      const usados = c.aguardando + c.aguardandoTurma;
      c.excesso = Math.max(0, usados - c.lugares);
      c.vagas = liberada ? Math.max(0, c.lugares - usados) : 0;
      c.oferta = liberada ? Math.max(0, c.lugares - c.aguardandoTurma) : 0;
      c.bloqueada = !liberada;
    }
  }
  return r;
}

/** Só o número de vagas por escola e série ({ e1: { '6º ano': 3 } }), o formato que as telas de matrícula usam. */
export const vagasPorSerie = (detalhe) => Object.fromEntries(Object.entries(detalhe).map(([escolaId, series]) => [escolaId, Object.fromEntries(Object.entries(series).map(([s, c]) => [s, c.vagas]))]));

/** "Manhã 1 · Tarde 7" (só os turnos que têm turma). */
export const textoPorTurno = (porTurno) => TURNOS.filter((t) => porTurno[t] !== undefined).map((t) => `${t} ${porTurno[t]}`).join(' · ');

/**
 * Turma aberta pela rede para uma escola (quadro de oferta). As vagas da escola nascem dessas turmas.
 * @param {object} f serie, turno, nome, capacidade
 * @param {{series: string[], turmas: object[], escolaId: string}} ctx series: as séries que o ato da escola libera
 */
export function validarTurmaNova(f, { series, turmas, escolaId }) {
  const e = {};
  if (!series.includes(f.serie)) e.serie = 'Escolha uma série que o ato da escola libera.';
  if (!TURNOS.includes(f.turno)) e.turno = 'Escolha o turno.';
  const nome = String(f.nome ?? '').trim();
  if (nome.length < 3) e.nome = 'Escreva o nome da turma, como 6º ano A.';
  else if (turmas.some((t) => t.escolaId === escolaId && t.nome.toLowerCase() === nome.toLowerCase() && t.turno === f.turno)) e.nome = 'Já existe uma turma com esse nome neste turno.';
  const c = Number(f.capacidade);
  if (!Number.isInteger(c) || c < 10 || c > 60) e.capacidade = 'Lugares na sala: um número de 10 a 60.';
  return { ok: !Object.keys(e).length, erros: e };
}
export const montarTurmaNova = (f, { escolaId, hoje, por }) => ({
  id: `rn${Date.now().toString(36)}`, nome: String(f.nome).trim(), serie: f.serie, turno: f.turno, escolaId, situacao: 'Aprovada', matriculados: 0, capacidade: Number(f.capacidade), abertaPelaRede: true, abertaEm: hoje, abertaPor: por
});
