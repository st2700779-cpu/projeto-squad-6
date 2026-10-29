// AUTENTICAÇÃO SÓ DE PROTÓTIPO. Não protege nada.
// As contas ficam em data/usuarios.json (senhas em texto simples, todas fictícias), a conferência
// acontece no navegador e a sessão fica em sessionStorage. Qualquer pessoa que abra o console
// consegue entrar como outro perfil. Em produção, o login e a checagem de perfil ficam no servidor,
// com senha em hash, sessão com prazo e uma mensagem única de erro.
//
// Este módulo não importa nenhum outro (dados.js o usa), para não criar dependência circular.
const CHAVE = 'portal-sessao';
const RAIZ = new URL('../../', import.meta.url);

/** Perfis com login. "familia" (matrícula) é público e não aparece aqui. */
export const PERFIS = {
  aluno: { rotulo: 'Aluno', campo: 'Matrícula', dica: 'Número de 9 dígitos, sem pontos', inicio: 'aluno/index.html', informe: 'a matrícula', naoEncontrado: 'essa matrícula' },
  responsavel: { rotulo: 'Responsável', campo: 'Código do responsável', dica: 'Exemplo: RESP-20417', inicio: 'responsavel/index.html', informe: 'o código do responsável', naoEncontrado: 'esse código' },
  professor: { rotulo: 'Professor', campo: 'Matrícula funcional', dica: 'Exemplo: PF-30412', inicio: 'professor/index.html', informe: 'a matrícula funcional', naoEncontrado: 'essa matrícula funcional' },
  escola: { rotulo: 'Secretaria', campo: 'Usuário institucional', dica: 'Usuário da secretaria da escola', inicio: 'escola/index.html', informe: 'o usuário institucional', naoEncontrado: 'esse usuário' },
  diretor: { rotulo: 'Direção', campo: 'Usuário institucional', dica: 'Usuário da direção da escola', inicio: 'diretor/index.html', informe: 'o usuário institucional', naoEncontrado: 'esse usuário' },
  coordenador: { rotulo: 'Coordenação pedagógica', campo: 'Usuário institucional', dica: 'Usuário da coordenação da escola', inicio: 'coordenador/index.html', informe: 'o usuário institucional', naoEncontrado: 'esse usuário' },
  rede: { rotulo: 'Rede (SEED e DRE)', campo: 'Usuário institucional', dica: 'Usuário da equipe técnica da SEED', inicio: 'rede/atos.html', informe: 'o usuário institucional', naoEncontrado: 'esse usuário' },
  profin: { rotulo: 'PROFIN (financeiro)', campo: 'Usuário institucional', dica: 'Usuário da equipe de gestão financeira', inicio: 'profin/index.html', informe: 'o usuário institucional', naoEncontrado: 'esse usuário' }
};

/** Sessão atual ({ perfil, login, nome, papel, refId, escolaId, dre }) ou null. dre: só nas contas da rede de uma DRE (sem ela, SEED central). */
export function sessao() {
  try { return JSON.parse(sessionStorage.getItem(CHAVE)); } catch { return null; }
}
export function iniciarSessao(usuario) {
  const { perfil, login, nome, papel, refId, escolaId, dre } = usuario;
  // trocarSenha: entrou com senha temporária, então só pode usar a tela de Configurações até definir uma nova
  try { sessionStorage.setItem(CHAVE, JSON.stringify({ perfil, login, nome, papel, refId, escolaId: escolaId ?? null, dre: dre ?? null, trocarSenha: senhaTemporaria(login) })); } catch { /* sem armazenamento: não há como manter a sessão */ }
}
/** Encerra a sessão e volta para a entrada. Os dados da demonstração ficam como estão. motivo: 'inatividade' mostra o aviso na entrada. */
export function sair(motivo = '') {
  try { sessionStorage.removeItem(CHAVE); } catch { /* nada a limpar */ }
  const url = new URL('index.html', RAIZ);
  if (motivo) url.searchParams.set('motivo', motivo);
  location.href = url.href;
}

// Senhas trocadas pelo usuário ficam neste aparelho, só como resumo (SHA-256 de "login:senha"); a senha original continua em data/usuarios.json.
// Também faz parte do protótipo: em produção a senha é conferida no servidor, com hash e sal.
const CHAVE_SENHAS = 'portal-senhas';
const lerSenhas = () => { try { return JSON.parse(localStorage.getItem(CHAVE_SENHAS)) || {}; } catch { return {}; } };
export async function resumoDaSenha(login, senha) {
  const texto = `${String(login).trim().toLowerCase()}:${senha}`;
  if (!globalThis.crypto?.subtle) return `txt:${texto}`;
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
/** A senha digitada confere com a da conta (a trocada neste aparelho, se houver, ou a original). */
// Cada registro é o resumo (texto, senha trocada pelo usuário) ou { h: resumo, t: true } (senha temporária gerada pela secretaria ou pela rede).
const resumoDoRegistro = (reg) => (typeof reg === 'string' ? reg : reg?.h);
export async function senhaConfere(conta, senha) {
  const h = resumoDoRegistro(lerSenhas()[conta.login]);
  return h ? h === await resumoDaSenha(conta.login, senha) : conta.senha === senha;
}
const gravarSenhas = (todas) => { try { localStorage.setItem(CHAVE_SENHAS, JSON.stringify(todas)); } catch { throw new Error('FALHA_AO_SALVAR'); } };
export async function trocarSenha(conta, nova) {
  const todas = lerSenhas();
  todas[conta.login] = await resumoDaSenha(conta.login, nova);
  gravarSenhas(todas);
  concluirTrocaObrigatoria();
}
/** Senha temporária: a pessoa escolhe a definitiva no primeiro acesso. */
export async function redefinirSenha(conta, temporaria) {
  const todas = lerSenhas();
  todas[conta.login] = { h: await resumoDaSenha(conta.login, temporaria), t: true };
  gravarSenhas(todas);
}
export const senhaTemporaria = (login) => Boolean(lerSenhas()[login]?.t);
/** 'original' (a de demonstração), 'trocada' (pelo usuário) ou 'temporaria' (troca pendente). */
export const situacaoDaSenha = (login) => { const r = lerSenhas()[login]; return !r ? 'original' : r.t ? 'temporaria' : 'trocada'; };
export const senhaFoiTrocada = (login) => situacaoDaSenha(login) === 'trocada';
/** Libera a navegação depois que a pessoa definiu a senha nova. */
export function concluirTrocaObrigatoria() {
  const s = sessao();
  if (s?.trocarSenha) { try { sessionStorage.setItem(CHAVE, JSON.stringify({ ...s, trocarSenha: false })); } catch { /* sem armazenamento: a sessão acaba ao recarregar */ } }
}
export const restaurarSenhas = () => { try { localStorage.removeItem(CHAVE_SENHAS); } catch { /* nada a limpar */ } };

/** Endereço relativo à raiz do site que pode ser usado depois do login (nunca um endereço de outro site). */
export function destinoSeguro(valor) {
  if (!valor || /^[a-z][a-z0-9+.-]*:|^\/\//i.test(valor) || valor.includes('..')) return null;
  return valor.replace(/^\/+/, '');
}

/**
 * Guarda de rota. Sem sessão, ou com sessão de outro perfil, leva ao login correto e devolve null;
 * a página que chamou para de montar. Com o perfil certo, devolve a sessão.
 */
export function exigirPerfil(perfil) {
  const s = sessao();
  if (s && s.perfil === perfil) return s;
  const url = new URL('login.html', RAIZ);
  url.searchParams.set('perfil', perfil);
  const atual = location.href.slice(RAIZ.href.length);
  url.searchParams.set('voltar', atual);
  if (s) url.searchParams.set('motivo', 'outro-perfil');
  location.replace(url.href);
  return null;
}
