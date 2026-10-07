// Painel comparativo lado a lado entre turmas (até 3). Cores, símbolos e palavras como no mapa de calor.
// "Abrir em modo reunião" leva a mesma escolha para a tela de reunião pedagógica.
import { iniciar, link, falhaDados } from '../app.js';
import { sessao } from '../auth.js';
import { esc, avisar, vazio, icone } from '../ui.js';
import { conjunto } from '../dados.js';
import { desempenhoDaEscola } from '../painel-dados.js';
import { tabelaComparativa } from '../componentes/comparativo.js';

const main = await iniciar({ perfil: 'coordenador', pagina: 'coordenador/comparativo.html', assistente: false });
const MAXIMO = 3;
let painel, atencoes, escolhidas;

function desenhar() {
  const itens = escolhidas.map((id) => painel.lista.find((x) => x.turma.id === id)).filter(Boolean);
  main.innerHTML = `
    <h1>Comparar turmas</h1>
    <p class="pagina-descricao">Escolha até ${MAXIMO} turmas para ver lado a lado. A bandeira aparece nas turmas que a coordenação marcou.</p>
    <fieldset class="campo"><legend>Turmas para comparar</legend>
      <div class="linha-botoes">${painel.lista.map((x) => `<label class="chave-simples"><input type="checkbox" class="caixa-grande" data-turma="${x.turma.id}" ${escolhidas.includes(x.turma.id) ? 'checked' : ''}><span>${esc(x.turma.nome)}</span></label>`).join('')}</div></fieldset>
    ${itens.length >= 2 ? `${tabelaComparativa(itens, atencoes)}
    <p class="contagem">Média por matéria: verde 6,0 ou mais; amarelo de 4,0 a 5,9; vermelho abaixo de 4,0. Frequência: verde 85% ou mais; amarelo de 75% a 84,9%; vermelho abaixo de 75%.</p>
    <div class="linha-botoes"><a class="botao" href="${link('coordenador/reuniao.html')}?turmas=${itens.map((x) => x.turma.id).join(',')}">${icone('imprimir', 20)}Abrir em modo reunião</a></div>` : vazio('Escolha pelo menos duas turmas', 'Marque duas ou três turmas acima para compará-las lado a lado.')}`;
}
async function mostrar() {
  try {
    [painel, atencoes] = await Promise.all([desempenhoDaEscola(sessao().escolaId), conjunto('atencao-turmas')]);
    const pedidas = (new URLSearchParams(location.search).get('turmas') || '').split(',').filter((id) => painel.lista.some((x) => x.turma.id === id));
    const padrao = [...painel.lista.filter((x) => x.doDiario), ...painel.lista].map((x) => x.turma.id);
    escolhidas = (pedidas.length ? pedidas : [...new Set(padrao)].slice(0, 2)).slice(0, MAXIMO);
    desenhar();
  } catch { falhaDados(main, mostrar); }
}
main.addEventListener('change', (e) => {
  const c = e.target.closest('[data-turma]');
  if (!c) return;
  if (c.checked && escolhidas.length >= MAXIMO) { c.checked = false; avisar(`Dá para comparar até ${MAXIMO} turmas. Desmarque uma para escolher outra.`, 'info'); return; }
  escolhidas = c.checked ? [...escolhidas, c.dataset.turma] : escolhidas.filter((id) => id !== c.dataset.turma);
  history.replaceState(null, '', `?turmas=${escolhidas.join(',')}`);
  desenhar();
  main.querySelector(`[data-turma="${c.dataset.turma}"]`)?.focus();
});
mostrar();
