// Atualiza a lista de arquivos guardados em cache e a versão do cache em sw.js.
// Rode depois de acrescentar ou renomear arquivos das telas que precisam abrir sem internet:  node tools/gerar-sw.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join, relative, sep } from 'node:path';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const lista = (dir) => readdirSync(join(raiz, dir)).flatMap((n) => {
  const rel = `${dir}/${n}`;
  return statSync(join(raiz, rel)).isDirectory() ? lista(rel) : [rel];
});
const paginasDeOutrosPerfis = /paginas\/(escola|rede|familia|professores-habilitados)/; // abrem sem internet só o aluno e o professor
const nucleo = [
  'index.html', 'login.html', 'verificar.html', 'manifest.json', 'config.js',
  ...lista('aluno'), ...lista('professor'),
  ...lista('assets/css'), ...lista('assets/img'),
  ...lista('assets/js').filter((f) => !paginasDeOutrosPerfis.test(f) && !f.includes('/assistente/')),
  ...lista('data').filter((f) => f.endsWith('.json'))
].map((f) => f.split(sep).join('/'));
const conteudo = nucleo.map((f) => readFileSync(join(raiz, f))).reduce((h, b) => h.update(b), createHash('sha256')).digest('hex').slice(0, 8);

let sw = readFileSync(join(raiz, 'sw.js'), 'utf8');
sw = sw.replace(/const VERSAO = '[^']*';/, `const VERSAO = 'portal-${conteudo}';`);
sw = sw.replace(/const NUCLEO = \[[\s\S]*?\n\];/, `const NUCLEO = ${JSON.stringify(nucleo, null, 2)};`);
writeFileSync(join(raiz, 'sw.js'), sw);
console.log(`sw.js atualizado: ${nucleo.length} arquivos, versão portal-${conteudo}`);
