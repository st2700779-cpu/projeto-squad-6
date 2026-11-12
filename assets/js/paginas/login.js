// Login por perfil (protótipo: ver aviso em auth.js). O perfil vem de ?perfil=aluno|professor|escola|rede
// e o destino depois do login, de ?voltar=<caminho dentro do site>.
import { iniciar, link } from '../app.js';
import { PERFIS, sessao, iniciarSessao, destinoSeguro, senhaConfere, senhaTemporaria } from '../auth.js';
import { carregar } from '../dados.js';
import { esc, icone, comEspera } from '../ui.js';

const params = new URLSearchParams(location.search);
const perfil = params.get('perfil');
const main = await iniciar();
document.body.classList.add('pagina-login');

if (!PERFIS[perfil]) {
  location.replace(link('index.html'));
  await new Promise(() => {});
}
const P = PERFIS[perfil];
const destino = destinoSeguro(params.get('voltar')) || P.inicio;
const atual = sessao();
if (atual?.perfil === perfil) { location.replace(link(destino)); await new Promise(() => {}); }

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const soDigitos = (v) => v.replace(/\D/g, '');
// Aluno digita só números; os demais perfis comparam sem diferenciar maiúsculas de minúsculas.
const normaliza = (v) => (perfil === 'aluno' ? soDigitos(v) : v.trim().toLowerCase());

async function desenhar() {
  let contas = [];
  try { contas = (await carregar('usuarios')).filter((u) => u.perfil === perfil); } catch { /* o login mostra o erro ao enviar */ }
  document.title = `Entrar como ${P.rotulo} · Portal Acadêmico`;
  main.innerHTML = `
    <p class="selo-portal">${esc(P.portal)}</p>
    <h1 tabindex="-1">Entrar como ${esc(P.rotulo)}</h1>
    <p class="pagina-descricao">Acesso simulado. Não use uma senha real.</p>
    ${atual && params.get('motivo') === 'outro-perfil' ? `<div class="sessao-atual" role="status">${icone('info', 20)}<span>Você entrou como ${esc(atual.nome)} (${esc(PERFIS[atual.perfil]?.rotulo || atual.perfil)}). Esta área é de ${esc(P.rotulo)}: entre com uma conta desse perfil.</span></div>` : params.get('voltar') ? `<div class="sessao-atual" role="status">${icone('info', 20)}<span>Entre para abrir a página pedida.</span></div>` : ''}
    <form id="form-login" class="form-login" novalidate>
      <div class="campo">
        <label for="login">${esc(P.campo)}</label>
        <input id="login" name="login" class="entrada" type="text" autocomplete="username" ${perfil === 'aluno' ? 'inputmode="numeric" data-formato="matricula" maxlength="9" placeholder="9 números"' : 'data-formato="login" maxlength="40"'} autocapitalize="none" spellcheck="false" aria-describedby="login-dica login-erro" required>
        <span class="dica" id="login-dica">${esc(P.dica)}</span>
        <p class="erro" id="login-erro" role="alert"></p>
      </div>
      <div class="campo">
        <label for="senha">Senha</label>
        <div class="campo-senha">
          <input id="senha" name="senha" class="entrada" type="password" maxlength="64" autocomplete="current-password" aria-describedby="caps senha-erro" required>
          <button type="button" class="botao botao-secundario" id="ver-senha" aria-controls="senha" aria-label="Mostrar senha">Mostrar</button>
        </div>
        <p class="aviso-caps" id="caps" role="status" hidden>${icone('alerta', 18)}<span>A tecla Caps Lock está ligada. A senha diferencia maiúsculas de minúsculas.</span></p>
        <p class="erro" id="senha-erro" role="alert"></p>
      </div>
      <p class="erro" id="erro-form" role="alert"></p>
      <button type="submit" class="botao botao-grande" id="entrar">Entrar</button>
    </form>
    <details class="demo" id="esqueci">
      <summary>Esqueci minha senha</summary>
      <p class="demo-nota">${['aluno', 'responsavel', 'professor'].includes(perfil) ? 'Procure a secretaria da sua escola: ela confere os seus dados e gera uma senha nova.' : 'Peça a redefinição à equipe técnica da SEED, pelo canal institucional.'} Nunca informe a sua senha a outra pessoa.</p>
      <p class="demo-nota">Na demonstração: se você trocou a senha neste aparelho e não lembra, use "Restaurar dados de demonstração" na tela de entrada para voltar às senhas de teste.</p>
    </details>
    <details class="demo">
      <summary>Acesso de demonstração</summary>
      ${contas.map((c) => `<div class="demo-conta"><dl><dt>${esc(P.campo)}</dt><dd>${esc(c.login)}</dd><dt>Senha</dt><dd>${esc(c.senha)}</dd><dt>Perfil</dt><dd>${esc(c.nome)}</dd></dl><button type="button" class="botao botao-secundario botao-mini" data-preencher="${esc(c.login)}" aria-label="Preencher com a conta de ${esc(c.nome)}">Preencher</button></div>`).join('') || '<p class="demo-nota">As contas de demonstração não carregaram.</p>'}
      <p class="demo-nota">Contas fictícias, só para testar o protótipo. Se você trocou a senha, use a nova.</p>
    </details>
    <p><a href="${link('index.html')}">Voltar e escolher outro portal</a></p>`;
  main.querySelector('h1').focus();
}

function erro(campo, texto) {
  const entrada = main.querySelector(`#${campo}`);
  const alvo = main.querySelector(campo === 'login' || campo === 'senha' ? `#${campo}-erro` : '#erro-form');
  alvo.textContent = texto;
  if (entrada) entrada.setAttribute('aria-invalid', 'true');
  return entrada;
}
function limpar() {
  main.querySelectorAll('.erro').forEach((e) => { e.textContent = ''; });
  main.querySelectorAll('[aria-invalid]').forEach((e) => e.removeAttribute('aria-invalid'));
}

async function entrar() {
  const login = main.querySelector('#login').value;
  const senha = main.querySelector('#senha').value;
  limpar();
  const vazios = [];
  if (!login.trim()) vazios.push(erro('login', `Informe ${P.informe}.`));
  if (!senha) vazios.push(erro('senha', 'Informe a senha.'));
  if (vazios.length) { vazios[0].focus(); return; }
  await comEspera(main.querySelector('#entrar'), async () => {
    await pausa(450); // no protótipo a conferência é local e instantânea; a espera deixa visível o estado de carregamento
    let todas;
    try { todas = await carregar('usuarios'); } catch { erro('erro-form', 'Não foi possível consultar as contas agora. Confira a conexão e clique em Entrar de novo.'); return; }
    const conta = todas.find((u) => u.perfil === perfil && normaliza(u.login) === normaliza(login));
    if (!conta) {
      const outra = todas.find((u) => normaliza(u.login) === normaliza(login));
      if (outra) erro('login', `Este acesso é de ${PERFIS[outra.perfil].rotulo}. Volte à entrada e escolha esse perfil.`).focus();
      else erro('login', `Não encontramos ${P.naoEncontrado}. Confira os dados ou use a conta de demonstração abaixo.`).focus();
      return;
    }
    if (!(await senhaConfere(conta, senha))) {
      const s = erro('senha', 'A senha não confere. Confira as letras e tente de novo.');
      main.querySelector('#senha').value = '';
      s.focus();
      return;
    }
    iniciarSessao(conta);
    location.href = link(senhaTemporaria(conta.login) ? 'configuracoes.html?trocar=1' : destino);
  });
}

main.addEventListener('submit', (e) => { e.preventDefault(); entrar(); });
main.addEventListener('click', (e) => {
  const ver = e.target.closest('#ver-senha');
  if (ver) {
    const campo = main.querySelector('#senha');
    const mostrar = campo.type === 'password';
    campo.type = mostrar ? 'text' : 'password';
    ver.textContent = mostrar ? 'Ocultar' : 'Mostrar';
    ver.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
    campo.focus();
    return;
  }
  const b = e.target.closest('[data-preencher]');
  if (b) {
    const conta = b.closest('.demo-conta');
    main.querySelector('#login').value = b.dataset.preencher;
    main.querySelector('#senha').value = conta.querySelectorAll('dd')[1].textContent;
    limpar();
    main.querySelector('#entrar').focus();
  }
});
// Aviso de Caps Lock enquanto a pessoa digita a senha.
const capsLigado = (e) => { const aviso = main.querySelector('#caps'); if (aviso && e.getModifierState) aviso.hidden = !e.getModifierState('CapsLock'); };
main.addEventListener('keydown', (e) => { if (e.target.id === 'senha') capsLigado(e); });
main.addEventListener('keyup', (e) => { if (e.target.id === 'senha') capsLigado(e); });
main.addEventListener('focusout', (e) => { if (e.target.id === 'senha') main.querySelector('#caps').hidden = true; });
desenhar();
