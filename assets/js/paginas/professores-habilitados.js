// Mapa de falta de professores habilitados: escola × componente da matriz. A regra está em dominio/habilitacao.js.
// Na rede mostra todas as escolas e o resumo por município; na secretaria, só a escola da pessoa.
import { iniciar, falhaDados } from '../app.js';
import { sessao } from '../auth.js';
import { esc, etiqueta, icone, baixarCSV, vazio } from '../ui.js';
import { carregar } from '../dados.js';
import { mapaDeFalta } from '../dominio/habilitacao.js';

const perfil = document.body.dataset.perfil === 'escola' ? 'escola' : 'rede';
const main = await iniciar({ perfil, pagina: `${perfil}/professores.html`, assistente: true });
const ETAPA_EM = 'Ensino Médio';

async function mostrar() {
  try {
    const [escolas, atos, professores, matrizes, extra] = await Promise.all([carregar('escolas'), carregar('atos'), carregar('professores'), carregar('matrizes'), carregar('componentes-etapa')]);
    // A matriz do Ensino Médio vem da versão vigente de data/matrizes.json; a do Fundamental, de data/componentes-etapa.json.
    const componentesPorEtapa = { [ETAPA_EM]: matrizes.versoes[0].componentes.map((c) => c[0]), ...extra };
    const proprias = perfil === 'escola' ? escolas.filter((e) => e.id === sessao()?.escolaId) : escolas;
    const { componentes, linhas } = mapaDeFalta({ escolas: proprias, atos, professores, componentesPorEtapa });
    const total = linhas.reduce((t, l) => t + l.faltam.length, 0);
    const porMunicipio = [...new Set(linhas.map((l) => l.escola.municipio))].map((m) => {
      const ls = linhas.filter((l) => l.escola.municipio === m);
      const cont = {};
      ls.forEach((l) => l.faltam.forEach((c) => { cont[c] = (cont[c] || 0) + 1; }));
      const mais = Object.entries(cont).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, n]) => `${c} (${n} ${n === 1 ? 'escola' : 'escolas'})`);
      return { municipio: m, escolas: ls.length, faltas: ls.reduce((t, l) => t + l.faltam.length, 0), mais };
    }).sort((a, b) => b.faltas - a.faltas);
    const celula = (estado) => estado === 'falta' ? '<td class="num"><span class="etiqueta etiqueta-erro">falta</span></td>' : estado === 'ok' ? '<td class="num"><span class="sr-only">tem professor habilitado</span></td>' : '<td class="num texto-suave" aria-label="não se aplica">—</td>';
    main.innerHTML = `
      <div class="cabecalho-pagina"><h1>Professores habilitados por escola</h1></div>
      <p class="pagina-descricao">Componentes da matriz sem professor habilitado lotado na escola.</p>
      <dl class="resumo-linha">
        <div class="${total ? 'alerta' : ''}"><dd>${total}</dd><dt>${total === 1 ? 'componente sem professor' : 'componentes sem professor'} nas escolas listadas</dt></div>
        <div><dd>${linhas.filter((l) => l.faltam.length).length}</dd><dt>de ${linhas.length} ${linhas.length === 1 ? 'escola' : 'escolas'} com pelo menos uma falta</dt></div>
      </dl>
      <div class="linha-botoes nao-imprimir esp-b-3"><button type="button" class="botao botao-secundario" id="imprimir">${icone('imprimir', 20)}Imprimir</button><button type="button" class="botao botao-secundario" id="exportar">${icone('baixar', 20)}Exportar CSV</button></div>
      ${linhas.length ? `<div class="tabela-rolagem"><table class="tabela tabela-matriz"><caption class="sr-only">Componentes sem professor habilitado, por escola</caption>
        <thead><tr><th scope="col">Escola</th>${componentes.map((c) => `<th scope="col" class="num cabecalho-vertical">${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>${linhas.map((l) => `<tr><th class="celula-escola" scope="row">${esc(l.escola.nome)}<br><span class="texto-suave texto-pequeno peso-normal">${esc(l.escola.municipio)} · ${l.faltam.length} ${l.faltam.length === 1 ? 'falta' : 'faltas'}</span></th>${componentes.map((c) => celula(l.celulas[c])).join('')}</tr>`).join('')}</tbody></table></div>
        <p class="contagem">“—”: componente fora da matriz das etapas da escola.</p>` : vazio('Nenhuma escola para mostrar', 'Não há escola vinculada a este acesso.')}
      ${perfil === 'rede' ? `<h2>Resumo por município</h2>
        <div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Faltas de professor por município</caption>
          <thead><tr><th scope="col">Município</th><th scope="col" class="num">Escolas</th><th scope="col" class="num">Componentes sem professor</th><th scope="col">Mais faltam</th></tr></thead>
          <tbody>${porMunicipio.map((m) => `<tr><td class="titulo-linha"><strong>${esc(m.municipio)}</strong></td><td class="num" data-rotulo="Escolas">${m.escolas}</td><td class="num" data-rotulo="Componentes sem professor">${m.faltas ? etiqueta(String(m.faltas), 'erro') : '0'}</td><td data-rotulo="Mais faltam">${m.mais.length ? esc(m.mais.join('; ')) : '<span class="texto-suave">nenhuma falta</span>'}</td></tr>`).join('')}</tbody></table></div>` : ''}`;
    main.querySelector('#imprimir').addEventListener('click', () => window.print());
    main.querySelector('#exportar').addEventListener('click', () => baixarCSV('professores-habilitados.csv', ['Escola', 'Município', ...componentes], linhas.map((l) => [l.escola.nome, l.escola.municipio, ...componentes.map((c) => ({ falta: 'falta', ok: 'ok', na: '' })[l.celulas[c]])])));
  } catch { falhaDados(main, mostrar); }
}
mostrar();
