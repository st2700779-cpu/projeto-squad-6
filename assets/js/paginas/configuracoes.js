// Configurações: aparência e leitura, notificações (simuladas), conta, ajuda e dados.
// O modo claro/escuro aparece aqui só no celular (no computador fica no botão "Exibição" do cabeçalho).
import { iniciar, link } from '../app.js';
import { aplicarEscala, mudarEscala } from '../acessibilidade.js';
import { obter, definir } from '../estado.js';
import { sessao, sair, PERFIS } from '../auth.js';
import { reiniciarDados } from '../dados.js';
import { avisar, confirmar, icone, esc } from '../ui.js';

const usuario = sessao();
const perfil = usuario?.perfil && PERFIS[usuario.perfil] ? usuario.perfil : null;
const main = await iniciar({ perfil, pagina: 'configuracoes.html', titulo: 'Configurações' });

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
          <button type="button" class="botao botao-secundario" data-acao="sair">Sair da conta</button>` : `<p>Você não entrou em nenhuma conta. <a href="${link('index.html')}">Escolher um perfil</a></p>`}
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
  if (acao === 'guia') import('../tour.js').then((t) => t.abrirTour(perfil, e.target));
  if (acao === 'padrao') {
    p?.restaurar(); definir('escala', 1); aplicarEscala(); definir('cfg-notif', null);
    desenhar(); avisar('Configurações padrão restauradas.');
  }
  if (acao === 'dados') {
    if (!(await confirmar({ titulo: 'Restaurar os dados de demonstração?', texto: 'Apaga o que foi feito neste navegador e no servidor local: pedidos, confirmações, notas lançadas e chamadas. Esta ação não pode ser desfeita.', botao: 'Restaurar', perigo: true }))) return;
    try { await reiniciarDados(); avisar('Dados de demonstração restaurados.'); } catch { avisar('Não foi possível restaurar os dados. Recarregue a página e tente de novo.'); }
  }
});
desenhar();
