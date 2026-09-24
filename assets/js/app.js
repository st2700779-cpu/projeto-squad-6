// Inicialização comum a todas as páginas: cabeçalho, menu do perfil e assistente.
import { icone, esc } from './ui.js';
import { aplicarEscala, mudarEscala } from './acessibilidade.js';
import { definir } from './estado.js';
import { RAIZ } from './dados.js';

const url = (caminho) => new URL(caminho, RAIZ).href;

// Mapa de navegação (W16): professor e escola têm Avisos; a rede navega por abas.
export const MENUS = {
  familia: [],
  professor: [['professor/index.html', 'Minhas turmas', 'livro'], ['professor/diario.html', 'Diário de classe', 'formulario'], ['professor/avisos.html', 'Avisos', 'calendario']],
  escola: [['escola/index.html', 'Início', 'escola'], ['escola/matriculas.html', 'Matrículas', 'formulario'], ['escola/turmas.html', 'Turmas', 'usuario'], ['escola/avisos.html', 'Avisos', 'calendario']],
  rede: [['rede/atos.html', 'Atos autorizativos', 'documento'], ['rede/vagas.html', 'Vagas por escola', 'escola'], ['rede/matrizes.html', 'Matrizes curriculares', 'livro']]
};
const NOMES = { familia: 'Família', professor: 'Professor', escola: 'Escola', rede: 'Rede (SEDUC)' };

// perfil: familia | professor | escola | rede | null (tela inicial)
// papel: "Você está como" no cabeçalho (escola). titulo + voltar: cabeçalho de tela interna no celular (W3, W5): "‹ Título" e espaço para ações.
export async function iniciar({ perfil = null, pagina = '', assistente = false, titulo = '', voltar = '', papel = '' } = {}) {
  aplicarEscala();
  if (perfil) definir('perfil', perfil);
  const topo = document.createElement('header');
  topo.className = 'topo';
  if (titulo) {
    topo.innerHTML = `
      <div class="topo-interno topo-tela">
        ${voltar ? `<a class="topo-voltar" href="${url(voltar)}" aria-label="Voltar">${icone('voltar', 26)}</a>` : ''}
        <span class="topo-titulo">${esc(titulo)}</span>
        <div id="topo-acoes" class="topo-acoes"></div>
      </div>`;
  } else {
    topo.innerHTML = `
      <div class="topo-interno">
        <a class="marca" href="${url('index.html')}">Portal Acadêmico${perfil && perfil !== 'familia' ? `<span class="so-desktop"> · ${esc(NOMES[perfil])}</span>` : ''}</a>
        ${papel ? `<span class="topo-papel so-desktop">Você está como: <strong>${esc(papel)}</strong></span>` : ''}
        ${perfil ? '' : '<button type="button" class="ferramenta" data-escala="-0.1" aria-label="Diminuir letra">A−</button>'}
        <button type="button" class="ferramenta" data-escala="0.1" aria-label="Aumentar letra">A+</button>
        ${perfil ? `<a class="ferramenta" href="${url('index.html')}">Sair</a>` : ''}
      </div>`;
    topo.addEventListener('click', (e) => {
      const b = e.target.closest('[data-escala]');
      if (b) mudarEscala(Number(b.dataset.escala));
    });
  }
  document.body.prepend(topo);

  const main = document.querySelector('main');
  const menu = MENUS[perfil] || [];
  if (menu.length) {
    const conteudo = main.innerHTML;
    main.innerHTML = `
      <div class="com-menu">
        <nav class="menu" aria-label="Seções">${menu.map(([h, t, i]) => `<a href="${url(h)}"${h === pagina ? ' aria-current="page"' : ''}>${icone(i, 20)}${t}</a>`).join('')}</nav>
        <section id="pagina">${conteudo}</section>
      </div>`;
  }
  if (assistente) {
    const { montarAssistente } = await import('./assistente/chat.js');
    montarAssistente({ perfil });
  }
  return document.querySelector('#pagina') || main;
}

export const link = url;
// Espaço à direita do cabeçalho de tela interna (ex.: botão Ouvir da matrícula).
export const acoesDoTopo = () => document.querySelector('#topo-acoes');

// Mensagem padrão quando os dados não carregam.
export function falhaDados(alvo, tentarDeNovo) {
  alvo.innerHTML = `<div class="alerta-erro" role="alert">${icone('alerta', 20)}<span>Não foi possível carregar estas informações agora.</span></div>
    <p><button type="button" class="botao botao-secundario" id="tentar-dados">Tentar de novo</button></p>`;
  alvo.querySelector('#tentar-dados').addEventListener('click', tentarDeNovo);
}
