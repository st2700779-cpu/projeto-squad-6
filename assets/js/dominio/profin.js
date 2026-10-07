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
