// Utilitários de interface: escape de texto, ícones, aviso rápido e janela de texto.
/** Escapa texto para uso seguro dentro de HTML (evita injeção de código). */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, raiz = document) => raiz.querySelector(sel);

const PATHS = {
  usuario: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  livro: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M9 7h6',
  calendario: 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4',
  conversa: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z',
  formulario: 'M9 3h6v3H9zM7 5H5v16h14V5h-2M8 11h8M8 15h5',
  alto: 'M4 9v6h4l5 4V5L8 9zM16 9a3 3 0 0 1 0 6M18.5 6.5a7 7 0 0 1 0 11',
  microfone: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  escola: 'M2 10l10-5 10 5-10 5zM6 12v5c3.5 2.5 8.5 2.5 12 0v-5',
  documento: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6',
  fechar: 'M6 6l12 12M18 6L6 18',
  enviar: 'M4 12l16-8-6 16-3-7z',
  voltar: 'M15 6l-6 6 6 6',
  ok: 'M5 12l5 5 9-10',
  rede: 'M4 21h16M6 21V10M18 21V10M12 3l9 5H3zM10 21v-6h4v6',
  alerta: 'M12 3l10 18H2zM12 10v4M12 17.5v.5',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7.5v.5',
  seta: 'M5 12h14M13 6l6 6-6 6',
  grade: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  camadas: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  pessoas: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-4-6.3',
  caixa: 'M3 13l3-9h12l3 9v7H3zM3 13h5l1 3h6l1-3h5',
  megafone: 'M3 10v4l11 5V5zM14 8h2a4 4 0 0 1 0 8h-2M6 14l1.2 5H10l-1-4',
  baixar: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  busca: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
  imprimir: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',
  relogio: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  trocar: 'M4 7h13l-3-3M20 17H7l3 3',
  cadeado: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  mais: 'M12 5v14M5 12h14',
  menu: 'M4 6h16M4 12h16M4 18h16',
  celular: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2',
  mapa: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  cartao: 'M3 6h18v12H3zM3 10h18M7 15h4',
  pin: 'M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4',
  verificado: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6zM9 12l2 2 4-4',
  semrede: 'M2 8.8a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01',
  voltar: 'M11 6l-6 6 6 6M5 12h14',
  repetir: 'M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5',
  linha: 'M6 3v18M6 7h8M6 12h12M6 17h8',
  grafico: 'M5 20V11M12 20V4M19 20v-6M3 20h18',
  selo: 'M12 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM8.5 13.5L7 21l5-3 5 3-1.5-7.5',
  alvo: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  moeda: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM14.8 9.2A3 2.4 0 0 0 12 7.6c-1.7 0-2.8.8-2.8 2s1.1 1.7 2.8 2.1 2.8.9 2.8 2.1-1.1 2-2.8 2a3 2.4 0 0 1-2.8-1.6M12 5.5v2M12 16.5v2',
  calculadora: 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01',
  pergunta: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5M12 17h.01',
  lista: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  olho: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  bandeira: 'M5 21V4M5 4h11l-2 4 2 4H5',
  estrela: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  cadastro: 'M5 4h14v16H5zM9 9a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM8 16a3 3 0 0 1 6 0M16 9h1M16 12h1'
};
/** SVG de ícone pelo nome (ver PATHS). Decorativo: fica oculto para leitores de tela. */
export const icone = (nome, tam = 22) =>
  `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${PATHS[nome]}"/></svg>`;

let timerAviso;
const ERRO_NO_TEXTO = /n[ãa]o foi poss[ií]vel|inv[áa]lid|falha|erro/i;
/**
 * Aviso rápido (toast) com ícone e botão de fechar. A região de status existe desde o carregamento,
 * vazia, para os leitores de tela anunciarem o texto quando ele muda.
 * @param {string} texto
 * @param {'ok'|'erro'|'info'} [tipo] Se omitido, "erro" quando o texto fala de falha; senão "ok".
 */
export function avisar(texto, tipo = ERRO_NO_TEXTO.test(texto) ? 'erro' : 'ok') {
  const el = regiaoDeAviso();
  el.className = `aviso-rapido visivel ${tipo}`;
  el.querySelector('.aviso-icone').innerHTML = icone(tipo === 'ok' ? 'ok' : tipo === 'erro' ? 'alerta' : 'info', 20);
  el.querySelector('.aviso-texto').textContent = texto;
  clearTimeout(timerAviso);
  timerAviso = setTimeout(esconderAviso, 6000);
}
function esconderAviso() {
  const el = $('#aviso-rapido');
  if (!el) return;
  el.classList.remove('visivel');
  el.querySelector('.aviso-texto').textContent = '';
}
function regiaoDeAviso() {
  let el = $('#aviso-rapido');
  if (!el) {
    el = document.createElement('div');
    el.id = 'aviso-rapido';
    el.className = 'aviso-rapido';
    el.innerHTML = `<span class="aviso-icone" aria-hidden="true"></span><span class="aviso-texto" id="aviso-texto" role="status"></span><button type="button" class="aviso-fechar" aria-label="Fechar aviso">${icone('fechar', 18)}</button>`;
    el.querySelector('.aviso-fechar').addEventListener('click', esconderAviso);
    document.body.appendChild(el);
  }
  return el;
}
regiaoDeAviso();

/**
 * Abre uma janela de diálogo nativa (<dialog>): o navegador prende o foco dentro dela, deixa o resto da
 * página inativo e fecha com Esc. Ao fechar, o foco volta para o elemento que a abriu.
 * @param {string} html Conteúdo da janela.
 * @param {{papel?: string, foco: string, aoClicar: (e: Event, fechar: (valor: any) => void) => void}} opcoes
 * @returns {Promise<any>} Valor passado a fechar(), ou null se a pessoa apertou Esc.
 */
export function abrirJanela(html, { papel = 'dialog', foco, aoClicar }) {
  return new Promise((resolver) => {
    const janela = document.createElement('dialog');
    janela.className = 'janela';
    janela.setAttribute('role', papel);
    janela.innerHTML = html;
    const titulo = $('h2', janela);
    if (titulo) janela.setAttribute('aria-labelledby', titulo.id);
    if ($('#confirmar-texto', janela)) janela.setAttribute('aria-describedby', 'confirmar-texto');
    const anterior = document.activeElement;
    let valor = null;
    const fechar = (v) => { valor = v; janela.close(); };
    janela.addEventListener('click', (e) => aoClicar(e, fechar));
    janela.addEventListener('close', () => { janela.remove(); anterior?.focus?.(); resolver(valor); });
    document.body.appendChild(janela);
    janela.showModal();
    $(foco, janela).focus();
  });
}

/**
 * Pede um texto obrigatório (justificativas, motivos).
 * Clicar fora da janela não fecha, para não perder o que foi digitado; Esc cancela.
 * @returns {Promise<string|null>} O texto ou null se cancelado.
 */
export function pedirTexto({ titulo, rotulo, minimo = 5 }) {
  const html = `
    <h2 id="janela-titulo" class="esp-t-0">${esc(titulo)}</h2>
    <div class="campo">
      <label for="janela-texto">${esc(rotulo)}</label>
      <textarea id="janela-texto" class="entrada" aria-describedby="janela-erro"></textarea>
      <p id="janela-erro" class="erro" role="alert"></p>
    </div>
    <div class="linha-botoes fim">
      <button type="button" class="botao botao-secundario" data-acao="cancelar">Cancelar</button>
      <button type="button" class="botao" data-acao="confirmar">Confirmar</button>
    </div>`;
  return abrirJanela(html, {
    foco: '#janela-texto',
    aoClicar(e, fechar) {
      const acao = e.target.closest('[data-acao]')?.dataset.acao;
      if (acao === 'cancelar') fechar(null);
      if (acao !== 'confirmar') return;
      const janela = e.currentTarget;
      const campo = $('#janela-texto', janela);
      const v = campo.value.trim();
      if (v.length < minimo) {
        $('#janela-erro', janela).textContent = `Escreva pelo menos ${minimo} caracteres. O texto fica registrado.`;
        campo.setAttribute('aria-invalid', 'true');
        campo.focus();
        return;
      }
      fechar(v);
    }
  });
}

/** Escolhe singular ou plural conforme a quantidade. */
export const plural = (n, singular, pluralTexto) => (n === 1 ? singular : pluralTexto);

export const hojeBR = () => new Date().toLocaleDateString('pt-BR');
/** Data ISO (AAAA-MM-DD) para dd/mm/aaaa. */
export const dataBR = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');
/** Número no formato brasileiro (vírgula decimal). */
export const numeroBR = (n, casas = 1) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

const ICONE_SELO = { ok: 'ok', atencao: 'alerta', erro: 'fechar', info: 'info', neutra: '' };
/** Selo de situação: cor + ícone + texto (o status nunca depende só da cor). @param {'ok'|'atencao'|'erro'|'info'|'neutra'} tipo */
export function etiqueta(texto, tipo = 'neutra') {
  const nome = ICONE_SELO[tipo];
  return `<span class="etiqueta etiqueta-${tipo}">${nome ? icone(nome, 14) : ''}${esc(texto)}</span>`;
}

export const dataHoraBR = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/**
 * Confirmação antes de ações que não dá para desfazer. O foco começa em "Cancelar".
 * @returns {Promise<boolean>} True se a pessoa confirmou; false ao cancelar, clicar fora ou apertar Esc.
 */
export function confirmar({ titulo, texto, botao = 'Confirmar', perigo = false }) {
  const html = `
    <h2 id="confirmar-titulo" class="esp-t-0">${esc(titulo)}</h2>
    <p id="confirmar-texto">${esc(texto)}</p>
    <div class="linha-botoes fim">
      <button type="button" class="botao botao-secundario" data-acao="nao">Cancelar</button>
      <button type="button" class="botao${perigo ? ' botao-perigo' : ''}" data-acao="sim">${esc(botao)}</button>
    </div>`;
  return abrirJanela(html, {
    papel: 'alertdialog',
    foco: '[data-acao="nao"]',
    aoClicar(e, fechar) {
      const acao = e.target.closest('[data-acao]')?.dataset.acao;
      if (e.target === e.currentTarget || acao === 'nao') fechar(false);
      if (acao === 'sim') fechar(true);
    }
  }).then((v) => v === true);
}

// Estado vazio com explicação do que aparece ali e, se houver, o próximo passo.
/** Estado vazio: só texto, com o que aparece ali e o próximo passo. */
export const vazio = (titulo, texto) =>
  `<div class="estado-vazio"><strong>${esc(titulo)}</strong><span>${esc(texto)}</span></div>`;

// Exporta linhas para CSV que abre direto no Excel em português (ponto e vírgula e BOM UTF-8).
/** Baixa uma tabela em CSV (ponto e vírgula e BOM UTF-8, abre direto no Excel em português). */
export function baixarCSV(nomeArquivo, cabecalho, linhas) {
  const celula = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const texto = [cabecalho, ...linhas].map((l) => l.map(celula).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff' + texto], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Busca sem acento e sem diferença de maiúsculas.
/** Texto em minúsculas e sem acentos, para buscas. */
export const normalizar = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
/** True se o termo (sem acento e sem diferença de maiúsculas) aparece em algum dos campos. */
export const combina = (termo, ...campos) => !termo || campos.some((c) => normalizar(c).includes(normalizar(termo)));

/**
 * Adia a execução de uma função até a pessoa parar de digitar (usado nas buscas).
 * @param {Function} fn
 * @param {number} [espera] Milissegundos.
 */
export function debounce(fn, espera = 200) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), espera); };
}

/**
 * Executa uma ação assíncrona mostrando o botão como "salvando" (spinner, desativado) até terminar.
 * @param {HTMLButtonElement|null} botao
 * @param {() => Promise<any>} acao
 */
export async function comEspera(botao, acao) {
  if (botao) { botao.setAttribute('aria-busy', 'true'); botao.disabled = true; }
  try { return await acao(); } finally {
    if (botao?.isConnected) { botao.removeAttribute('aria-busy'); botao.disabled = false; }
  }
}
