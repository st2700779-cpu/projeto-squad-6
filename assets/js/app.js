// Inicialização comum a todas as páginas: cabeçalho, menu do perfil e assistente.
import { icone, esc } from './ui.js';
import { aplicarEscala, mudarEscala } from './acessibilidade.js';
import { definir } from './estado.js';
import { RAIZ } from './dados.js';

const url = (caminho) => new URL(caminho, RAIZ).href;

export const MENUS = {
  familia: [],
  professor: [['professor/index.html', 'Minhas turmas', 'livro'], ['professor/diario.html', 'Diário de classe', 'formulario']],
  escola: [['escola/index.html', 'Início', 'grade'], ['escola/matriculas.html', 'Matrículas', 'caixa'], ['escola/turmas.html', 'Turmas', 'pessoas']],
  rede: [['rede/atos.html', 'Atos autorizativos', 'documento'], ['rede/vagas.html', 'Vagas por escola', 'escola'], ['rede/matrizes.html', 'Matrizes curriculares', 'camadas']]
};
const NOMES = { familia: 'Família e estudante', professor: 'Professor', escola: 'Escola', rede: 'Rede (SEDUC e DRE)' };

// perfil: familia | professor | escola | rede | null (tela inicial)
export async function iniciar({ perfil = null, pagina = '', assistente = false } = {}) {
  aplicarEscala();
  if (perfil) definir('perfil', perfil);
  const topo = document.createElement('header');
  topo.className = 'topo';
  topo.innerHTML = `
    <div class="topo-interno">
      <a class="marca" href="${url('index.html')}"><strong>Portal Acadêmico</strong><span>Rede Estadual de Sergipe · protótipo Squad 6</span></a>
      ${perfil ? `<span class="texto-suave so-desktop" style="font-size:.85rem">Você está como: ${esc(NOMES[perfil])}</span>` : ''}
      <button type="button" class="ferramenta" data-escala="-0.1" aria-label="Diminuir letra">A−</button>
      <button type="button" class="ferramenta" data-escala="0.1" aria-label="Aumentar letra">A+</button>
      ${perfil ? `<a class="ferramenta" href="${url('index.html')}">Trocar<span class="so-desktop">&nbsp;perfil</span></a>` : ''}
    </div>`;
  document.body.prepend(topo);
  topo.addEventListener('click', (e) => {
    const b = e.target.closest('[data-escala]');
    if (b) mudarEscala(Number(b.dataset.escala));
  });

  const main = document.querySelector('main');
  const menu = MENUS[perfil] || [];
  if (menu.length) {
    const conteudo = main.innerHTML;
    main.innerHTML = `
      <div class="aviso-prototipo">Protótipo de demonstração. Nomes, escolas e números são fictícios.</div>
      <div class="com-menu">
        <nav class="menu" aria-label="Seções">${menu.map(([h, t, i]) => `<a href="${url(h)}"${h.endsWith(pagina) ? ' aria-current="page"' : ''}>${icone(i, 20)}${t}</a>`).join('')}</nav>
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

// Mensagem padrão quando os dados simulados não carregam.
export function falhaDados(alvo, tentarDeNovo) {
  alvo.innerHTML = `<div class="alerta-erro" role="alert">${icone('alerta', 20)}<span>Não foi possível carregar estas informações agora.</span></div>
    <p><button type="button" class="botao botao-secundario" id="tentar-dados">Tentar de novo</button></p>`;
  alvo.querySelector('#tentar-dados').addEventListener('click', tentarDeNovo);
}
