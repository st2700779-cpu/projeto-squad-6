import { iniciar, falhaDados } from '../app.js';
import { esc, etiqueta, dataBR } from '../ui.js';
import { carregar } from '../dados.js';
import { situacaoAto } from '../regras.js';

const main = await iniciar({ perfil: 'rede', pagina: 'rede/atos.html', assistente: true });
let dre = '';
let escolas, atos;
async function mostrar() {
  try { [escolas, atos] = await Promise.all([carregar('escolas'), carregar('atos')]); desenhar(); } catch { falhaDados(main, mostrar); }
}
function desenhar() {
  const dres = [...new Set(escolas.map((e) => e.dre))];
  const linhas = atos.map((a) => ({ a, e: escolas.find((x) => x.id === a.escolaId), s: situacaoAto(a) })).filter((l) => !dre || l.e.dre === dre).sort((x, y) => x.s.dias - y.s.dias);
  const vencidos = linhas.filter((l) => !l.s.vigente).length;
  const aVencer = linhas.filter((l) => l.s.tipo === 'atencao').length;
  main.innerHTML = `
    <div class="d-flex justify-content-between align-items-end flex-wrap gap-3"><h1>Atos autorizativos</h1>
      <div class="campo" style="margin:0;min-width:240px"><label for="dre">DRE</label><select id="dre" class="entrada"><option value="">Todas as DREs</option>${dres.map((d) => `<option ${d === dre ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></div></div>
    <p class="texto-suave">Autorizações do Conselho Estadual de Educação. Sem ato vigente, a escola fica impedida de abrir turma e de matricular naquela etapa.</p>
    <div class="numeros"><div class="numero${vencidos ? ' alerta' : ''}"><strong>${vencidos}</strong><span>atos vencidos</span></div><div class="numero"><strong>${aVencer}</strong><span>vencem em até 90 dias</span></div><div class="numero"><strong>${linhas.length}</strong><span>atos acompanhados</span></div></div>
    <div class="tabela-rolagem"><table class="tabela"><caption class="sr-only">Atos autorizativos ordenados pelo vencimento</caption>
      <thead><tr><th scope="col">Escola</th><th scope="col">Etapa</th><th scope="col">Ato</th><th scope="col">Validade</th><th scope="col">Situação</th></tr></thead>
      <tbody>${linhas.map(({ a, e, s }) => `<tr><td>${esc(e.nome)}<br><span class="texto-suave" style="font-size:.88rem">${esc(e.dre)}</span></td><td>${esc(a.etapa)}</td><td>${esc(a.numero)}</td><td>${dataBR(a.validade)}</td><td>${etiqueta(s.texto, s.tipo)}</td></tr>`).join('')}</tbody>
    </table></div>`;
}
main.addEventListener('change', (e) => { if (e.target.id === 'dre') { dre = e.target.value; desenhar(); } });
mostrar();
