// Inicialização comum a todas as páginas: cabeçalho institucional, menu lateral, breadcrumb e assistente.
import { icone, esc } from './ui.js';
import { aplicarEscala, mudarEscala } from './acessibilidade.js';
import { definir } from './estado.js';
import { RAIZ, letivo, estudantes } from './dados.js';
import { faixaDaSerie } from './dominio/painel.js';
import { sessao, exigirPerfil, sair } from './auth.js';

const url = (caminho) => new URL(caminho, RAIZ).href;
const VERSAO = '1.0';
// Service worker: guarda a carteirinha e o diário para abrirem sem internet. Só em https ou localhost.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  navigator.serviceWorker.register(new URL('sw.js', RAIZ)).catch(() => { /* sem service worker o portal funciona igual, só não abre sem internet */ });
}
const DATA_DOS_DADOS = '07/10/2026'; // data de referência dos dados de demonstração (igual a dataReferencia em data/letivo.json)

/** Itens do menu lateral de cada visão: [página, rótulo, ícone]. */
export const MENUS = {
  familia: [['familia/matricula.html', 'Matrícula', 'formulario'], ['familia/mapa.html', 'Escolas com vaga', 'mapa'], ['familia/guia.html', 'Ouvir instruções', 'alto']],
  aluno: [['aluno/index.html', 'Início', 'usuario'], ['aluno/notas.html', 'Notas e faltas', 'livro'], ['aluno/frequencia.html', 'Frequência', 'grafico'], ['aluno/horario.html', 'Meu horário', 'relogio'], ['aluno/rotina.html', 'Provas e rotina', 'lista'], ['aluno/quiz.html', 'Quiz', 'pergunta'], ['aluno/carteirinha.html', 'Carteirinha', 'cartao'], ['aluno/linha-do-tempo.html', 'Vida escolar', 'linha'], ['aluno/boletim-falado.html', 'Boletim falado', 'alto'], ['aluno/documentos.html', 'Documentos', 'documento'], ['aluno/calendario.html', 'Calendário e avisos', 'calendario'], ['aluno/cadastro.html', 'Meus dados', 'cadastro'], ['configuracoes.html', 'Configurações', 'engrenagem']],
  responsavel: [['responsavel/index.html', 'Início', 'usuario'], ['responsavel/boletim.html', 'Notas e faltas', 'livro'], ['responsavel/calendario.html', 'Calendário e avisos', 'calendario'], ['responsavel/matricula.html', 'Matrícula e documentos', 'documento'], ['configuracoes.html', 'Configurações', 'engrenagem']],
  professor: [['professor/index.html', 'Minhas turmas', 'livro'], ['professor/diario.html', 'Diário de classe', 'formulario'], ['professor/mapa.html', 'Mapa de calor', 'grafico'], ['professor/horario.html', 'Meu horário', 'relogio'], ['professor/materiais.html', 'Materiais e planos', 'caixa'], ['professor/comunicados.html', 'Comunicados', 'megafone'], ['professor/avisos.html', 'Avisos', 'calendario'], ['configuracoes.html', 'Configurações', 'engrenagem']],
  escola: [['escola/index.html', 'Início', 'escola'], ['escola/solicitacoes.html', 'Solicitações', 'lista'], ['escola/matriculas.html', 'Matrículas', 'formulario'], ['escola/estudantes.html', 'Estudantes', 'usuario'], ['escola/enturmacao.html', 'Enturmação', 'pessoas'], ['escola/turmas.html', 'Turmas', 'usuario'], ['escola/alocacao.html', 'Alocação', 'livro'], ['escola/professores.html', 'Professores habilitados', 'pessoas'], ['escola/equivalencias.html', 'Equivalências', 'trocar'], ['escola/avisos.html', 'Avisos', 'calendario'], ['configuracoes.html', 'Configurações', 'engrenagem']],
  diretor: [['diretor/index.html', 'Visão da escola', 'escola'], ['diretor/mapa.html', 'Mapa de calor', 'grafico'], ['diretor/reuniao.html', 'Tela de reunião', 'imprimir'], ['diretor/comunicados.html', 'Comunicados', 'megafone'], ['diretor/atos.html', 'Atos autorizativos', 'documento'], ['configuracoes.html', 'Configurações', 'engrenagem']],
  coordenador: [['coordenador/index.html', 'Turmas e desempenho', 'grafico'], ['coordenador/comparativo.html', 'Comparar turmas', 'trocar'], ['coordenador/reuniao.html', 'Reunião pedagógica', 'imprimir'], ['coordenador/horarios.html', 'Horários', 'relogio'], ['configuracoes.html', 'Configurações', 'engrenagem']],
  rede: [['rede/atos.html', 'Atos autorizativos', 'documento'], ['rede/vagas.html', 'Vagas por escola', 'escola'], ['rede/mapa.html', 'Mapa de vagas', 'mapa'], ['rede/professores.html', 'Professores habilitados', 'pessoas'], ['rede/matrizes.html', 'Matrizes curriculares', 'livro'], ['configuracoes.html', 'Configurações', 'engrenagem']],
  profin: [['profin/index.html', 'Painel por escola', 'moeda'], ['profin/relatorio.html', 'Relatório consolidado', 'documento'], ['configuracoes.html', 'Configurações', 'engrenagem']]
};
const NOMES = { familia: 'Matrícula', aluno: 'Aluno', responsavel: 'Responsável', professor: 'Professor', escola: 'Secretaria', diretor: 'Direção', coordenador: 'Coordenação', rede: 'Rede (SEDUC e DRE)', profin: 'PROFIN' };
const CHAVE_MENU = 'portal-menu-recolhido';
const lerPreferencia = () => { try { return localStorage.getItem(CHAVE_MENU) === '1'; } catch { return false; } };
const gravarPreferencia = (v) => { try { localStorage.setItem(CHAVE_MENU, v ? '1' : '0'); } catch { /* segue sem guardar */ } };
const iniciais = (nome) => nome.replace(/^(Profa?\.|Dr\.|Dra\.)\s+/, '').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

function cabecalho({ perfil }) {
  const login = sessao();
  const u = perfil && perfil !== 'familia' && login?.perfil === perfil ? login : null; // matrícula é pública: sem usuário no cabeçalho
  const topo = document.createElement('header');
  topo.className = 'topo';
  topo.innerHTML = `
    <div class="topo-interno">
      ${perfil ? `<button type="button" class="ferramenta topo-menu-botao" aria-controls="menu-lateral" aria-expanded="false" aria-label="Abrir menu">${icone('menu', 22)}<span class="rotulo-menu">Menu</span></button>` : ''}
      <a class="marca" href="${url('index.html')}" aria-label="Portal Acadêmico, página inicial">
        <span class="marca-texto"><small>Secretaria de Estado da Educação · Sergipe</small><strong>Portal Acadêmico</strong></span>
      </a>
      <span class="topo-ano" id="topo-ano"></span>
      <div class="topo-direita">
        <button type="button" class="ferramenta ferramenta-opcional" data-escala="-0.1" aria-label="Diminuir letra">A−</button>
        <button type="button" class="ferramenta" data-escala="0.1" aria-label="Aumentar letra">A+</button>
        ${perfil ? `<button type="button" class="ferramenta ferramenta-como-usar" data-tour aria-label="Como usar esta área">${icone('info', 20)}<span class="rotulo">Como usar</span></button>` : ''}
        ${window.botaoTema ? window.botaoTema() : ''}
        ${u ? `<div class="usuario"><span class="avatar" aria-hidden="true">${esc(iniciais(u.nome))}</span><span class="usuario-texto"><strong>${esc(u.nome)}</strong><small>${esc(u.papel)}</small></span></div>` : ''}
        ${perfil && perfil !== 'familia' ? `<a class="ferramenta topo-config" href="${url('configuracoes.html')}" aria-label="Configurações">${icone('engrenagem', 20)}<span class="rotulo">Configurações</span></a>` : ''}
        ${u ? '<button type="button" class="ferramenta" data-sair>Sair</button>' : perfil ? `<a class="ferramenta" href="${url('index.html')}">Início</a>` : ''}
      </div>
    </div>`;
  topo.addEventListener('click', (e) => {
    const b = e.target.closest('[data-escala]');
    if (b) mudarEscala(Number(b.dataset.escala));
    if (e.target.closest('[data-sair]')) sair();
    const como = e.target.closest('[data-tour]');
    if (como) import('./tour.js').then((t) => t.abrirTour(perfil, como));
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
  if (perfil && menu.length) passos.push([NOMES[perfil], url(menu[0][0])]);
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

// Visual por faixa etária: "iniciais", "finais" ou "medio" (data-faixa no body). Vem da série do estudante logado; a escolha
// "Ver visual" (guardada no navegador) existe para comparar os três desenhos na demonstração.
const CHAVE_FAIXA = 'portal-faixa';
export const faixaEscolhida = () => { try { return localStorage.getItem(CHAVE_FAIXA) || ''; } catch { return ''; } };
export function escolherFaixa(valor) { try { if (valor) localStorage.setItem(CHAVE_FAIXA, valor); else localStorage.removeItem(CHAVE_FAIXA); } catch { /* sem armazenamento: vale só nesta página */ } document.body.dataset.faixa = valor || document.body.dataset.faixaAuto; }
async function aplicarFaixa() {
  try {
    const { atual } = await estudantes();
    document.body.dataset.faixaAuto = faixaDaSerie(atual.serie);
    document.body.dataset.faixa = faixaEscolhida() || document.body.dataset.faixaAuto;
  } catch { document.body.dataset.faixa = faixaEscolhida() || 'medio'; document.body.dataset.faixaAuto = 'medio'; }
}

// Modo simplificado do responsável: reduz a tela ao essencial (nota, falta, próxima data). Fica guardado no navegador.
const CHAVE_SIMPLES = 'portal-modo-simples';
const lerSimples = () => { try { return localStorage.getItem(CHAVE_SIMPLES) === '1'; } catch { return false; } };
/** Chave "Modo simplificado" (use uma vez por tela; o clique é tratado aqui). */
export const controleModoSimples = () => `<label class="chave-simples" id="modo-simples"><input type="checkbox" data-modo-simples ${lerSimples() ? 'checked' : ''}><span>Modo simplificado: só nota, faltas e próxima data</span></label>`;
document.addEventListener('change', (e) => {
  if (!e.target.matches?.('[data-modo-simples]')) return;
  try { localStorage.setItem(CHAVE_SIMPLES, e.target.checked ? '1' : '0'); } catch { /* vale só nesta página */ }
  document.body.classList.toggle('modo-simples', e.target.checked);
});

/**
 * Monta cabeçalho, menu do perfil, breadcrumb e assistente. Chamada uma vez por página.
 * @param {{perfil?: 'familia'|'aluno'|'responsavel'|'professor'|'escola'|'diretor'|'coordenador'|'rede'|'profin'|null, pagina?: string, assistente?: boolean, titulo?: string, voltar?: string, papel?: string, estreito?: boolean}} opcoes
 *   titulo: nome da página quando ela não está no menu (ex.: declaração); papel: sem efeito, o nome vem da sessão;
 *   estreito: limita a largura do conteúdo (formulários e documentos).
 * @returns {Promise<HTMLElement>} O elemento onde a página desenha seu conteúdo.
 */
export async function iniciar({ perfil = null, pagina = '', assistente = false, titulo = '', papel = '', estreito = false } = {}) {
  aplicarEscala();
  // Páginas internas exigem o login do perfil; sem ele, o navegador já foi levado ao login e a página nunca termina de montar.
  if (perfil && perfil !== 'familia' && !exigirPerfil(perfil)) await new Promise(() => {});
  if (perfil) definir('perfil', perfil);
  document.body.dataset.visao = perfil || 'geral';
  if (perfil === 'aluno') await aplicarFaixa();
  if (perfil === 'responsavel') document.body.classList.toggle('modo-simples', lerSimples());
  const topo = cabecalho({ perfil });
  document.body.prepend(topo);
  // Ano letivo e bimestre em curso no cabeçalho (dados de data/letivo.json).
  letivo().then((l) => {
    const emCurso = Math.min(l.totalBimestres, l.bimestresLancados + 1);
    topo.querySelector('#topo-ano').textContent = `Ano letivo ${l.ano} · ${emCurso}º bimestre em curso`;
  }).catch(() => { /* sem o dado, o cabeçalho segue sem essa linha */ });
  const rodape = document.createElement('footer');
  rodape.className = 'rodape-sistema';
  rodape.innerHTML = `<span>Portal Acadêmico v${VERSAO} · SEDUC/SE</span><span>Protótipo com escolas, pessoas e dados fictícios · dados de ${DATA_DOS_DADOS}</span>`;
  document.body.append(rodape);

  // Entrada suave do conteúdo só na abertura da página (não repete a cada atualização da tela); desligada em "reduzir movimento".
  // Cartões abaixo da dobra aparecem ao rolar (com reserva: em 3 s tudo fica visível).
  const semMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.movimento === 'reduzido';
  if (!semMovimento && 'IntersectionObserver' in window) {
    const alvos = () => [...document.querySelectorAll('#pagina .bloco, #pagina .materias, #pagina .numeros, #pagina .tabela-rolagem, #pagina .alerta-info')].filter((e) => !e.classList.contains('revelar') && e.getBoundingClientRect().top > innerHeight);
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visivel'); io.unobserve(e.target); } }), { threshold: 0.1 });
    setTimeout(() => { alvos().forEach((e) => { e.classList.add('revelar'); io.observe(e); }); setTimeout(() => document.querySelectorAll('.revelar:not(.visivel)').forEach((e) => e.classList.add('visivel')), 3000); }, 1500);
  }
  if (!semMovimento) { document.body.classList.add('entrando'); setTimeout(() => document.body.classList.remove('entrando'), 2200); }
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
          ${sessao()?.perfil === perfil ? `<div class="menu-conta so-celular"><span class="avatar" aria-hidden="true">${esc(iniciais(sessao().nome))}</span><span class="menu-conta-texto"><strong>${esc(sessao().nome)}</strong><small>${esc(sessao().papel)}</small></span><button type="button" class="botao botao-secundario botao-mini" data-sair-menu>Sair</button></div>` : ''}
        </nav>
        <div class="area${estreito ? ' estreita' : ''}">
          <div class="area-topo">${breadcrumb({ perfil, menu, atual, titulo })}<div id="topo-acoes" class="topo-acoes"></div></div>
          <section id="pagina">${conteudo}</section>
        </div>
      </div>`;
    configurarMenu(topo, main.querySelector('.com-menu'), main.querySelector('#menu-lateral'), main.querySelector('.area'));
    main.querySelector('[data-sair-menu]')?.addEventListener('click', sair);
  }
  if (assistente) {
    const { montarAssistente } = await import('./assistente/chat.js');
    montarAssistente({ perfil });
  }
  // Guia de primeiro acesso da visão (só abre uma vez; "Como usar" no cabeçalho abre de novo).
  if (perfil) import('./tour.js').then((t) => t.tourNoPrimeiroAcesso(perfil, topo.querySelector('[data-tour]')));
  return document.querySelector('#pagina') || main;
}

export const link = url;
/** Espaço à direita do breadcrumb (ex.: botão Ouvir da matrícula). */
export const acoesDoTopo = () => document.querySelector('#topo-acoes');

/** Estado de erro padrão: aviso em português e botão "Tentar de novo". */
export function falhaDados(alvo, tentarDeNovo) {
  alvo.innerHTML = `<div class="alerta-erro" role="alert">${icone('alerta', 20)}<span>Os dados desta tela não carregaram. Confira a conexão e tente de novo.</span></div>
    <p><button type="button" class="botao botao-secundario" id="tentar-dados">Tentar de novo</button></p>`;
  alvo.querySelector('#tentar-dados').addEventListener('click', tentarDeNovo);
}
