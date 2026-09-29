// Inicialização comum a todas as páginas: cabeçalho institucional, menu lateral, breadcrumb e assistente.
import { icone, esc } from './ui.js';
import { aplicarEscala, mudarEscala } from './acessibilidade.js';
import { definir } from './estado.js';
import { RAIZ } from './dados.js';

const url = (caminho) => new URL(caminho, RAIZ).href;

/** Itens do menu lateral de cada visão: [página, rótulo, ícone]. */
export const MENUS = {
  familia: [['familia/index.html', 'Início', 'usuario'], ['familia/matricula.html', 'Matrícula', 'formulario'], ['familia/notas.html', 'Notas e faltas', 'livro'], ['familia/documentos.html', 'Documentos', 'documento'], ['familia/calendario.html', 'Calendário e avisos', 'calendario']],
  professor: [['professor/index.html', 'Minhas turmas', 'livro'], ['professor/diario.html', 'Diário de classe', 'formulario'], ['professor/avisos.html', 'Avisos', 'calendario']],
  escola: [['escola/index.html', 'Início', 'escola'], ['escola/matriculas.html', 'Matrículas', 'formulario'], ['escola/enturmacao.html', 'Enturmação', 'pessoas'], ['escola/turmas.html', 'Turmas', 'usuario'], ['escola/alocacao.html', 'Alocação', 'livro'], ['escola/equivalencias.html', 'Equivalências', 'trocar'], ['escola/avisos.html', 'Avisos', 'calendario']],
  rede: [['rede/atos.html', 'Atos autorizativos', 'documento'], ['rede/vagas.html', 'Vagas por escola', 'escola'], ['rede/matrizes.html', 'Matrizes curriculares', 'livro']]
};
const NOMES = { familia: 'Família e estudante', professor: 'Professor', escola: 'Escola', rede: 'Rede (SEDUC e DRE)' };
// Usuário simulado de cada visão (nomes que já existem nos dados de demonstração).
const USUARIOS = {
  familia: { nome: 'Rosa Maria Santos', papel: 'Responsável' },
  professor: { nome: 'Profa. Ana Lúcia Menezes', papel: 'Professora de Matemática' },
  escola: { nome: 'Secretaria escolar', papel: 'C. E. Rio Sergipe' },
  rede: { nome: 'Equipe técnica', papel: 'SEDUC/SE' }
};
const CHAVE_MENU = 'portal-menu-recolhido';
const lerPreferencia = () => { try { return localStorage.getItem(CHAVE_MENU) === '1'; } catch { return false; } };
const gravarPreferencia = (v) => { try { localStorage.setItem(CHAVE_MENU, v ? '1' : '0'); } catch { /* segue sem guardar */ } };
const iniciais = (nome) => nome.replace(/^(Profa?\.|Dr\.|Dra\.)\s+/, '').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

function cabecalho({ perfil, papel }) {
  const u = perfil ? { ...USUARIOS[perfil], ...(papel ? { nome: papel } : {}) } : null;
  const topo = document.createElement('header');
  topo.className = 'topo';
  topo.innerHTML = `
    <div class="topo-interno">
      ${perfil ? `<button type="button" class="ferramenta topo-menu-botao" aria-controls="menu-lateral" aria-expanded="false" aria-label="Abrir menu">${icone('menu', 22)}</button>` : ''}
      <a class="marca" href="${url('index.html')}" aria-label="Portal Acadêmico, página inicial">
        <span class="marca-selo" aria-hidden="true">SE</span>
        <span class="marca-texto"><strong>Portal Acadêmico</strong><small>SEDUC/SE · Governo de Sergipe</small></span>
      </a>
      <div class="topo-direita">
        <button type="button" class="ferramenta ferramenta-opcional" data-escala="-0.1" aria-label="Diminuir letra">A−</button>
        <button type="button" class="ferramenta" data-escala="0.1" aria-label="Aumentar letra">A+</button>
        ${window.botaoTema ? window.botaoTema() : ''}
        ${u ? `<div class="usuario"><span class="avatar" aria-hidden="true">${esc(iniciais(u.nome))}</span><span class="usuario-texto"><strong>${esc(u.nome)}</strong><small>${esc(u.papel)}</small></span></div>` : ''}
        ${perfil ? `<a class="ferramenta" href="${url('index.html')}">Sair</a>` : ''}
      </div>
    </div>`;
  topo.addEventListener('click', (e) => {
    const b = e.target.closest('[data-escala]');
    if (b) mudarEscala(Number(b.dataset.escala));
  });
  return topo;
}

// Qual item do menu corresponde à página aberta (pelo endereço, sem depender de cada página informar).
function itemAtual(menu, pagina) {
  const caminho = location.pathname;
  return menu.find(([h]) => caminho.endsWith('/' + h) || h === pagina) || null;
}

function breadcrumb({ perfil, menu, atual, titulo }) {
  const passos = [[ 'Início', url('index.html') ]];
  if (perfil) passos.push([NOMES[perfil], url(menu[0][0])]);
  if (atual && atual !== menu[0]) passos.push([atual[1], null]);
  else if (!atual && titulo) passos.push([titulo, null]);
  else if (atual) passos[passos.length - 1][1] = null;
  return `<nav class="breadcrumb" aria-label="Você está em"><ol>${passos.map(([t, h], i) => `<li>${h ? `<a href="${h}">${esc(t)}</a>` : `<span${i === passos.length - 1 ? ' aria-current="page"' : ''}>${esc(t)}</span>`}</li>`).join('')}</ol></nav>`;
}

// Menu lateral: no desktop recolhe para só ícones (preferência guardada); no celular é uma gaveta com foco preso e Esc.
function configurarMenu(topo, conteudo, menu, area) {
  const botao = topo.querySelector('.topo-menu-botao');
  const fundo = document.createElement('div');
  fundo.className = 'menu-fundo';
  fundo.hidden = true;
  menu.after(fundo);
  const celular = matchMedia('(max-width: 899px)');
  const rotulo = (recolhido) => { botao.setAttribute('aria-label', recolhido ? 'Expandir menu' : 'Recolher menu'); botao.setAttribute('aria-expanded', String(!recolhido)); };
  const aplicarDesktop = () => { const r = lerPreferencia(); conteudo.classList.toggle('menu-recolhido', r); rotulo(r); };
  function abrir() {
    menu.classList.add('aberto'); fundo.hidden = false; area.inert = true;
    document.documentElement.classList.add('menu-aberto');
    botao.setAttribute('aria-expanded', 'true'); botao.setAttribute('aria-label', 'Fechar menu');
    (menu.querySelector('[aria-current="page"]') || menu.querySelector('a')).focus();
  }
  function fechar(devolverFoco = true) {
    menu.classList.remove('aberto'); fundo.hidden = true; area.inert = false;
    document.documentElement.classList.remove('menu-aberto');
    botao.setAttribute('aria-expanded', 'false'); botao.setAttribute('aria-label', 'Abrir menu');
    if (devolverFoco) botao.focus();
  }
  function ajustar() { if (celular.matches) { conteudo.classList.remove('menu-recolhido'); if (!menu.classList.contains('aberto')) fechar(false); } else { fechar(false); aplicarDesktop(); } }
  botao.addEventListener('click', () => {
    if (celular.matches) { menu.classList.contains('aberto') ? fechar() : abrir(); return; }
    const r = !conteudo.classList.contains('menu-recolhido');
    conteudo.classList.toggle('menu-recolhido', r); gravarPreferencia(r); rotulo(r);
  });
  fundo.addEventListener('click', () => fechar());
  menu.addEventListener('click', (e) => { if (e.target.closest('a') && celular.matches) fechar(false); });
  document.addEventListener('keydown', (e) => {
    if (!menu.classList.contains('aberto')) return;
    if (e.key === 'Escape') { fechar(); return; }
    if (e.key !== 'Tab') return;
    const foco = [botao, ...menu.querySelectorAll('a')];
    const primeiro = foco[0], ultimo = foco[foco.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
  });
  celular.addEventListener('change', ajustar);
  ajustar();
}

/**
 * Monta cabeçalho, menu do perfil, breadcrumb e assistente. Chamada uma vez por página.
 * @param {{perfil?: 'familia'|'professor'|'escola'|'rede'|null, pagina?: string, assistente?: boolean, titulo?: string, voltar?: string, papel?: string, estreito?: boolean}} opcoes
 *   titulo: nome da página quando ela não está no menu (ex.: declaração); papel: nome exibido do usuário (escola);
 *   estreito: limita a largura do conteúdo (formulários e documentos).
 * @returns {Promise<HTMLElement>} O elemento onde a página desenha seu conteúdo.
 */
export async function iniciar({ perfil = null, pagina = '', assistente = false, titulo = '', papel = '', estreito = false } = {}) {
  aplicarEscala();
  if (perfil) definir('perfil', perfil);
  document.body.dataset.visao = perfil || 'geral';
  const topo = cabecalho({ perfil, papel });
  document.body.prepend(topo);

  const main = document.querySelector('main');
  const menu = MENUS[perfil] || [];
  if (menu.length) {
    const atual = itemAtual(menu, pagina);
    const conteudo = main.innerHTML;
    main.innerHTML = `
      <div class="com-menu">
        <nav id="menu-lateral" class="menu" aria-label="Seções de ${esc(NOMES[perfil])}">
          <p class="menu-titulo">${esc(NOMES[perfil])}</p>
          ${menu.map(([h, t, i]) => `<a href="${url(h)}" ${atual && atual[0] === h ? 'aria-current="page"' : ''} title="${esc(t)}">${icone(i, 22)}<span class="menu-rotulo">${esc(t)}</span></a>`).join('')}
        </nav>
        <div class="area${estreito ? ' estreita' : ''}">
          <div class="area-topo">${breadcrumb({ perfil, menu, atual, titulo })}<div id="topo-acoes" class="topo-acoes"></div></div>
          <section id="pagina">${conteudo}</section>
        </div>
      </div>`;
    configurarMenu(topo, main.querySelector('.com-menu'), main.querySelector('#menu-lateral'), main.querySelector('.area'));
  }
  if (assistente) {
    const { montarAssistente } = await import('./assistente/chat.js');
    montarAssistente({ perfil });
  }
  return document.querySelector('#pagina') || main;
}

export const link = url;
/** Espaço à direita do breadcrumb (ex.: botão Ouvir da matrícula). */
export const acoesDoTopo = () => document.querySelector('#topo-acoes');

/** Estado de erro padrão: aviso em português e botão "Tentar de novo". */
export function falhaDados(alvo, tentarDeNovo) {
  alvo.innerHTML = `<div class="alerta-erro" role="alert">${icone('alerta', 20)}<span>Não foi possível carregar estas informações agora.</span></div>
    <p><button type="button" class="botao botao-secundario" id="tentar-dados">Tentar de novo</button></p>`;
  alvo.querySelector('#tentar-dados').addEventListener('click', tentarDeNovo);
}
