// Atualiza o protótipo em arquivo único (sistema-academico-seduc-prototipo.html) com os mesmos dados e
// as mesmas regras do portal, para as duas versões nunca divergirem.
//   - dados: copia o recorte da escola e1 de data/*.json para o bloco "dados-demo";
//   - regras: copia assets/js/dominio/notas.js (sem "export") para o bloco de regras.
// Uso (Node 18+, sem instalar nada):  node tools/gerar-prototipo.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = new URL('../', import.meta.url);
const ler = (caminho) => readFileSync(fileURLToPath(new URL(caminho, raiz)), 'utf8');
const json = (nome) => JSON.parse(ler(`data/${nome}.json`));

const ESCOLA = 'e1';
const TURMA = 'tt1';
const escolas = json('escolas');
const turmas = json('turmas').filter((t) => t.escolaId === ESCOLA);
const professor = json('professor');
const estudantes = json('estudantes');
const dados = {
  letivo: json('letivo'),
  escola: escolas.find((e) => e.id === ESCOLA),
  turmas,
  turmaId: TURMA,
  professor: json('professores').find((p) => p.id === professor.professorId),
  professoresDaEscola: json('professores').length,
  estudante: estudantes.find((e) => e.turmaId === TURMA),
  diario: { [TURMA]: professor.diario[TURMA] },
  pedidos: json('matriculas').filter((p) => p.escolaId === ESCOLA),
  calendario: json('calendario').slice(0, 2)
};
const regras = ler('assets/js/dominio/notas.js').replace(/^export /gm, '');

const arquivo = fileURLToPath(new URL('sistema-academico-seduc-prototipo.html', raiz));
let html = readFileSync(arquivo, 'utf8');
const trocar = (nome, gerar) => {
  const re = new RegExp(`(<!-- BEGIN:${nome} -->)[\\s\\S]*?(<!-- END:${nome} -->)`);
  if (!re.test(html)) throw new Error(`Marcadores ${nome} não encontrados no protótipo.`);
  html = html.replace(re, (_, a, b) => `${a}\n${gerar}\n${b}`);
};
trocar('dados', `<script type="application/json" id="dados-demo">${JSON.stringify(dados, null, 1).replace(/<\//g, '<\\/')}</script>`);
trocar('regras', `<script>\n${regras.trimEnd()}\n</script>`);
writeFileSync(arquivo, html);
console.log('Protótipo atualizado com os dados e as regras do portal.');
