// Domínio: PROFIN, prestação de contas por escola e categoria de recurso.
// Situação de cada prestação (sempre com cor, símbolo e texto):
//  - entregue                          → verde  "Prestação entregue"
//  - não entregue, prazo vencido       → vermelho "Atrasada há N dias" (o repasse seguinte pode ser suspenso)
//  - não entregue, vence em até 30 dias → amarelo "Vence em N dias"
//  - não entregue, prazo mais longe     → verde  "No prazo"
import { diasEntre } from './painel.js';

export const DIAS_DE_ALERTA = 30;
const NIVEL = { verde: { chave: 'verde', tipo: 'ok', icone: 'ok' }, amarelo: { chave: 'amarelo', tipo: 'atencao', icone: 'alerta' }, vermelho: { chave: 'vermelho', tipo: 'erro', icone: 'fechar' }, neutro: { chave: 'neutro', tipo: 'neutra', icone: '' } };
const GRAVIDADE = { verde: 0, neutro: 0, amarelo: 1, vermelho: 2 };

/** @returns {{chave: string, tipo: string, icone: string, texto: string, dias: number}} */
export function situacaoDaPrestacao(repasse, hoje) {
  const { prazo, entregue } = repasse.prestacao;
  const dias = diasEntre(hoje, prazo);
  if (repasse.recebido === 0) return { ...NIVEL.neutro, texto: 'Sem repasse neste ano', dias };
  if (entregue) return { ...NIVEL.verde, texto: 'Prestação entregue', dias };
  if (dias < 0) return { ...NIVEL.vermelho, texto: `Atrasada há ${-dias} ${-dias === 1 ? 'dia' : 'dias'}`, dias };
  if (dias <= DIAS_DE_ALERTA) return { ...NIVEL.amarelo, texto: `Vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}`, dias };
  return { ...NIVEL.verde, texto: `No prazo, vence em ${dias} dias`, dias };
}

/** Pior situação entre as prestações da escola: é ela que decide se o repasse seguinte está seguro. */
export function adimplenciaDaEscola(repasses, hoje) {
  const itens = repasses.map((r) => ({ r, s: situacaoDaPrestacao(r, hoje) }));
  const pior = itens.reduce((a, b) => (GRAVIDADE[b.s.chave] > GRAVIDADE[a.s.chave] ? b : a), itens[0]);
  const atrasadas = itens.filter((i) => i.s.chave === 'vermelho');
  const aVencer = itens.filter((i) => i.s.chave === 'amarelo');
  const texto = atrasadas.length ? `${atrasadas.length} ${atrasadas.length === 1 ? 'prestação atrasada' : 'prestações atrasadas'}: o próximo repasse pode ser suspenso`
    : aVencer.length ? `${aVencer.length} ${aVencer.length === 1 ? 'prestação vence' : 'prestações vencem'} em até ${DIAS_DE_ALERTA} dias` : 'Prestação de contas em dia';
  return { ...NIVEL[pior.s.chave === 'neutro' ? 'verde' : pior.s.chave], texto, atrasadas, aVencer };
}

export const saldo = (r) => Math.round((r.recebido - r.executado) * 100) / 100;
/** Percentual executado do que foi recebido (0 quando não houve repasse). */
export const percentualExecutado = (r) => (r.recebido > 0 ? Math.round((r.executado / r.recebido) * 1000) / 10 : 0);
export const reais = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Rascunho de relatório consolidado: texto montado por modelo fixo a partir dos números do painel e das anotações de contexto.
 * Não usa inteligência artificial: quem revisa e conclui é a pessoa.
 * @param {{escolas: Array<{id: string, nome: string, municipio: string}>, repasses: Array<object>, notas?: Record<string, Array<{quando: string, por: string, texto: string}>>, hoje: string, categorias?: string[]}} d
 */
export function rascunhoDoRelatorio({ escolas, repasses, notas = {}, hoje, categorias }) {
  const br = (iso) => iso.split('-').reverse().join('/');
  const filtro = (r) => !categorias || categorias.includes(r.categoria);
  const doEscopo = repasses.filter(filtro);
  const ids = escolas.map((e) => e.id).filter((id) => doEscopo.some((r) => r.escolaId === id));
  const recebido = doEscopo.reduce((n, r) => n + r.recebido, 0);
  const executado = doEscopo.reduce((n, r) => n + r.executado, 0);
  const situacoes = doEscopo.map((r) => ({ r, s: situacaoDaPrestacao(r, hoje) }));
  const atrasadas = situacoes.filter((x) => x.s.chave === 'vermelho');
  const aVencer = situacoes.filter((x) => x.s.chave === 'amarelo');
  const nomeDe = (id) => escolas.find((e) => e.id === id)?.nome || id;
  const L = [];
  L.push('RELATÓRIO CONSOLIDADO DE PRESTAÇÃO DE CONTAS — PROFIN', `Data de referência: ${br(hoje)}`, 'Rascunho montado a partir do painel do PROFIN. Revise os números e escreva as conclusões antes de usar.', '');
  L.push('1. RESUMO', `- Escolas incluídas: ${ids.length}`, `- Total recebido: ${reais(recebido)}`, `- Total executado: ${reais(executado)} (${recebido ? (Math.round((executado / recebido) * 1000) / 10).toLocaleString('pt-BR') : '0'}% do recebido)`, `- Prestações de contas atrasadas: ${atrasadas.length}`, `- Prestações que vencem em até ${DIAS_DE_ALERTA} dias: ${aVencer.length}`, '');
  L.push('2. SITUAÇÃO POR ESCOLA');
  ids.forEach((id, i) => {
    const doIdRepasses = doEscopo.filter((r) => r.escolaId === id);
    const adim = adimplenciaDaEscola(doIdRepasses, hoje);
    L.push('', `2.${i + 1} ${nomeDe(id)} (${escolas.find((e) => e.id === id)?.municipio})`, `Situação geral: ${adim.texto}.`);
    doIdRepasses.forEach((r) => {
      const s = situacaoDaPrestacao(r, hoje);
      L.push(r.recebido === 0 ? `- ${r.categoria}: sem repasse neste ano.` : `- ${r.categoria}: recebido ${reais(r.recebido)}; executado ${reais(r.executado)} (${percentualExecutado(r).toLocaleString('pt-BR')}%); saldo ${reais(saldo(r))}. Prestação: ${s.texto.toLowerCase()} (prazo ${br(r.prestacao.prazo)}).`);
      (notas[`${id}|${r.categoria}`] || []).forEach((n) => L.push(`    Contexto (${n.por}, ${br(n.quando)}): ${n.texto}`));
    });
    (notas[`${id}|Geral`] || []).forEach((n) => L.push(`  Contexto geral (${n.por}, ${br(n.quando)}): ${n.texto}`));
  });
  L.push('', '3. PENDÊNCIAS');
  if (!atrasadas.length && !aVencer.length) L.push('Nenhuma prestação atrasada ou perto do vencimento.');
  atrasadas.forEach(({ r, s }) => L.push(`- ATRASADA: ${nomeDe(r.escolaId)}, ${r.categoria} (${s.texto.toLowerCase()}, prazo ${br(r.prestacao.prazo)}). O próximo repasse pode ser suspenso.`));
  aVencer.forEach(({ r, s }) => L.push(`- A vencer: ${nomeDe(r.escolaId)}, ${r.categoria} (${s.texto.toLowerCase()}, prazo ${br(r.prestacao.prazo)}).`));
  L.push('', '4. CONCLUSÕES E ENCAMINHAMENTOS', '[Escreva aqui as conclusões e os encaminhamentos.]');
  return L.join('\n');
}
