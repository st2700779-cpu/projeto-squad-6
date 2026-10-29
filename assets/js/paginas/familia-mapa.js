// Escolas com vaga perto de casa: a família escolhe o bairro e a série, as escolas aparecem em ordem de distância
// (Haversine, coordenadas fictícias) na lista e no mapa. Sem internet, a lista traz a mesma informação.
import { iniciar, link, falhaDados } from '../app.js';
import { esc, plural } from '../ui.js';
import { carregar, vagas as lerVagas } from '../dados.js';
import { SERIES, atoDaEtapa, situacaoAto, nomeCurto } from '../regras.js';
import { ordenarPorDistancia, kmBR } from '../mapa/distancia.js';
import { criarMapa } from '../mapa/leaflet.js';

const main = await iniciar({ perfil: 'familia', assistente: true, titulo: 'Escolas com vaga' });
let escolas, atos, vagas, locais;
let cidade = '';
let local = '';
let serie = '';
let mapa = null; // { L, mapa, camada }

// Vagas da série numa escola: número, 'ato vencido' ou null quando a escola não oferece a série.
function vagasDaSerie(e, s) {
  const ato = atoDaEtapa(atos, e.id, s);
  if (!ato) return null;
  if (!situacaoAto(ato).vigente) return 'ato vencido';
  return vagas[e.id]?.[s] ?? 0;
}
const resumo = (e) => {
  if (serie) {
    const v = vagasDaSerie(e, serie);
    if (v === null) return `Não oferece ${serie}.`;
    if (v === 'ato vencido') return `Sem matrícula na ${serie}: ato autorizativo vencido.`;
    return v ? `${v} ${plural(v, 'vaga', 'vagas')} na ${serie}.` : `Sem vaga na ${serie}.`;
  }
  const total = SERIES.reduce((t, s) => t + (typeof vagasDaSerie(e, s) === 'number' ? vagasDaSerie(e, s) : 0), 0);
  return `${total} ${plural(total, 'vaga', 'vagas')} no total.`;
};
const popup = (e, posicao) => `<div class="popup-escola"><h3>${posicao}. ${esc(nomeCurto(e.nome))}</h3>
  <div>${esc(e.bairro)}, ${esc(e.municipio)} · ${kmBR(e.km)}</div>
  <table><caption class="sr-only">Vagas por série</caption><tbody>${SERIES.map((s) => { const v = vagasDaSerie(e, s); return `<tr><th scope="row">${esc(s)}</th><td class="num">${v === null ? '—' : v === 'ato vencido' ? 'bloqueada' : v}</td></tr>`; }).join('')}</tbody></table>
  <a href="${link('familia/matricula.html')}">Fazer matrícula</a></div>`;

function desenharLista(ordenadas) {
  main.querySelector('#lista-escolas').innerHTML = ordenadas.map((e, i) => `<li>
    <span class="posicao" aria-hidden="true">${i + 1}</span>
    <div><h3>${esc(nomeCurto(e.nome))}${e.exemplo ? ` <span class="texto-suave texto-pequeno peso-normal">(vagas de exemplo)</span>` : ''}</h3>
      <p>${esc(e.bairro)}, ${esc(e.municipio)} · ${kmBR(e.km)} em linha reta</p>
      <p>${esc(resumo(e))}</p>
      <div class="linha-botoes"><a class="botao botao-secundario botao-mini" href="${link('familia/matricula.html')}">Fazer matrícula</a></div></div></li>`).join('');
}
function desenharMapa(ordenadas, origem) {
  if (!mapa) return;
  const { L, mapa: m, camada } = mapa;
  camada.clearLayers();
  const pontos = [[origem.lat, origem.lng]];
  L.marker([origem.lat, origem.lng], { title: `Você: ${origem.nome}`, icon: L.divIcon({ className: '', html: '<span class="marcador-mapa origem" aria-hidden="true">Eu</span>', iconSize: [32, 32], iconAnchor: [16, 16] }) }).addTo(camada);
  ordenadas.forEach((e, i) => {
    pontos.push([e.lat, e.lng]);
    L.marker([e.lat, e.lng], { title: `${i + 1}. ${nomeCurto(e.nome)}`, icon: L.divIcon({ className: '', html: `<span class="marcador-mapa" aria-hidden="true">${i + 1}</span>`, iconSize: [32, 32], iconAnchor: [16, 16] }) })
      .bindPopup(popup(e, i + 1)).addTo(camada);
  });
  m.fitBounds(pontos, { padding: [30, 30], maxZoom: 13 });
}
// Bairros da cidade escolhida (data/localidades.json). Começa pelo Centro, quando a cidade tem.
const bairrosDaCidade = (c) => locais.bairros.filter((b) => b.municipio === c);
const bairroInicial = (c) => (bairrosDaCidade(c).find((b) => b.nome === `${c} — Centro`) || bairrosDaCidade(c)[0])?.nome || '';
const opcoesDeBairro = () => bairrosDaCidade(cidade).map((b) => `<option value="${esc(b.nome)}" ${b.nome === local ? 'selected' : ''}>${esc(b.nome.split(' — ').pop())}</option>`).join('');
function atualizar() {
  const origem = locais.bairros.find((b) => b.nome === local);
  const ordenadas = ordenarPorDistancia(escolas, origem);
  desenharLista(ordenadas);
  desenharMapa(ordenadas, origem);
}

async function mostrar() {
  try {
    [escolas, atos, vagas, locais] = await Promise.all([carregar('escolas'), carregar('atos'), lerVagas(), carregar('localidades')]);
  } catch { falhaDados(main, mostrar); return; }
  cidade = cidade || (locais.bairros.some((b) => b.municipio === 'Aracaju') ? 'Aracaju' : locais.bairros[0].municipio);
  local = local || bairroInicial(cidade);
  const municipios = [...new Set(locais.bairros.map((b) => b.municipio))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  main.innerHTML = `
    <h1>Escolas com vaga perto de você</h1>
    <div class="ferramentas-tabela">
      <div class="campo"><label for="cidade">Cidade onde você mora</label><select id="cidade" class="entrada">${municipios.map((mu) => `<option ${mu === cidade ? 'selected' : ''}>${esc(mu)}</option>`).join('')}</select></div>
      <div class="campo"><label for="local">Bairro</label><select id="local" class="entrada">${opcoesDeBairro()}</select></div>
      <div class="campo"><label for="serie">Série do estudante</label><select id="serie" class="entrada"><option value="">Todas as séries</option>${SERIES.map((s) => `<option ${s === serie ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
    </div>
    <div class="mapa-layout">
      <div><h2 class="texto-lg">Da mais perto para a mais longe</h2><ol id="lista-escolas" class="lista-escolas"></ol></div>
      <div class="mapa-caixa"><div id="mapa" class="mapa" role="region" aria-label="Mapa das escolas"></div><p class="mapa-aviso" id="mapa-aviso" role="status">Carregando o mapa…</p></div>
    </div>
    <p class="texto-suave texto-pequeno esp-t-3">Distância em linha reta a partir do bairro escolhido.</p>`;
  atualizar();
  const criado = await criarMapa(main.querySelector('#mapa'));
  const aviso = main.querySelector('#mapa-aviso');
  if (!criado) {
    main.querySelector('#mapa').hidden = true;
    aviso.textContent = 'Não foi possível carregar o mapa. A lista mostra as mesmas escolas, com distância e vagas.';
    return;
  }
  mapa = { ...criado, camada: criado.L.layerGroup().addTo(criado.mapa) };
  aviso.hidden = true; // a atribuição do OpenStreetMap já aparece no canto do mapa
  atualizar();
}
main.addEventListener('change', (e) => {
  if (e.target.id === 'cidade') { cidade = e.target.value; local = bairroInicial(cidade); main.querySelector('#local').innerHTML = opcoesDeBairro(); atualizar(); }
  if (e.target.id === 'local') { local = e.target.value; atualizar(); }
  if (e.target.id === 'serie') { serie = e.target.value; atualizar(); }
});
mostrar();
