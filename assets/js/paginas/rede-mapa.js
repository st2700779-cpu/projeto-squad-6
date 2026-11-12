// Mapa de vagas da rede: procura e oferta por BAIRRO, com dados que o próprio portal tem (dominio/demanda.js).
// Procura = pedidos de matrícula aguardando confirmação + crianças na lista de espera. Oferta = vagas calculadas das turmas.
// Um círculo por bairro, com tamanho pela procura e cor pela relação procura x vagas. A tabela traz os mesmos números
// (é a versão acessível do mapa e o plano B sem internet). Quem é de uma DRE vê só os municípios da sua regional.
import { iniciar, falhaDados } from '../app.js';
import { esc, etiqueta, icone, baixarCSV, numeroBR, plural } from '../ui.js';
import { carregar, conjunto, matriculas, vagasDetalhadas } from '../dados.js';
import { SERIES } from '../regras.js';
import { FAIXAS_PROCURA as FAIXAS, procuraPorBairro, somarPorMunicipio } from '../dominio/demanda.js';
import { municipiosDa, avisoDeAcesso, filtrosDreMunicipio, dreDaSessao } from '../dre.js';
import { criarMapa } from '../mapa/leaflet.js';

const main = await iniciar({ perfil: 'rede', pagina: 'rede/mapa.html', assistente: true });
let escolas, detalhe, espera, pedidos, locais, dres;
let serie = '';
let dreFiltro = '';
let municipio = '';
let mapa = null;

const extras = () => [...new Set(escolas.map((e) => e.municipio))];
const municipiosVisiveis = () => (municipio ? [municipio] : municipiosDa(dres, dreFiltro, extras()));
function linhas() {
  return procuraPorBairro({ listaEspera: espera.filter((x) => x.situacao !== 'Cancelada'), pedidos, escolas, vagas: detalhe, series: serie ? [serie] : SERIES, municipios: municipiosVisiveis() });
}
const razaoTexto = (r) => (r === Infinity ? 'sem vagas' : numeroBR(r, 2));
const coordenadas = (l) => {
  const b = locais.bairros.find((x) => x.nome === `${l.municipio} — ${l.bairro}`);
  if (b) return b;
  const e = escolas.find((x) => x.municipio === l.municipio && x.bairro === l.bairro && x.lat);
  return e || locais.municipios.find((m) => m.municipio === l.municipio) || {};
};

function desenharTabela(lista) {
  const porMunicipio = somarPorMunicipio(lista);
  main.querySelector('#tabela-mapa').innerHTML = lista.length ? `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Procura e vagas por bairro</caption>
    <thead><tr><th scope="col">Bairro</th><th scope="col" class="num">Lista de espera</th><th scope="col" class="num">Pedidos aguardando</th><th scope="col" class="num">Procura</th><th scope="col" class="num">Vagas abertas</th><th scope="col" class="num">Procura por vaga</th><th scope="col">Situação</th></tr></thead>
    <tbody>${lista.map((l) => `<tr><td class="titulo-linha"><strong>${esc(l.bairro)}</strong><small>${esc(l.municipio)} · ${l.escolas ? `${l.escolas} ${plural(l.escolas, 'escola', 'escolas')}` : 'sem escola da rede'}</small></td><td class="num" data-rotulo="Lista de espera">${l.espera}</td><td class="num" data-rotulo="Pedidos aguardando">${l.pedidos}</td><td class="num" data-rotulo="Procura"><strong>${l.procura}</strong></td><td class="num" data-rotulo="Vagas abertas">${l.oferta}</td><td class="num" data-rotulo="Procura por vaga">${razaoTexto(l.razao)}</td><td data-rotulo="Situação">${etiqueta(FAIXAS[l.faixa].rotulo, FAIXAS[l.faixa].tipo)}</td></tr>`).join('')}</tbody></table></div>
    <p class="contagem">${lista.length} ${plural(lista.length, 'bairro', 'bairros')} · ordenados pela maior falta de vagas${serie ? ` · ${esc(serie)}` : ' · todas as séries'}</p>
    <h3>Total por município</h3>
    <ul class="lista-simples">${porMunicipio.map((m) => `<li><span><strong>${esc(m.municipio)}</strong> <span class="texto-suave texto-pequeno">${m.bairros} ${plural(m.bairros, 'bairro', 'bairros')}</span></span><span>procura ${m.procura} · vagas ${m.oferta} ${etiqueta(FAIXAS[m.faixa].rotulo, FAIXAS[m.faixa].tipo)}</span></li>`).join('')}</ul>`
    : '<p class="texto-suave">Nenhuma procura nem escola nos municípios escolhidos.</p>';
}
function desenharCirculos(lista) {
  if (!mapa) return;
  const { L, mapa: m, camada } = mapa;
  camada.clearLayers();
  const pontos = [];
  lista.forEach((l) => {
    const c = coordenadas(l);
    if (c.lat === undefined) return;
    const f = FAIXAS[l.faixa];
    pontos.push([c.lat, c.lng]);
    L.circleMarker([c.lat, c.lng], { radius: 8 + 3 * Math.sqrt(l.procura), color: f.cor, weight: 2, fillColor: f.cor, fillOpacity: 0.35 })
      .bindPopup(`<div class="popup-escola"><h3>${esc(l.bairro)} · ${esc(l.municipio)}</h3><div>Procura: ${l.procura} (lista de espera ${l.espera}, pedidos ${l.pedidos}) · vagas abertas: ${l.oferta}</div><div>${f.rotulo} (${razaoTexto(l.razao)} por vaga)</div></div>`).addTo(camada);
  });
  if (pontos.length) m.fitBounds(pontos, { padding: [40, 40], maxZoom: 13 });
}
function atualizar() { const l = linhas(); desenharTabela(l); desenharCirculos(l); return l; }

function ferramentas() {
  return `<div class="campo"><label for="serie">Série</label><select id="serie" class="entrada"><option value="">Todas as séries</option>${SERIES.map((s) => `<option ${s === serie ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
    ${filtrosDreMunicipio({ dres, dre: dreFiltro, municipio, extras: extras() })}
    <button type="button" class="botao botao-secundario" id="exportar">${icone('baixar', 20)}Exportar CSV</button>`;
}
async function mostrar() {
  try { [escolas, detalhe, espera, pedidos, locais, dres] = await Promise.all([carregar('escolas'), vagasDetalhadas(), conjunto('lista-espera'), matriculas(), carregar('localidades'), carregar('dres')]); } catch { falhaDados(main, mostrar); return; }
  main.innerHTML = `
    <h1>Mapa de vagas: procura e oferta por bairro</h1>
    ${avisoDeAcesso()}
    <div class="ferramentas-tabela" id="ferramentas">${ferramentas()}</div>
    <ul class="legenda" aria-label="Legenda do mapa">${Object.values(FAIXAS).map((f) => `<li><i style="color:${f.cor};background:#fff" aria-hidden="true"></i><span><strong>${f.rotulo}</strong>: ${f.regra}</span></li>`).join('')}<li><span>Tamanho do círculo: procura</span></li></ul>
    <div class="mapa-caixa"><div id="mapa" class="mapa" role="region" aria-label="Mapa de procura e vagas por bairro"></div><p class="mapa-aviso" id="mapa-aviso" role="status">Carregando o mapa…</p></div>
    <h2>Números por bairro</h2>
    <div id="tabela-mapa"></div>
    <p class="texto-suave texto-pequeno">Procura: pedidos de matrícula feitos no portal que aguardam a escola (no bairro onde a família mora) e crianças na lista de espera${dreDaSessao() ? '' : ' de todas as DREs'}. Vagas abertas: lugares livres nas turmas aprovadas das escolas do bairro, só nas séries com ato vigente.</p>`;
  atualizar();
  const criado = await criarMapa(main.querySelector('#mapa'));
  const aviso = main.querySelector('#mapa-aviso');
  if (!criado) { main.querySelector('#mapa').hidden = true; aviso.textContent = 'Não foi possível carregar o mapa. A tabela abaixo tem os mesmos números.'; return; }
  mapa = { ...criado, camada: criado.L.layerGroup().addTo(criado.mapa) };
  aviso.hidden = true;
  atualizar();
}
main.addEventListener('change', (e) => {
  if (e.target.id === 'serie') { serie = e.target.value; atualizar(); }
  if (e.target.id === 'filtro-dre') { dreFiltro = e.target.value; if (municipio && !municipiosDa(dres, dreFiltro, extras()).includes(municipio)) municipio = ''; main.querySelector('#ferramentas').innerHTML = ferramentas(); atualizar(); main.querySelector('#filtro-dre').focus(); }
  if (e.target.id === 'filtro-municipio') { municipio = e.target.value; atualizar(); }
});
main.addEventListener('click', (e) => {
  if (!e.target.closest('#exportar')) return;
  baixarCSV('procura-e-vagas-por-bairro.csv', ['Município', 'Bairro', 'Lista de espera', 'Pedidos aguardando', 'Procura', 'Vagas abertas', 'Procura por vaga', 'Situação'], linhas().map((l) => [l.municipio, l.bairro, l.espera, l.pedidos, l.procura, l.oferta, razaoTexto(l.razao), FAIXAS[l.faixa].rotulo]));
});
mostrar();
