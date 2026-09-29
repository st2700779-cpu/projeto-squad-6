// Confere o contraste dos tokens de assets/css/tema.css nos quatro temas (claro, escuro, alto contraste claro e escuro).
// Texto: mínimo 4,5:1. Componentes (bordas de campos e botões): mínimo 3:1.
// Uso (Node 18+, sem instalar nada):  node tools/verificar-contraste.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(fileURLToPath(new URL('../assets/css/tema.css', import.meta.url)), 'utf8');
const bloco = (inicio) => {
  const i = css.indexOf(inicio);
  if (i < 0) throw new Error(`Bloco não encontrado: ${inicio}`);
  const texto = css.slice(css.indexOf('{', i) + 1, css.indexOf('\n}', i));
  return Object.fromEntries([...texto.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
};
// Resolve referências var(--outro) até chegar a uma cor hexadecimal.
const resolver = (tema) => Object.fromEntries(Object.keys(tema).map((k) => {
  let v = tema[k];
  for (let i = 0; i < 5 && /^var\(--/.test(v); i += 1) v = tema[/var\(--([a-z0-9-]+)\)/.exec(v)[1]] ?? v;
  return [k, v];
}).filter(([, v]) => /^#[0-9a-fA-F]{6}$/.test(v)));
const claro = bloco(':root {');
const escuro = { ...claro, ...bloco(':root[data-tema="escuro"]:not([data-contraste="alto"]) {') };
const altoClaro = { ...claro, ...bloco(':root[data-contraste="alto"] {') };
const altoEscuro = { ...altoClaro, ...bloco(':root[data-tema="escuro"][data-contraste="alto"] {') };
const lum = (h) => {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const razao = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const TEXTO = [
  ['texto', 'superficie'], ['texto', 'fundo-app'], ['texto-suave', 'superficie'], ['texto-suave', 'fundo-app'], ['texto-suave', 'superficie-2'],
  ['cor-primaria', 'superficie'], ['cor-primaria', 'cor-primaria-suave'], ['sobre-primaria', 'cor-primaria'],
  ['sucesso', 'sucesso-fundo'], ['alerta', 'alerta-fundo'], ['erro', 'erro-fundo'], ['info', 'info-fundo'],
  ['sucesso', 'superficie'], ['erro', 'superficie'], ['sobre-erro', 'erro-solido'], ['cor-secundaria', 'superficie']
];
const COMPONENTE = [['borda-forte', 'superficie'], ['borda-forte', 'fundo-app'], ['foco', 'superficie'], ['erro', 'superficie']];
let falhas = 0;
const conferir = (tema, nome, a, b, minimo) => {
  const r = razao(a, b);
  const ok = r >= minimo;
  if (!ok) falhas += 1;
  console.log(`${ok ? 'ok   ' : 'FALHA'} [${tema}] ${nome}: ${r.toFixed(2)} (mín. ${minimo})`);
};
for (const [tema, bruto] of Object.entries({ claro, escuro, 'alto contraste claro': altoClaro, 'alto contraste escuro': altoEscuro })) {
  const t = resolver(bruto);
  for (const [a, b] of TEXTO) if (t[a] && t[b]) conferir(tema, `${a} sobre ${b}`, t[a], t[b], 4.5);
  for (const [a, b] of COMPONENTE) if (t[a] && t[b]) conferir(tema, `${a} sobre ${b} (componente)`, t[a], t[b], 3);
}
console.log(falhas ? `\n${falhas} combinação(ões) abaixo do mínimo.` : '\nTodas as combinações cumprem o mínimo.');
process.exit(falhas ? 1 : 0);
