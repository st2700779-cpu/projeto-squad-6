// Configurações: aparência e leitura, notificações (simuladas), conta, ajuda e dados.
// O modo claro/escuro aparece aqui só no celular (no computador fica no botão "Exibição" do cabeçalho).
import { iniciar, link } from '../app.js';
import { aplicarEscala, mudarEscala } from '../acessibilidade.js';
import { obter, definir } from '../estado.js';
import { sessao, sair, PERFIS, senhaConfere, trocarSenha, senhaFoiTrocada, concluirTrocaObrigatoria } from '../auth.js';
import { reiniciarDados, carregar } from '../dados.js';
import { avisar, confirmar, icone, esc, comEspera } from '../ui.js';
import { campo, lerFormulario, mostrarErros } from '../componentes/formulario.js';
import { validarTrocaDeSenha, forcaDaSenha, TAMANHO_MINIMO_DA_SENHA } from '../dominio/senha.js';

const usuario = sessao();
const perfil = usuario?.perfil && PERFIS[usuario.perfil] ? usuario.perfil : null;
const main = await iniciar({ perfil, pagina: 'configuracoes.html', titulo: 'Configurações' });

// Entrou com senha temporária (gerada pela secretaria ou pela rede): precisa definir a senha nova antes de usar o resto do portal.
let obrigatoria = Boolean(usuario?.trocarSenha);

const NOTIF_PADRAO = { avisos: true, prazos: true, resumo: false };
const notif = () => ({ ...NOTIF_PADRAO, ...(obter('cfg-notif', null) || {}) });
const pref = () => window.preferenciasExibicao || null;

const chave = (id, rotulo, marcado, dica = '') => `<button type="button" class="chave" role="switch" data-cfg="${id}" aria-checked="${marcado}"><span>${esc(rotulo)}${dica ? `<small class="cfg-dica">${esc(dica)}</small>` : ''}</span><span class="chave-trilho" aria-hidden="true"><span></span></span></button>`;
const temaBotao = (v, nome, ic, atual) => `<button type="button" class="seg" data-tema-cfg="${v}" aria-pressed="${atual === v}">${icone(ic, 20)}<span>${nome}</span></button>`;

function desenhar() {
  const p = pref();
  const n = notif();
  const escala = Math.round(obter('escala', 1) * 100);
  main.innerHTML = `
    <h1 tabindex="-1">Configurações</h1>
    ${obrigatoria ? `<div class="alerta-erro" role="alert">${icone('alerta', 20)}<span><strong>Defina uma senha nova para continuar.</strong> Você entrou com uma senha temporária. Digite-a como "senha atual" e escolha a sua.</span></div>` : ''}
    <p class="pagina-descricao">Ajuste o portal ao seu jeito. As escolhas ficam guardadas neste aparelho.</p>
    <div class="cfg">
      <section class="cfg-grupo" aria-labelledby="cfg-aparencia">
        <h2 id="cfg-aparencia">Aparência e leitura</h2>
        <div class="cfg-linha">
          <div><strong>Tamanho da letra</strong><small class="cfg-dica">Agora em ${escala}%</small></div>
          <div class="cfg-escala" role="group" aria-label="Tamanho da letra">
            <button type="button" class="botao botao-secundario botao-mini" data-escala-cfg="-0.1" aria-label="Diminuir letra">A−</button>
            <button type="button" class="botao botao-secundario botao-mini" data-escala-cfg="0" ${escala === 100 ? 'disabled' : ''}>Padrão</button>
            <button type="button" class="botao botao-secundario botao-mini" data-escala-cfg="0.1" aria-label="Aumentar letra">A+</button>
          </div>
        </div>
        <div class="cfg-so-celular so-celular" role="group" aria-labelledby="cfg-tema">
          <strong id="cfg-tema">Tema do portal</strong>
          <div class="segmentado">${temaBotao('claro', 'Claro', 'sol', p?.tema())}${temaBotao('escuro', 'Escuro', 'lua', p?.tema())}${temaBotao('auto', 'Automático', 'auto', p?.tema())}</div>
          <small class="cfg-dica">Automático segue o modo claro ou escuro do seu celular.</small>
        </div>
        ${chave('contraste', 'Alto contraste', Boolean(p?.contraste()), 'Cores mais fortes e bordas pretas, para enxergar melhor.')}
        ${chave('movimento', 'Reduzir animações', Boolean(p?.movimento()), 'Menos movimento nas telas.')}
      </section>

      <section class="cfg-grupo" aria-labelledby="cfg-notif">
        <h2 id="cfg-notif">Notificações</h2>
        ${chave('n-avisos', 'Avisos da escola', n.avisos)}
        ${chave('n-prazos', 'Prazos e provas', n.prazos)}
        ${chave('n-resumo', 'Resumo semanal', n.resumo)}
        <p class="cfg-dica">Neste protótipo, as notificações são só uma preferência de demonstração: nada é enviado.</p>
      </section>

      <section class="cfg-grupo" aria-labelledby="cfg-conta">
        <h2 id="cfg-conta">Conta</h2>
        ${usuario ? `<dl class="cfg-dl"><dt>Nome</dt><dd>${esc(usuario.nome)}</dd><dt>Perfil</dt><dd>${esc(usuario.papel)}</dd><dt>Usuário</dt><dd>${esc(usuario.login)}</dd></dl>
          <div class="cfg-acoes"><button type="button" class="botao botao-secundario" data-acao="senha" aria-expanded="${obrigatoria}" aria-controls="form-senha">Alterar senha</button><button type="button" class="botao botao-secundario" data-acao="sair">Sair da conta</button></div>
          ${senhaFoiTrocada(usuario.login) ? '<p class="cfg-dica">A senha desta conta foi trocada neste aparelho.</p>' : ''}
          <form id="form-senha" class="form-senha" novalidate ${obrigatoria ? '' : 'hidden'}>
            <p class="cfg-dica">Use ${TAMANHO_MINIMO_DA_SENHA} caracteres ou mais, com letras e números. Na demonstração a troca vale só neste aparelho.</p>
            ${campo({ nome: 'atual', rotulo: 'Senha atual', tipo: 'password', obrigatorio: true, atributos: 'autocomplete="current-password"' })}
            ${campo({ nome: 'nova', rotulo: 'Nova senha', tipo: 'password', obrigatorio: true, atributos: 'autocomplete="new-password"' })}
            <p class="forca-senha" id="forca-senha" role="status" aria-live="polite"></p>
            ${campo({ nome: 'confirmacao', rotulo: 'Repita a nova senha', tipo: 'password', obrigatorio: true, atributos: 'autocomplete="new-password"' })}
            <p class="erro" id="f-geral-erro" role="alert"></p>
            <div class="cfg-acoes"><button type="submit" class="botao">Salvar nova senha</button>${obrigatoria ? '' : '<button type="button" class="botao botao-texto" data-acao="cancelar-senha">Cancelar</button>'}</div>
          </form>` : `<p>Você não entrou em nenhuma conta. <a href="${link('index.html')}">Escolher um perfil</a></p>`}
      </section>

      <section class="cfg-grupo" aria-labelledby="cfg-ajuda">
        <h2 id="cfg-ajuda">Ajuda e dados</h2>
        <div class="cfg-acoes">
          ${perfil ? '<button type="button" class="botao botao-secundario" data-acao="guia">Rever o guia de uso</button>' : ''}
          <button type="button" class="botao botao-secundario" data-acao="padrao">Restaurar configurações padrão</button>
          <button type="button" class="botao botao-secundario" data-acao="dados">Restaurar dados de demonstração</button>
        </div>
        <p class="cfg-dica">Portal Acadêmico v1.0 · SEED/SE · escolas, pessoas e dados fictícios.</p>
      </section>
    </div>`;
}

main.addEventListener('click', async (e) => {
  const p = pref();
  const esc_ = e.target.closest('[data-escala-cfg]');
  if (esc_) {
    const passo = Number(esc_.dataset.escalaCfg);
    if (passo === 0) { definir('escala', 1); aplicarEscala(); } else mudarEscala(passo);
    desenhar(); main.querySelector(`[data-escala-cfg="${esc_.dataset.escalaCfg}"]`)?.focus(); return;
  }
  const tema = e.target.closest('[data-tema-cfg]');
  if (tema && p) { p.definirTema(tema.dataset.temaCfg); desenhar(); main.querySelector(`[data-tema-cfg="${tema.dataset.temaCfg}"]`)?.focus(); return; }
  const sw = e.target.closest('[data-cfg]');
  if (sw) {
    const id = sw.dataset.cfg;
    const ligado = sw.getAttribute('aria-checked') !== 'true';
    if (id === 'contraste') p?.definirContraste(ligado);
    else if (id === 'movimento') p?.definirMovimento(ligado);
    else definir('cfg-notif', { ...notif(), [id.slice(2)]: ligado });
    desenhar(); main.querySelector(`[data-cfg="${id}"]`)?.focus(); return;
  }
  const acao = e.target.closest('[data-acao]')?.dataset.acao;
  if (acao === 'sair') sair();
  if (acao === 'senha' || acao === 'cancelar-senha') {
    const f = main.querySelector('#form-senha');
    const abrir = acao === 'senha' && (f.hidden || obrigatoria);
    f.hidden = !abrir; f.reset?.(); mostrarErros(f, {}); main.querySelector('#forca-senha').textContent = '';
    main.querySelector('[data-acao="senha"]').setAttribute('aria-expanded', String(abrir));
    (abrir ? f.querySelector('#f-atual') : main.querySelector('[data-acao="senha"]'))?.focus();
  }
  if (acao === 'guia') import('../tour.js').then((t) => t.abrirTour(perfil, e.target));
  if (acao === 'padrao') {
    p?.restaurar(); definir('escala', 1); aplicarEscala(); definir('cfg-notif', null);
    desenhar(); avisar('Configurações padrão restauradas.');
  }
  if (acao === 'dados') {
    if (!(await confirmar({ titulo: 'Restaurar os dados de demonstração?', texto: 'Apaga o que foi feito neste navegador e no servidor local: pedidos, confirmações, notas lançadas e chamadas. Esta ação não pode ser desfeita.', botao: 'Restaurar', perigo: true }))) return;
    try { await reiniciarDados(); concluirTrocaObrigatoria(); obrigatoria = false; desenhar(); avisar('Dados de demonstração restaurados.'); } catch { avisar('Não foi possível restaurar os dados. Recarregue a página e tente de novo.'); }
  }
});
main.addEventListener('input', (e) => {
  if (e.target.id !== 'f-nova') return;
  const { nivel, texto } = forcaDaSenha(e.target.value);
  const alvo = main.querySelector('#forca-senha');
  alvo.textContent = texto ? `Força da senha: ${texto}` : '';
  alvo.dataset.nivel = String(nivel);
});
main.addEventListener('submit', async (e) => {
  if (e.target.id !== 'form-senha') return;
  e.preventDefault();
  const f = e.target;
  const dados = lerFormulario(f);
  let conta = null;
  try { conta = (await carregar('usuarios')).find((u) => u.login === usuario.login && u.perfil === usuario.perfil); } catch { /* tratado abaixo */ }
  if (!conta) { mostrarErros(f, {}); f.querySelector('#f-geral-erro').textContent = 'Não foi possível confirmar a sua conta agora. Tente de novo.'; return; }
  const { ok, erros } = validarTrocaDeSenha(dados, { atualCorreta: dados.atual ? await senhaConfere(conta, dados.atual) : false, login: usuario.login });
  if (!mostrarErros(f, erros) || !ok) return;
  try { await comEspera(f.querySelector('[type="submit"]'), () => trocarSenha(conta, dados.nova)); }
  catch { f.querySelector('#f-geral-erro').textContent = 'Não foi possível guardar a nova senha neste navegador.'; return; }
  if (obrigatoria) { obrigatoria = false; avisar('Senha definida. Você já pode usar o portal.'); setTimeout(() => { location.href = link(PERFIS[perfil].inicio); }, 900); return; }
  desenhar();
  avisar('Senha alterada. Use a nova senha no próximo acesso.');
  main.querySelector('[data-acao="senha"]')?.focus();
});
desenhar();
if (obrigatoria) main.querySelector('#f-atual')?.focus();
