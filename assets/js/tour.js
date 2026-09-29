// Guia de primeiro acesso: 4 a 6 passos por visão, cada um com um balão junto da área destacada.
// Passos em data/tour.json. Teclado: ← e → mudam de passo, Esc fecha. Cada passo pode ser ouvido
// (speechSynthesis, pt-BR); sem voz disponível o botão "Ouvir" some e o texto continua na tela.
import { esc, icone } from './ui.js';
import { carregar } from './dados.js';
import { podeLer, ler } from './acessibilidade.js';

const CHAVE = 'portal-tour-visto'; // fica de fora de estado.js para "Restaurar dados de demonstração" não reabrir o guia
const lerVistos = () => { try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch { return {}; } };
export const tourVisto = (perfil) => Boolean(lerVistos()[perfil]);
function marcarVisto(perfil) {
  try { localStorage.setItem(CHAVE, JSON.stringify({ ...lerVistos(), [perfil]: true })); } catch { /* sem armazenamento: o guia reaparece na próxima visita */ }
}

const visivel = (el) => {
  if (!el || !el.isConnected) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth && getComputedStyle(el).visibility !== 'hidden';
};
// Voz em português: a lista de vozes chega depois; enquanto vazia, presume que existe.
const temVoz = () => { if (!podeLer()) return false; const v = window.speechSynthesis.getVoices(); return !v.length || v.some((x) => /^pt/i.test(x.lang)); };

let aberto = null;

/** Abre o guia da visão. `foco` é o elemento que recebe o foco de volta ao fechar. */
export async function abrirTour(perfil, foco = document.activeElement) {
  if (aberto) return;
  let passos;
  try { passos = (await carregar('tour'))[perfil]; } catch { return; }
  if (!passos?.length) return;

  let i = 0;
  const realce = document.createElement('div');
  realce.className = 'tour-realce';
  realce.setAttribute('aria-hidden', 'true');
  const balao = document.createElement('div');
  balao.className = 'tour';
  balao.setAttribute('role', 'dialog');
  balao.setAttribute('aria-labelledby', 'tour-titulo');
  balao.setAttribute('aria-describedby', 'tour-texto');
  balao.tabIndex = -1;
  document.body.append(realce, balao);
  aberto = balao;

  const alvoDoPasso = (p) => [p.alvo, p.alternativa].map((s) => s && document.querySelector(s)).find(visivel) || null;

  function posicionar(alvo) {
    if (!alvo) { realce.style.display = 'none'; balao.style.top = `${Math.max(16, (innerHeight - balao.offsetHeight) / 2)}px`; balao.style.left = `${Math.max(16, (innerWidth - balao.offsetWidth) / 2)}px`; return; }
    const r = alvo.getBoundingClientRect();
    Object.assign(realce.style, { display: 'block', top: `${r.top}px`, left: `${r.left}px`, width: `${r.width}px`, height: `${r.height}px` });
    if (innerWidth < 560) return; // no celular o balão fica fixo embaixo (tour.css)
    const h = balao.offsetHeight, w = balao.offsetWidth;
    // Alvo alto (menu lateral): o balão fica ao lado, para não cobrir o que está sendo explicado.
    if (r.height > innerHeight * 0.4 && r.right + 16 + w <= innerWidth) {
      balao.style.left = `${r.right + 16}px`;
      balao.style.top = `${Math.min(Math.max(16, r.top + 16), innerHeight - h - 16)}px`;
      return;
    }
    const abaixo = r.bottom + 16 + h <= innerHeight;
    const topo = abaixo ? r.bottom + 16 : Math.max(16, r.top - 16 - h);
    balao.style.top = `${Math.min(topo, innerHeight - h - 16)}px`;
    balao.style.left = `${Math.min(Math.max(16, r.left), innerWidth - w - 16)}px`;
  }

  function mostrar(novo, moverFoco = true) {
    i = novo;
    window.speechSynthesis?.cancel();
    const p = passos[i];
    balao.innerHTML = `
      <button type="button" class="botao botao-texto botao-mini tour-fechar" data-fechar aria-label="Fechar o guia">${icone('fechar', 18)}</button>
      <ol class="tour-progresso" aria-hidden="true">${passos.map((_, k) => `<li class="${k < i ? 'feito' : ''}" ${k === i ? 'aria-current="step"' : ''}></li>`).join('')}</ol>
      <p class="tour-passo">Passo ${i + 1} de ${passos.length}</p>
      <h2 id="tour-titulo" tabindex="-1">${esc(p.titulo)}</h2>
      <p class="tour-texto" id="tour-texto">${esc(p.texto)}</p>
      <div class="tour-acoes">
        ${temVoz() ? `<button type="button" class="botao botao-secundario botao-mini" data-ouvir-passo>${icone('alto', 18)}Ouvir</button>` : ''}
        <span class="tour-espaco"></span>
        ${i > 0 ? '<button type="button" class="botao botao-secundario botao-mini" data-voltar>Voltar</button>' : '<button type="button" class="botao botao-texto botao-mini" data-fechar>Pular guia</button>'}
        ${i < passos.length - 1 ? '<button type="button" class="botao botao-mini" data-proximo>Próximo</button>' : '<button type="button" class="botao botao-mini" data-fechar>Concluir</button>'}
      </div>`;
    const alvo = alvoDoPasso(p);
    if (alvo) {
      const r = alvo.getBoundingClientRect();
      if (r.top < 80 || r.bottom > innerHeight - (innerWidth < 560 ? 220 : 40)) scrollTo({ top: scrollY + r.top - 100, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
    posicionar(alvo);
    setTimeout(() => posicionar(alvoDoPasso(p)), 350); // depois da rolagem suave
    if (moverFoco) balao.querySelector('h2').focus();
  }

  function fechar() {
    window.speechSynthesis?.cancel();
    marcarVisto(perfil);
    document.removeEventListener('keydown', teclas, true);
    removeEventListener('resize', reposicionar);
    removeEventListener('scroll', reposicionar, true);
    realce.remove(); balao.remove();
    aberto = null;
    if (foco?.isConnected) foco.focus();
  }
  const reposicionar = () => posicionar(alvoDoPasso(passos[i]));
  function teclas(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(); }
    else if (e.key === 'ArrowRight' && i < passos.length - 1) { e.preventDefault(); mostrar(i + 1); }
    else if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); mostrar(i - 1); }
    else if (e.key === 'Tab' && balao.contains(document.activeElement)) {
      // foco preso no balão enquanto o guia está aberto
      const itens = [...balao.querySelectorAll('button')];
      const primeiro = itens[0], ultimo = itens[itens.length - 1];
      if (e.shiftKey && (document.activeElement === primeiro || document.activeElement === balao || document.activeElement.id === 'tour-titulo')) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    }
  }
  balao.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if ('fechar' in b.dataset) fechar();
    else if ('proximo' in b.dataset) mostrar(i + 1);
    else if ('voltar' in b.dataset) mostrar(i - 1);
    else if ('ouvirPasso' in b.dataset) ler(`${passos[i].titulo}. ${passos[i].texto}`);
  });
  document.addEventListener('keydown', teclas, true);
  addEventListener('resize', reposicionar);
  addEventListener('scroll', reposicionar, true);
  mostrar(0);
}

/** Abre o guia sozinho no primeiro acesso da visão, quando o conteúdo da página já apareceu. */
export function tourNoPrimeiroAcesso(perfil, botao) {
  if (tourVisto(perfil)) return;
  let tentativas = 0;
  const espera = setInterval(() => {
    tentativas += 1;
    const pronto = document.querySelector('#pagina h1, main h1') && !document.querySelector('.esqueleto');
    if (pronto || tentativas > 20) { clearInterval(espera); abrirTour(perfil, botao); }
  }, 150);
}
