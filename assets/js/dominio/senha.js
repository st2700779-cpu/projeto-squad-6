// Regras de senha: tamanho, letra e número, e a troca (senha atual correta, nova diferente e confirmada).
export const TAMANHO_MINIMO_DA_SENHA = 8;

/** Nível de 0 a 3 com texto: curta, razoável, boa, forte. Só orienta; a regra que bloqueia é validarTrocaDeSenha. */
export function forcaDaSenha(s) {
  const t = String(s ?? '');
  if (!t) return { nivel: 0, texto: '' };
  let n = 0;
  if (t.length >= TAMANHO_MINIMO_DA_SENHA) n += 1;
  if (/[a-z]/i.test(t) && /\d/.test(t)) n += 1;
  if (t.length >= 12 || /[^a-z0-9]/i.test(t)) n += 1;
  return { nivel: n, texto: ['Muito curta', 'Fraca', 'Boa', 'Forte'][n] };
}

/**
 * @param {{atual: string, nova: string, confirmacao: string}} f
 * @param {{atualCorreta: boolean, login: string}} ctx atualCorreta: a senha atual digitada confere com a da conta
 */
export function validarTrocaDeSenha(f, { atualCorreta, login }) {
  const e = {};
  if (!f.atual) e.atual = 'Digite a senha atual.';
  else if (!atualCorreta) e.atual = 'A senha atual não confere.';
  const nova = String(f.nova ?? '');
  if (nova.length < TAMANHO_MINIMO_DA_SENHA) e.nova = `A nova senha precisa de pelo menos ${TAMANHO_MINIMO_DA_SENHA} caracteres.`;
  else if (!/[a-z]/i.test(nova) || !/\d/.test(nova)) e.nova = 'Misture letras e números na nova senha.';
  else if (nova === f.atual) e.nova = 'A nova senha tem de ser diferente da atual.';
  else if (String(login ?? '').trim() && nova.toLowerCase().includes(String(login).trim().toLowerCase())) e.nova = 'A nova senha não pode conter o seu usuário.';
  if (!f.confirmacao) e.confirmacao = 'Digite a nova senha de novo.';
  else if (f.confirmacao !== nova) e.confirmacao = 'A confirmação não é igual à nova senha.';
  return { ok: !Object.keys(e).length, erros: e };
}

// ───── Redefinição de senha por quem atende (secretaria e rede) ─────
/** Quem redefine a senha de quem: a secretaria, de alunos, responsáveis e professores da própria escola; a rede, das contas institucionais. */
export const PODE_REDEFINIR = { escola: ['aluno', 'responsavel', 'professor'], rede: ['escola', 'diretor', 'coordenador', 'profin'] };
export const podeRedefinir = (operador, alvo) => (PODE_REDEFINIR[operador] || []).includes(alvo);

/**
 * Contas que o operador enxerga na tela de acessos. escolaDaConta(conta) devolve a escola da conta (ou null).
 * A secretaria só vê a própria escola; a rede vê todas as contas institucionais.
 */
export function contasDoOperador(operador, escolaDoOperador, contas, escolaDaConta) {
  return contas.filter((c) => podeRedefinir(operador, c.perfil) && (operador === 'rede' || escolaDaConta(c) === escolaDoOperador));
}

const LETRAS = 'abcdefghjkmnpqrstuvwxyz'; // sem i, l, o: confundem com 1 e 0
const NUMEROS = '23456789';
/**
 * Senha temporária fácil de ditar: cinco letras (a primeira maiúscula), hífen e quatro números. Ex.: "Kqwdm-4827".
 * @param {(n: number) => number} aleatorio devolve um inteiro de 0 a n-1 (use crypto no navegador)
 */
export function gerarSenhaTemporaria(aleatorio) {
  const letra = () => LETRAS[aleatorio(LETRAS.length)];
  const primeira = letra().toUpperCase();
  const resto = Array.from({ length: 4 }, letra).join('');
  const numeros = Array.from({ length: 4 }, () => NUMEROS[aleatorio(NUMEROS.length)]).join('');
  return `${primeira}${resto}-${numeros}`;
}
