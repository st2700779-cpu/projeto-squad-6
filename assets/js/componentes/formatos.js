// Limites e pontuação de todos os campos do portal, num lugar só.
// Cada campo de texto ganha, pelo nome ou por data-formato, o tamanho máximo, o teclado certo no celular, o exemplo
// (placeholder) e a máscara com a pontuação brasileira enquanto a pessoa digita:
//   CPF 000.000.000-00 · telefone (79) 99999-9999 · CEP 00000-000 · INEP 8 números · NIS 000.00000.00-0
//   Cartão SUS 000 0000 0000 0000 · dinheiro 1.234,56 (digita os centavos) · e-mail em minúsculas, sem espaço, até 80 letras
//   matrícula funcional PF-00000 · protocolo MAT-2026-0007 em maiúsculas · número inteiro só com algarismos.
// Campos sem regra própria recebem um limite padrão (texto 120, busca 80, texto longo 1000). Campos numéricos (type=number)
// não aceitam "e", "+" nem "-" quando o mínimo é zero ou mais. O que já está no HTML (maxlength, placeholder...) é mantido.
// As mesmas regras de conteúdo são conferidas de novo ao salvar, em dominio/ (cadastros.js, portal-matricula.js...).
// Ativado uma vez por página em app.js (iniciar), vale para tudo o que for desenhado depois.

const dig = (v) => String(v ?? '').replace(/\D/g, '');

/** Máscaras: recebem o texto digitado e devolvem o texto com a pontuação. Todas podem ser aplicadas de novo sem estragar. */
export const MASCARAS = {
  cpf: (v) => dig(v).slice(0, 11).replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2'),
  cnpj: (v) => dig(v).slice(0, 14).replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2'),
  telefone: (v) => {
    const n = dig(v).slice(0, 11);
    if (n.length <= 2) return n ? `(${n}` : '';
    if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
    const corte = n.length > 10 ? 7 : 6;
    return `(${n.slice(0, 2)}) ${n.slice(2, corte)}-${n.slice(corte)}`;
  },
  cep: (v) => dig(v).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2'),
  inep: (v) => dig(v).slice(0, 8),
  nis: (v) => dig(v).slice(0, 11).replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{5})(\d)/, '$1.$2.$3').replace(/\.(\d{2})(\d)$/, '.$1-$2'),
  sus: (v) => dig(v).slice(0, 15).replace(/(\d{3})(\d{0,4})(\d{0,4})(\d{0,4})/, (_, a, b, c, d) => [a, b, c, d].filter(Boolean).join(' ')),
  /** RG 1.234.567-8: até 10 números (o último pode ser X), pontos e traço automáticos. */
  rg: (v) => {
    const t = String(v ?? '').toUpperCase().replace(/[^0-9X]/g, '');
    const x = t.endsWith('X') ? 'X' : '';
    const n = (x ? t.slice(0, -1) : t).replace(/X/g, '').slice(0, x ? 9 : 10);
    const s = n + x;
    if (s.length <= 1) return s;
    return `${s.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${s.slice(-1)}`;
  },
  inteiro: (v) => dig(v),
  matricula: (v) => dig(v).slice(0, 9),
  /** Matrícula funcional PF-00000: a pessoa digita os 5 números e o "PF-" entra sozinho. */
  funcional: (v) => { const n = dig(v).slice(0, 5); return n ? `PF-${n}` : ''; },
  /** 1.234,56: a pessoa digita só números e os dois últimos viram centavos (como no caixa eletrônico). Até 99.999.999,99. */
  dinheiro: (v) => {
    const n = dig(v).replace(/^0+/, '').slice(0, 10);
    if (!n) return '';
    const c = n.padStart(3, '0');
    return `${c.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${c.slice(-2)}`;
  },
  /** Nota de 0 a 10 com vírgula: "7,5", "10", "8,25" (ponto vira vírgula; no máximo 2 casas). */
  nota: (v) => { const [i = '', ...r] = String(v ?? '').replace(/\./g, ',').replace(/[^\d,]/g, '').split(','); return i.slice(0, 2) + (r.length ? `,${r.join('').slice(0, 2)}` : ''); },
  protocolo: (v) => String(v ?? '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 13),
  codigo: (v) => String(v ?? '').toUpperCase().replace(/[^A-Z0-9-]/g, '')
};

/** Atributos de cada formato (só entram os que o campo ainda não tem). */
export const FORMATOS = {
  cpf: { maxlength: 14, inputmode: 'numeric', placeholder: '000.000.000-00', autocomplete: 'off' },
  cnpj: { maxlength: 18, inputmode: 'numeric', placeholder: '00.000.000/0000-00', autocomplete: 'off' },
  telefone: { maxlength: 15, inputmode: 'tel', placeholder: '(79) 99999-9999', autocomplete: 'tel' },
  cep: { maxlength: 9, inputmode: 'numeric', placeholder: '00000-000', autocomplete: 'postal-code' },
  inep: { maxlength: 8, inputmode: 'numeric', placeholder: '8 números' },
  nis: { maxlength: 14, inputmode: 'numeric', placeholder: '000.00000.00-0' },
  sus: { maxlength: 18, inputmode: 'numeric', placeholder: '000 0000 0000 0000' },
  matricula: { maxlength: 9, inputmode: 'numeric', placeholder: '9 números' },
  funcional: { maxlength: 8, inputmode: 'numeric', placeholder: 'PF-00000', autocomplete: 'off' },
  rg: { maxlength: 14, placeholder: '1.234.567-8', autocomplete: 'off', autocapitalize: 'characters' },
  inteiro: { inputmode: 'numeric' },
  nota: { maxlength: 5, inputmode: 'decimal', autocomplete: 'off' },
  senha: { maxlength: 64 },
  login: { maxlength: 40, autocapitalize: 'none', spellcheck: 'false' },
  dinheiro: { maxlength: 13, inputmode: 'numeric', placeholder: '0,00', autocomplete: 'off' },
  email: { maxlength: 80, inputmode: 'email', autocomplete: 'email', spellcheck: 'false', autocapitalize: 'none', placeholder: 'nome@exemplo.com' },
  protocolo: { maxlength: 13, autocapitalize: 'characters', spellcheck: 'false' },
  codigo: { autocapitalize: 'characters', spellcheck: 'false' },
  nome: { maxlength: 120, autocapitalize: 'words' },
  texto: { maxlength: 120 },
  busca: { maxlength: 80 },
  area: { maxlength: 1000 }
};

const TIPOS_DE_TEXTO = ['text', 'tel', 'email', 'search', ''];
/** Formato do campo: o de data-formato ou o que o nome indica. */
export function formatoDe(el) {
  if (el.dataset.formato) return el.dataset.formato;
  if (el.tagName === 'TEXTAREA') return 'area';
  const tipo = (el.getAttribute('type') || '').toLowerCase();
  if (tipo === 'password') return 'senha';
  if (!TIPOS_DE_TEXTO.includes(tipo) || el.hasAttribute('data-campo-data') || el.readOnly) return null;
  const k = `${el.name || ''} ${el.id || ''}`.toLowerCase();
  if (/cpf/.test(k)) return 'cpf';
  if (/cnpj/.test(k)) return 'cnpj';
  if (/(^|[-_\s])rg($|\s)/.test(k)) return 'rg';
  if (tipo === 'email' || /e-?mail/.test(k)) return 'email';
  if (tipo === 'tel' || /telefone|celular/.test(k)) return 'telefone';
  if (/(^|[-_\s])cep($|\s)/.test(k)) return 'cep';
  if (/inep/.test(k)) return 'inep';
  if (/(^|[-_\s])nis($|\s)/.test(k)) return 'nis';
  if (/(^|[-_\s])sus($|\s)/.test(k)) return 'sus';
  if (/protocolo/.test(k)) return 'protocolo';
  if (/matriculafuncional/.test(k) || (/(^|[-_\s])matricula($|\s)/.test(k) && el.closest?.('#form-membro, [data-form="membro"], .form-equipe'))) return 'funcional';
  if (tipo === 'search' || /busca/.test(k)) return 'busca';
  if (/(^|[-_\s])(nome|respnome|filiacao\d?|responsavel|estudante)($|\s)/.test(k)) return 'nome';
  return 'texto';
}

/** Prepara um campo: atributos do formato e a máscara no valor que já veio preenchido. */
export function prepararCampo(el) {
  if (el.dataset.formatoPronto) return;
  el.dataset.formatoPronto = '1';
  const tipo = (el.getAttribute('type') || '').toLowerCase();
  if (el.tagName === 'INPUT' && tipo === 'number') {
    if (!el.hasAttribute('min')) el.setAttribute('min', '0');
    return;
  }
  const f = formatoDe(el);
  if (!f) return;
  el.dataset.formato = f;
  for (const [atr, valor] of Object.entries(FORMATOS[f] || {})) if (!el.hasAttribute(atr)) el.setAttribute(atr, String(valor));
  if (MASCARAS[f] && el.value) el.value = MASCARAS[f](el.value);
}
export const prepararTudo = (raiz = document) => raiz.querySelectorAll?.('input, textarea').forEach(prepararCampo);

/** Número de um campo de dinheiro ("1.234,56" → 1234.56). Vazio vira NaN. */
export const numeroDoDinheiro = (texto) => (String(texto ?? '').trim() === '' ? NaN : Number(String(texto).replace(/\./g, '').replace(',', '.')));
/** 1234.56 → "1.234,56" para pôr num campo de dinheiro. */
export const dinheiroParaCampo = (n) => (Number.isFinite(Number(n)) && n !== '' && n !== null ? MASCARAS.dinheiro(Math.round(Number(n) * 100).toString()) : '');

let ativo = false;
/** Liga as regras na página: prepara os campos que existem e os que forem desenhados depois. */
export function ativarFormatos() {
  if (ativo || typeof document === 'undefined') return;
  ativo = true;
  prepararTudo(document);
  new MutationObserver((mudancas) => {
    for (const m of mudancas) for (const no of m.addedNodes) {
      if (no.nodeType !== 1) continue;
      if (no.matches?.('input, textarea')) prepararCampo(no); else prepararTudo(no);
    }
  }).observe(document.body, { childList: true, subtree: true });
  // Máscara enquanto digita (o cursor vai para o fim, onde a pessoa está digitando).
  document.addEventListener('input', (e) => {
    const el = e.target;
    const f = el?.dataset?.formato;
    if (!f || !MASCARAS[f]) return;
    const novo = MASCARAS[f](el.value);
    if (novo !== el.value) {
      const noFim = el.selectionStart === el.value.length;
      el.value = novo;
      if (noFim) el.setSelectionRange?.(novo.length, novo.length);
    }
  }, true);
  // Ao sair do campo: e-mail sem espaço e em minúsculas; nomes e textos sem espaços repetidos.
  document.addEventListener('focusout', (e) => {
    const el = e.target;
    const f = el?.dataset?.formato;
    if (f === 'email') el.value = el.value.trim().toLowerCase();
    else if (f === 'nome' || f === 'texto') { const limpo = el.value.replace(/\s+/g, ' ').trim(); if (limpo !== el.value) el.value = limpo; }
  }, true);
  // Campos numéricos: sem "e", "+" e "-" quando não há número negativo.
  document.addEventListener('keydown', (e) => {
    const el = e.target;
    if (el?.tagName !== 'INPUT' || el.type !== 'number') return;
    const semNegativo = Number(el.getAttribute('min') ?? 0) >= 0;
    if (['e', 'E', '+'].includes(e.key) || (semNegativo && e.key === '-')) e.preventDefault();
  }, true);
}
