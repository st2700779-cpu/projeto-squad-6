// Bloco "Pedir à secretaria" e lista de pedidos do estudante. Usado pelo aluno (Documentos) e pelo responsável (Matrícula e documentos).
import { esc, icone, etiqueta, dataBR, avisar, comEspera, vazio } from '../ui.js';
import { criarSolicitacao, solicitacoesDoEstudante } from '../solicitacoes.js';
import { semaforoPrazo, diasEntre } from '../regras.js';
import { dataDeReferencia } from '../dados.js';
import { semaforo } from './indicadores.js';

const PEDIDOS = [['Declaração de matrícula', 'documento'], ['Declaração de frequência', 'documento'], ['Histórico escolar', 'livro'], ['Atestado de escolaridade', 'formulario']];
const TIPO = { Pendente: 'atencao', 'Em andamento': 'info', Pronta: 'ok', Entregue: 'neutra' };
const AVISO = { Pronta: 'Pronta: retire na secretaria.', Entregue: 'Entregue.', 'Em andamento': 'A secretaria está preparando.', Pendente: 'Aguardando a secretaria.' };

/** HTML do bloco: botões de pedido e a lista dos pedidos já feitos. */
export async function blocoDePedidos(est) {
  const [pedidos, hoje] = await Promise.all([solicitacoesDoEstudante(est.id), dataDeReferencia()]);
  const feitos = pedidos.filter((p) => p.tipo !== 'Correção de dado cadastral');
  return `<section aria-labelledby="pedir-titulo"><h2 id="pedir-titulo">Pedir à secretaria</h2>
    <p class="esp-t-0">A secretaria responde em até 5 dias. Quando ficar pronto, retire na escola ou imprima aqui.</p>
    <div class="linha-botoes esp-b-4">${PEDIDOS.map(([t, i]) => `<button type="button" class="botao botao-secundario" data-pedir="${esc(t)}">${icone(i, 20)}${esc(t)}</button>`).join('')}</div>
    ${feitos.length ? `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Pedidos feitos à secretaria</caption>
      <thead><tr><th scope="col">Pedido</th><th scope="col">Feito em</th><th scope="col">Situação</th><th scope="col">Prazo</th></tr></thead>
      <tbody>${feitos.map((p) => `<tr><td class="titulo-linha"><strong>${esc(p.tipo)}</strong><br><small>${esc(p.id)}</small></td><td data-rotulo="Feito em"><div>${dataBR(p.criadaEm)}</div></td><td data-rotulo="Situação"><div>${etiqueta(p.situacao, TIPO[p.situacao])}<small>${esc(AVISO[p.situacao])}</small></div></td><td data-rotulo="Prazo"><div>${['Pronta', 'Entregue'].includes(p.situacao) ? '<span class="texto-suave">—</span>' : semaforo(semaforoPrazo(diasEntre(hoje, p.prazo)))}</div></td></tr>`).join('')}</tbody></table></div>` : vazio('Nenhum pedido ainda', 'Os pedidos feitos aqui aparecem nesta lista, com a situação de cada um.')}</section>`;
}

/** Liga os botões do bloco. `estAtual()` devolve o estudante; `aoMudar()` redesenha a tela. */
export function ligarPedidos(raiz, { estAtual, solicitante, aoMudar }) {
  raiz.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-pedir]');
    if (!b) return;
    try {
      const pedido = await comEspera(b, () => criarSolicitacao({ tipo: b.dataset.pedir, estudante: estAtual(), solicitante: solicitante() }));
      avisar(`Pedido feito: ${pedido.tipo}. Número ${pedido.id}.`);
      await aoMudar();
    } catch { avisar('Não foi possível enviar o pedido. Confira a conexão e tente de novo.'); }
  });
}
