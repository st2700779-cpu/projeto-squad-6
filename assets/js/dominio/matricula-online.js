// Domínio: o que a matrícula on-line do portal trouxe da Matrícula Online oficial da SEDUC/SE.
//  - calendário em fases (renovação, transferência interna, novos alunos) e matrícula contínua enquanto houver vaga;
//  - CPF do estudante obrigatório, sem pedido repetido para o mesmo CPF;
//  - lista oficial de documentos para levar à escola;
//  - comprovante do pedido e acompanhamento pelo protocolo e pela data de nascimento.
// O calendário e os documentos vêm de data/matricula-online.json. Funções puras, testadas em tools/testar-cadastros.mjs.
import { cpfValido, somenteDigitos } from './cadastros.js';

/** Pedidos que ainda valem (um CPF não pode ter dois ao mesmo tempo). */
export const PEDIDO_ATIVO = ['Aguardando confirmação', 'Confirmada'];

/** Período da rematrícula no calendário escolar (data/calendario.json): { inicio, fim, texto: "3 a 28 de novembro" } ou null. */
export function periodoDaRematricula(calendario) {
  const ev = (calendario || []).find((c) => /^Rematrícula/i.test(c.titulo) && c.inicio && c.fim);
  if (!ev) return null;
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const [, mi, di] = ev.inicio.split('-').map(Number); const [, mf, df] = ev.fim.split('-').map(Number);
  const texto = mi === mf ? `${di} a ${df} de ${MESES[mf - 1]}` : `${di} de ${MESES[mi - 1]} a ${df} de ${MESES[mf - 1]}`;
  return { inicio: ev.inicio, fim: ev.fim, texto, titulo: ev.titulo };
}

/** Fase do calendário em que a data cai: a fase (com o campo `agora`), ou { continua: true } fora das fases. */
export function faseDaMatricula(fases, hoje) {
  const f = (fases || []).find((x) => hoje >= x.inicio && hoje <= x.fim);
  return f ? { ...f, agora: true } : { continua: true };
}

/** Idade completa em anos numa data (AAAA-MM-DD). */
export function idadeEm(nascimento, hoje) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(nascimento)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(hoje))) return null;
  const [a, m, d] = nascimento.split('-').map(Number); const [ah, mh, dh] = hoje.split('-').map(Number);
  return ah - a - (mh < m || (mh === m && dh < d) ? 1 : 0);
}

/**
 * Documentos para levar à escola, conforme o pedido. quando: 'sempre', 'transferencia' (vem de outra escola) ou 'ate12' (até 12 anos).
 * @param {Array<{texto: string, quando: string}>} lista de data/matricula-online.json
 */
export function documentosDaMatricula(lista, { tipo, nascimento, hoje }) {
  const idade = idadeEm(nascimento, hoje);
  return (lista || []).filter((d) => d.quando === 'sempre' || (d.quando === 'transferencia' && tipo === 'transferencia') || (d.quando === 'ate12' && idade !== null && idade <= 12)).map((d) => d.texto);
}

/** CPF do estudante: obrigatório, válido e sem outro pedido ativo com o mesmo número. Devolve a mensagem de erro ou ''. */
export function erroDoCpfDoEstudante(cpf, { pedidos = [] } = {}) {
  const c = somenteDigitos(cpf);
  if (!c) return 'Informe o CPF do estudante. Sem CPF, a família pode tirar o documento de graça na Receita Federal ou nos Correios.';
  if (!cpfValido(c)) return 'CPF inválido. Confira os 11 números.';
  const outro = pedidos.find((p) => p.cpf && somenteDigitos(p.cpf) === c && PEDIDO_ATIVO.includes(p.situacao));
  if (outro) return `Já existe um pedido de matrícula para este CPF (protocolo ${outro.protocolo}). Acompanhe esse pedido em vez de fazer outro.`;
  return '';
}
/** 123.456.789-09 enquanto a pessoa digita. */
export function mascaraCpf(texto) {
  const n = somenteDigitos(texto).slice(0, 11);
  return n.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

/**
 * Acompanhar o pedido: protocolo e data de nascimento do estudante (os dois juntos, para ninguém ver o pedido de outra família).
 * @returns {{ok: boolean, erro?: string, pedido?: object, etapas?: Array<{nome: string, estado: 'feito'|'atual'|'falta'|'recusado', detalhe: string}>}}
 */
export function acompanharPedido({ protocolo, nascimento }, { pedidos, enturmacao = {}, turmas = [], escolas = [] }) {
  const prot = String(protocolo ?? '').trim().toUpperCase();
  if (!/^MAT-\d{4}-\d{4}$/.test(prot)) return { ok: false, erro: 'Escreva o protocolo como está no comprovante, por exemplo MAT-2026-0007.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(nascimento ?? ''))) return { ok: false, erro: 'Informe a data de nascimento do estudante como dd/mm/aaaa.' };
  const p = pedidos.find((x) => String(x.protocolo).toUpperCase() === prot);
  // Mesma resposta para protocolo inexistente e data errada: não revela que o protocolo existe.
  if (!p || p.nascimento !== nascimento) return { ok: false, erro: 'Não encontramos pedido com esse protocolo e essa data de nascimento. Confira os dois e tente de novo.' };
  const escola = escolas.find((e) => e.id === p.escolaId);
  const turma = turmas.find((t) => t.id === enturmacao[p.protocolo]);
  const etapas = [{ nome: 'Pedido enviado', estado: 'feito', detalhe: `${p.data || ''}${escola ? ` · ${escola.nome}` : ''}`.replace(/^ · /, '') }];
  if (p.situacao === 'Recusada') etapas.push({ nome: 'A escola recusou o pedido', estado: 'recusado', detalhe: p.motivo || 'Procure a secretaria da escola para saber o motivo.' });
  else {
    const confirmada = p.situacao === 'Confirmada';
    etapas.push({ nome: 'Documentos na secretaria e confirmação da escola', estado: confirmada ? 'feito' : 'atual', detalhe: confirmada ? 'A escola conferiu os documentos e confirmou a matrícula.' : 'Leve os documentos à secretaria da escola. A escola confirma a matrícula depois de conferir.' });
    etapas.push({ nome: 'Estudante na turma', estado: turma ? 'feito' : confirmada ? 'atual' : 'falta', detalhe: turma ? `${turma.nome} · ${turma.turno}${turma.sala ? ` · ${turma.sala}` : ''}` : 'A escola coloca o estudante numa turma da série depois de confirmar.' });
  }
  return { ok: true, pedido: p, escola, etapas };
}
