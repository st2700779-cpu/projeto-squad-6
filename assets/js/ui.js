// Utilitários de interface: escape de texto, ícones, aviso rápido e janela de texto.
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
  mais: 'M12 5v14M5 12h14'
};
export const icone = (nome, tam = 22) =>
  `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" style="flex:none"><path d="${PATHS[nome]}"/></svg>`;

let timerAviso;
export function avisar(texto) {
  let el = $('#aviso-rapido');
  if (!el) {
    el = document.createElement('div');
    el.id = 'aviso-rapido';
    el.className = 'aviso-rapido';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = texto;
  el.hidden = false;
  clearTimeout(timerAviso);
  timerAviso = setTimeout(() => { el.hidden = true; }, 3500);
}

// Pede um texto obrigatório (justificativas, motivos). Devolve o texto ou null se cancelado.
export function pedirTexto({ titulo, rotulo, minimo = 5 }) {
  return new Promise((resolver) => {
    const fundo = document.createElement('div');
    fundo.className = 'fundo-janela';
    fundo.innerHTML = `
      <div class="janela" role="dialog" aria-modal="true" aria-labelledby="janela-titulo">
        <h2 id="janela-titulo" style="margin-top:0">${esc(titulo)}</h2>
        <div class="campo">
          <label for="janela-texto">${esc(rotulo)}</label>
          <textarea id="janela-texto" class="entrada" aria-describedby="janela-erro"></textarea>
          <p id="janela-erro" class="erro" role="alert"></p>
        </div>
        <div class="linha-botoes" style="justify-content:flex-end">
          <button type="button" class="botao botao-secundario" data-acao="cancelar">Cancelar</button>
          <button type="button" class="botao" data-acao="confirmar">Confirmar</button>
        </div>
      </div>`;
    const anterior = document.activeElement;
    document.body.appendChild(fundo);
    const campo = $('#janela-texto', fundo);
    campo.focus();
    const fechar = (valor) => { fundo.remove(); anterior?.focus?.(); resolver(valor); };
    fundo.addEventListener('click', (e) => {
      const acao = e.target.closest('[data-acao]')?.dataset.acao;
      if (e.target === fundo || acao === 'cancelar') fechar(null);
      if (acao === 'confirmar') {
        const v = campo.value.trim();
        if (v.length < minimo) {
          $('#janela-erro', fundo).textContent = `Escreva pelo menos ${minimo} caracteres. O texto fica registrado.`;
          campo.setAttribute('aria-invalid', 'true');
          campo.focus();
          return;
        }
        fechar(v);
      }
    });
    fundo.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(null); });
  });
}

export const hojeBR = () => new Date().toLocaleDateString('pt-BR');
export const dataBR = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');
export const numeroBR = (n, casas = 1) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

export function etiqueta(texto, tipo = 'neutra') {
  return `<span class="etiqueta etiqueta-${tipo}">${esc(texto)}</span>`;
}

export const dataHoraBR = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Confirmação antes de ações que não dá para desfazer. Devolve true ou false.
export function confirmar({ titulo, texto, botao = 'Confirmar', perigo = false }) {
  return new Promise((resolver) => {
    const fundo = document.createElement('div');
    fundo.className = 'fundo-janela';
    fundo.innerHTML = `
      <div class="janela" role="alertdialog" aria-modal="true" aria-labelledby="confirmar-titulo" aria-describedby="confirmar-texto">
        <h2 id="confirmar-titulo" style="margin-top:0">${esc(titulo)}</h2>
        <p id="confirmar-texto">${esc(texto)}</p>
        <div class="linha-botoes" style="justify-content:flex-end">
          <button type="button" class="botao botao-secundario" data-acao="nao">Cancelar</button>
          <button type="button" class="botao${perigo ? ' botao-perigo' : ''}" data-acao="sim">${esc(botao)}</button>
        </div>
      </div>`;
    const anterior = document.activeElement;
    document.body.appendChild(fundo);
    $('[data-acao="nao"]', fundo).focus();
    const fechar = (valor) => { fundo.remove(); anterior?.focus?.(); resolver(valor); };
    fundo.addEventListener('click', (e) => {
      const acao = e.target.closest('[data-acao]')?.dataset.acao;
      if (e.target === fundo || acao === 'nao') fechar(false);
      if (acao === 'sim') fechar(true);
    });
    fundo.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(false); });
  });
}

// Estado vazio com explicação do que aparece ali e, se houver, o próximo passo.
export const vazio = (titulo, texto, nomeIcone = 'info') =>
  `<div class="estado-vazio">${icone(nomeIcone, 32)}<strong>${esc(titulo)}</strong><span>${esc(texto)}</span></div>`;

// Exporta linhas para CSV que abre direto no Excel em português (ponto e vírgula e BOM UTF-8).
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
export const normalizar = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export const combina = (termo, ...campos) => !termo || campos.some((c) => normalizar(c).includes(normalizar(termo)));
