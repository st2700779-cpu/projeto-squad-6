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
