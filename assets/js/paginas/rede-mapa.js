// Mapa de vagas da rede: um círculo por município, com tamanho proporcional à demanda e cor pela relação
// demanda x vagas. A tabela abaixo traz os mesmos números (é a versão acessível do mapa e o plano B sem internet).
import { iniciar, falhaDados } from '../app.js';
import { esc, etiqueta, icone, baixarCSV, numeroBR } from '../ui.js';
import { carregar, vagas as lerVagas } from '../dados.js';
import { SERIES, atoDaEtapa, situacaoAto } from '../regras.js';
import { criarMapa } from '../mapa/leaflet.js';

const main = await iniciar({ perfil: 'rede', pagina: 'rede/mapa.html', assistente: true });
let escolas, atos, vagas, demanda, locais;
let serie = '';
let mapa = null;

// Faixas da relação demanda/vagas. Cores fixas porque os tiles do mapa são sempre claros.
const FAIXAS = {
  falta: { rotulo: 'Falta de vagas', regra: 'demanda acima de 120% das vagas', cor: '#b42318', tipo: 'erro' },
  equilibrio: { rotulo: 'Equilibrado', regra: 'demanda entre 90% e 120% das vagas', cor: '#8a5a00', tipo: 'atencao' },
  folga: { rotulo: 'Sobra de vagas', regra: 'demanda abaixo de 90% das vagas', cor: '#0f5b3a', tipo: 'ok' }
};
/** Relação demanda/vagas → faixa. Sem nenhuma vaga aberta, qualquer demanda é falta. */
export const faixaDaRazao = (razao) => (razao > 1.2 ? 'falta' : razao >= 0.9 ? 'equilibrio' : 'folga');

function vagasAbertas(e, s) {
  const ato = atoDaEtapa(atos, e.id, s);
  return ato && situacaoAto(ato).vigente ? vagas[e.id]?.[s] ?? 0 : 0;
}
function linhas() {
  const series = serie ? [serie] : SERIES;
  return Object.entries(demanda).map(([municipio, porSerie]) => {
    const d = series.reduce((t, s) => t + (porSerie[s] || 0), 0);
    const v = escolas.filter((e) => e.municipio === municipio).reduce((t, e) => t + series.reduce((x, s) => x + vagasAbertas(e, s), 0), 0);
    const razao = v ? d / v : Infinity;
    const c = locais.municipios.find((m) => m.municipio === municipio);
    return { municipio, demanda: d, vagas: v, razao, faixa: faixaDaRazao(razao), lat: c?.lat, lng: c?.lng, escolas: escolas.filter((e) => e.municipio === municipio).length };
  }).sort((a, b) => (b.razao === a.razao ? b.demanda - a.demanda : b.razao - a.razao));
}
const razaoTexto = (r) => (r === Infinity ? 'sem vagas' : `${numeroBR(r, 2)}`);

function desenharTabela(lista) {
  main.querySelector('#tabela-mapa').innerHTML = `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Demanda e vagas por município</caption>
    <thead><tr><th scope="col">Município</th><th scope="col" class="num">Demanda</th><th scope="col" class="num">Vagas abertas</th><th scope="col" class="num">Demanda por vaga</th><th scope="col">Situação</th></tr></thead>
    <tbody>${lista.map((l) => `<tr><td class="titulo-linha"><strong>${esc(l.municipio)}</strong><small>${l.escolas ? `${l.escolas} ${l.escolas === 1 ? 'escola' : 'escolas'}` : 'sem escola da rede'}</small></td><td class="num" data-rotulo="Demanda">${l.demanda}</td><td class="num" data-rotulo="Vagas abertas">${l.vagas}</td><td class="num" data-rotulo="Demanda por vaga">${razaoTexto(l.razao)}</td><td data-rotulo="Situação">${etiqueta(FAIXAS[l.faixa].rotulo, FAIXAS[l.faixa].tipo)}</td></tr>`).join('')}</tbody></table></div>
    <p class="contagem">${lista.length} municípios · ordenados pela maior falta de vagas${serie ? ` · ${esc(serie)}` : ' · todas as séries'}</p>`;
}
function desenharCirculos(lista) {
  if (!mapa) return;
  const { L, mapa: m, camada } = mapa;
  camada.clearLayers();
  const pontos = [];
  lista.filter((l) => l.lat !== undefined).forEach((l) => {
    const f = FAIXAS[l.faixa];
    pontos.push([l.lat, l.lng]);
    L.circleMarker([l.lat, l.lng], { radius: 12 + 4 * Math.sqrt(l.demanda), color: f.cor, weight: 2, fillColor: f.cor, fillOpacity: 0.35 })
      .bindPopup(`<div class="popup-escola"><h3>${esc(l.municipio)}</h3><div>Demanda: ${l.demanda} · vagas abertas: ${l.vagas}</div><div>${f.rotulo} (${razaoTexto(l.razao)} por vaga)</div></div>`).addTo(camada);
  });
  if (pontos.length) m.fitBounds(pontos, { padding: [40, 40], maxZoom: 11 });
}
function atualizar() { const l = linhas(); desenharTabela(l); desenharCirculos(l); return l; }

async function mostrar() {
  try { [escolas, atos, vagas, demanda, locais] = await Promise.all([carregar('escolas'), carregar('atos'), lerVagas(), carregar('demanda'), carregar('localidades')]); } catch { falhaDados(main, mostrar); return; }
  main.innerHTML = `
    <h1>Mapa de vagas: demanda e oferta</h1>
    <div class="ferramentas-tabela">
      <div class="campo"><label for="serie">Série</label><select id="serie" class="entrada"><option value="">Todas as séries</option>${SERIES.map((s) => `<option>${esc(s)}</option>`).join('')}</select></div>
      <button type="button" class="botao botao-secundario" id="exportar">${icone('baixar', 20)}Exportar CSV</button>
    </div>
    <ul class="legenda" aria-label="Legenda do mapa">${Object.values(FAIXAS).map((f) => `<li><i style="color:${f.cor};background:#fff" aria-hidden="true"></i><span><strong>${f.rotulo}</strong>: ${f.regra}</span></li>`).join('')}<li><span>Tamanho do círculo: demanda</span></li></ul>
    <div class="mapa-caixa"><div id="mapa" class="mapa" role="region" aria-label="Mapa de demanda e vagas por município"></div><p class="mapa-aviso" id="mapa-aviso" role="status">Carregando o mapa…</p></div>
    <h2>Números por município</h2>
    <div id="tabela-mapa"></div>
    <p class="texto-suave texto-pequeno">Demanda: pedidos de matrícula e crianças em idade escolar sem vaga (dados fictícios). Vagas abertas: só séries com ato autorizativo vigente.</p>`;
  atualizar();
  const criado = await criarMapa(main.querySelector('#mapa'));
  const aviso = main.querySelector('#mapa-aviso');
  if (!criado) { main.querySelector('#mapa').hidden = true; aviso.textContent = 'O mapa não carregou (sem internet ou bloqueado). A tabela abaixo traz os mesmos números.'; return; }
  mapa = { ...criado, camada: criado.L.layerGroup().addTo(criado.mapa) };
  aviso.textContent = 'Mapa © OpenStreetMap. A tabela abaixo é a versão em texto do mapa.';
  atualizar();
}
main.addEventListener('change', (e) => { if (e.target.id === 'serie') { serie = e.target.value; atualizar(); } });
main.addEventListener('click', (e) => {
  if (!e.target.closest('#exportar')) return;
  baixarCSV('mapa-de-vagas.csv', ['Município', 'Demanda', 'Vagas abertas', 'Demanda por vaga', 'Situação'], linhas().map((l) => [l.municipio, l.demanda, l.vagas, razaoTexto(l.razao), FAIXAS[l.faixa].rotulo]));
});
mostrar();
