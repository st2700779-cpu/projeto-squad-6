// Executa a bateria de perguntas de teste contra o proxy e gera um relatório (Tópico 2.1, CA-IA-02/04/05).
// Uso: node tools/testar-assistente.mjs https://assistente-squad6.SEU-USUARIO.workers.dev/api/assistente https://SEU-GRUPO.gitlab.io
import { readFile, writeFile } from 'node:fs/promises';

const [url, origem = 'http://localhost:5500'] = process.argv.slice(2);
if (!url) { console.error('Informe o endereço do proxy.'); process.exit(1); }
const perguntas = JSON.parse(await readFile(new URL('../prompts/testes/perguntas-teste.json', import.meta.url), 'utf8'));
const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
const normal = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const resultados = [];
for (const t of perguntas) {
  const inicio = Date.now();
  let r, corpo;
  try {
    r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origem }, body: JSON.stringify({ pergunta: t.pergunta, perfil: 'familia', historico: [] }) });
    corpo = await r.json();
  } catch (e) { corpo = { erro: String(e) }; }
  const ms = Date.now() - inicio;
  const problemas = [];
  if (corpo.erro) problemas.push(`erro ${corpo.erro}`);
  else {
    if (t.espera.na_base !== null && corpo.na_base !== t.espera.na_base) problemas.push(`na_base=${corpo.na_base}, esperado ${t.espera.na_base}`);
    for (const trecho of t.espera.deve_conter) if (!normal(corpo.resposta).includes(normal(trecho))) problemas.push(`faltou “${trecho}”`);
    if (t.espera.acao && corpo.acao !== t.espera.acao) problemas.push(`acao=${corpo.acao}, esperado ${t.espera.acao}`);
    const frases = corpo.resposta.split(/[.!?]+\s/).filter(Boolean).length;
    if (frases > 4) problemas.push(`${frases} frases (máximo 4)`);
  }
  resultados.push({ id: t.id, pergunta: t.pergunta, resposta: corpo.resposta ?? '', na_base: corpo.na_base, acao: corpo.acao, ms, ok: problemas.length === 0, problemas });
  console.log(`${problemas.length ? '✗' : '✓'} ${String(t.id).padStart(2)} ${t.pergunta} (${ms} ms)${problemas.length ? ' — ' + problemas.join('; ') : ''}`);
  await esperar(6500); // respeita o limite de requisições por minuto do plano gratuito
}
const acertos = resultados.filter((r) => r.ok).length;
const tempos = resultados.map((r) => r.ms).sort((a, b) => a - b);
const mediana = tempos[Math.floor(tempos.length / 2)];
console.log(`\nAcertos: ${acertos}/${resultados.length} (${Math.round((acertos / resultados.length) * 100)}%) · mediana de tempo: ${mediana} ms`);
console.log('Atenção: revise manualmente todas as datas e prazos das respostas (CA-IA-05).');
await writeFile(new URL(`../prompts/testes/resultado-${new Date().toISOString().slice(0, 10)}.json`, import.meta.url), JSON.stringify({ acertos, total: resultados.length, medianaMs: mediana, resultados }, null, 2));
