// Código de verificação de documentos (declarações e carteirinha).
// O código é o começo do SHA-256 de uma linha canônica com os dados essenciais do documento. A página pública
// verificar.html recalcula o código para cada estudante e cada pedido confirmado do arquivo central de dados
// (data/*.json, nunca o localStorage) e compara. Isso mostra que os dados do papel batem com o cadastro da rede;
// não é assinatura digital: não prova quem emitiu nem quando. Só funciona em https ou localhost (crypto.subtle).
export const TIPOS = {
  matricula: 'Declaração de matrícula',
  frequencia: 'Declaração de frequência',
  transferencia: 'Declaração de transferência',
  carteirinha: 'Carteirinha do estudante'
};
export const ANO_LETIVO = 2026;

/** Dados que entram no código. `fonte`: 'E' (cadastro de estudante) ou 'P' (pedido de matrícula confirmado). */
export const linhaCanonica = ({ tipo, fonte, chave, nome, nascimento = '', serie, turma = '', escola }) =>
  [tipo, fonte, chave, nome, nascimento, serie, turma, escola, ANO_LETIVO].join('|');

export const verificacaoDisponivel = () => Boolean(globalThis.crypto?.subtle);

async function sha256Hex(texto) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
/** 'A1B2C3D4E5' → 'A1B2-C3D4-E5' */
const formatar = (hex) => `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 10)}`.toUpperCase();
/** Aceita o código com ou sem hífens e em qualquer caixa; devolve só os 10 caracteres ou null. */
export function limparCodigo(texto) {
  const c = String(texto || '').replace(/[^0-9a-f]/gi, '').toUpperCase();
  return c.length === 10 ? c : null;
}

/** Código de verificação (formato XXXX-XXXX-XX) dos dados do documento. */
export async function codigoDeVerificacao(dados) {
  return formatar((await sha256Hex(linhaCanonica(dados))).slice(0, 10));
}

/**
 * Procura, no arquivo central, o documento que gera o código.
 * @returns {Promise<null | {tipo:string, nome:string, chave:string, fonte:string, serie:string, escola:string, turma?:string}>}
 */
export async function procurarDocumento(codigo, { estudantes, matriculas, escolas }) {
  const alvo = limparCodigo(codigo);
  if (!alvo) return null;
  const nomeEscola = (id) => escolas.find((e) => e.id === id)?.nome || '';
  const candidatos = [];
  for (const e of estudantes) {
    for (const tipo of Object.keys(TIPOS)) {
      candidatos.push({ tipo, fonte: 'E', chave: e.matricula || e.id, nome: e.nome, nascimento: e.nascimento, serie: e.serie, turma: e.turma || '', escola: nomeEscola(e.escolaId) });
    }
  }
  for (const p of matriculas.filter((x) => x.situacao === 'Confirmada')) {
    candidatos.push({ tipo: 'matricula', fonte: 'P', chave: p.protocolo, nome: p.estudante, nascimento: '', serie: p.serie, turma: '', escola: nomeEscola(p.escolaId) });
  }
  for (const c of candidatos) {
    if ((await sha256Hex(linhaCanonica(c))).slice(0, 10).toUpperCase() === alvo) return c;
  }
  return null;
}
