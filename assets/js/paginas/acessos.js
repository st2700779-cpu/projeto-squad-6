// Acessos e senhas: a secretaria redefine a senha de alunos, responsáveis e professores da escola; a rede, a das contas institucionais.
// A senha temporária aparece uma única vez, na tela de quem gerou; a pessoa é obrigada a trocá-la no primeiro acesso.
// No protótipo a redefinição vale no navegador onde foi feita (ver auth.js); em produção seria no servidor, com a senha em hash.
// Na rede, o técnico de uma DRE atende só as contas das escolas da sua regional; as contas da SEED (rede e PROFIN) ficam com a SEED central.
import { iniciar, falhaDados } from '../app.js';
import { esc, avisar, confirmar, vazio, etiqueta, icone, plural } from '../ui.js';
import { carregar, professoresComInativos, registrarAcao } from '../dados.js';
import { sessao, PERFIS, redefinirSenha, situacaoDaSenha } from '../auth.js';
import { contasDoOperador, gerarSenhaTemporaria } from '../dominio/senha.js';
import { dreDaSessao, avisoDeAcesso } from '../dre.js';

const perfil = document.body.dataset.perfil === 'escola' ? 'escola' : 'rede';
const main = await iniciar({ perfil, pagina: `${perfil}/acessos.html`, assistente: false });
const aleatorio = (n) => Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32 * n);
const SITUACAO = { original: ['Senha de demonstração', 'neutra'], trocada: ['Trocada pelo usuário', 'ok'], temporaria: ['Temporária, troca pendente', 'atencao'] };
let contas = [], resultado = null;

async function carregarContas() {
  const [todas, estudantes, professores, escolas] = await Promise.all([carregar('usuarios'), carregar('estudantes'), professoresComInativos(), carregar('escolas')]);
  const escolaDaConta = (c) => c.perfil === 'aluno' ? estudantes.find((e) => e.id === c.refId)?.escolaId
    : c.perfil === 'responsavel' ? estudantes.find((e) => e.responsavelId === c.refId)?.escolaId
    : c.perfil === 'professor' ? professores.find((p) => p.id === c.refId)?.escolaId : c.escolaId ?? null;
  contas = contasDoOperador(perfil, sessao()?.escolaId, todas, escolaDaConta);
  const dre = perfil === 'rede' ? dreDaSessao() : null;
  if (dre) contas = contas.filter((c) => c.escolaId && escolas.find((e) => e.id === c.escolaId)?.dre === dre);
}
function desenhar(foco = '') {
  main.innerHTML = `<h1 tabindex="-1">Acessos e senhas</h1>
    <p class="pagina-descricao">${perfil === 'escola' ? 'Gere uma senha temporária para quem esqueceu a senha: alunos, responsáveis e professores da sua escola.' : 'Gere uma senha temporária para as contas institucionais: secretaria, direção, coordenação e PROFIN.'} A pessoa troca a senha no primeiro acesso.</p>
    ${perfil === 'rede' ? avisoDeAcesso() : ''}
    <div class="alerta-info">${icone('info', 20)}<span>Confira quem está pedindo antes de gerar (documento ou contato conhecido). A senha aparece uma única vez, só nesta tela, e nunca deve ser enviada por mensagem pública.</span></div>
    ${resultado ? `<div class="senha-gerada" role="status" tabindex="-1" id="senha-gerada"><p class="esp-t-0 esp-b-1"><strong>Senha temporária de ${esc(resultado.nome)}</strong></p><p class="senha-codigo esp-t-0 esp-b-2" aria-label="Senha: ${esc(resultado.senha.split('').join(' '))}">${esc(resultado.senha)}</p><p class="texto-suave texto-pequeno esp-t-0 esp-b-2">Passe à pessoa agora. Ela não aparece de novo, e a senha anterior deixou de valer.</p><div class="linha-botoes"><button type="button" class="botao botao-secundario botao-mini" data-copiar>Copiar</button><button type="button" class="botao botao-texto botao-mini" data-ocultar>Ocultar</button></div></div>` : ''}
    ${contas.length ? `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Contas que você pode redefinir</caption>
      <thead><tr><th scope="col">Conta</th><th scope="col">Perfil</th><th scope="col">Usuário</th><th scope="col">Senha</th><th scope="col"><span class="sr-only">Ação</span></th></tr></thead>
      <tbody>${contas.map((c) => { const [t, tipo] = SITUACAO[situacaoDaSenha(c.login)]; return `<tr><td class="titulo-linha"><strong>${esc(c.nome)}</strong><small>${esc(c.papel)}</small></td><td data-rotulo="Perfil"><div>${esc(PERFIS[c.perfil].rotulo)}</div></td><td data-rotulo="Usuário"><div>${esc(c.login)}</div></td><td data-rotulo="Senha"><div>${etiqueta(t, tipo)}</div></td><td class="acoes"><button type="button" class="botao botao-secundario botao-mini" data-redefinir="${esc(c.login)}" aria-label="Gerar senha temporária para ${esc(c.nome)}">Gerar senha temporária</button></td></tr>`; }).join('')}</tbody></table></div>
      <p class="contagem">${contas.length} ${plural(contas.length, 'conta', 'contas')}</p>` : vazio('Nenhuma conta para redefinir', 'As contas que você pode atender aparecem aqui.')}`;
  if (foco) main.querySelector(foco)?.focus();
}
async function mostrar() { try { await carregarContas(); desenhar(); } catch { falhaDados(main, mostrar); } }

main.addEventListener('click', async (e) => {
  if (e.target.closest('[data-ocultar]')) { resultado = null; desenhar('h1'); return; }
  if (e.target.closest('[data-copiar]')) {
    try { await navigator.clipboard.writeText(resultado.senha); avisar('Senha copiada.'); } catch { avisar('Não foi possível copiar. Selecione a senha e copie à mão.'); }
    return;
  }
  const b = e.target.closest('[data-redefinir]');
  if (!b) return;
  const conta = contas.find((c) => c.login === b.dataset.redefinir);
  if (!(await confirmar({ titulo: `Gerar senha temporária para ${conta.nome}?`, texto: 'A senha atual deixa de valer agora. A nova aparece uma única vez e a pessoa terá de escolher outra no primeiro acesso.', botao: 'Gerar senha', perigo: true }))) return;
  try {
    const senha = gerarSenhaTemporaria(aleatorio);
    await redefinirSenha(conta, senha);
    await registrarAcao(sessao().nome, 'Redefiniu a senha (temporária)', `${PERFIS[conta.perfil].rotulo}: ${conta.nome}`); // a senha nunca vai para o histórico
    resultado = { nome: conta.nome, senha };
    desenhar('#senha-gerada');
  } catch { avisar('Não foi possível gerar a senha. Tente de novo.'); }
});
mostrar();
