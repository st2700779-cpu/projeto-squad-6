import { iniciar, falhaDados } from '../app.js';
import { esc } from '../ui.js';
import { carregar, vagas as lerVagas } from '../dados.js';
import { SERIES, atoDaEtapa, situacaoAto } from '../regras.js';

const main = await iniciar({ perfil: 'rede', pagina: 'rede/vagas.html', assistente: true });
async function mostrar() {
  try {
    const [escolas, atos, vagas] = await Promise.all([carregar('escolas'), carregar('atos'), lerVagas()]);
    const celula = (e, s) => {
      const ato = atoDaEtapa(atos, e.id, s);
      if (!ato) return '<td class="texto-suave">—</td>';
      if (!situacaoAto(ato).vigente) return '<td><span class="etiqueta etiqueta-erro" title="Ato vencido">bloq.</span></td>';
      const n = vagas[e.id]?.[s] ?? 0;
      return `<td${n === 0 ? ' class="texto-suave"' : ''}>${n}</td>`;
    };
    main.innerHTML = `
      <h1>Vagas por escola</h1>
      <p class="texto-suave">Vagas disponíveis por série. “bloq.” indica etapa com ato autorizativo vencido; “—” indica série que a escola não oferece.</p>
      <div class="tabela-rolagem"><table class="tabela"><caption class="sr-only">Vagas por escola e série</caption>
        <thead><tr><th scope="col">Escola</th>${SERIES.map((s) => `<th scope="col">${s.replace(' EM', '')}${s.includes('EM') ? ' (EM)' : ''}</th>`).join('')}</tr></thead>
        <tbody>${escolas.map((e) => `<tr><th scope="row" style="background:none;color:var(--tinta);font-size:1rem">${esc(e.nome)}<br><span class="texto-suave" style="font-size:.85rem;font-weight:400">${esc(e.municipio)}</span></th>${SERIES.map((s) => celula(e, s)).join('')}</tr>`).join('')}</tbody>
      </table></div>`;
  } catch { falhaDados(main, mostrar); }
}
mostrar();
