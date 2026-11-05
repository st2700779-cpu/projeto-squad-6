// Direção › Financeiro (PROFIN): a mesma ficha que a equipe do PROFIN vê, só da própria escola. Saldo por recurso, o que falta
// para ficar em dia (prestação, documentos recusados, rascunhos, saldo parado), como a escola está gastando, as declarações,
// o contexto e a linha do tempo. Das anotações do PROFIN, a direção vê só as compartilhadas com a gestão: as pendências abertas
// entram em "O que falta regularizar" e o contexto em "Informações do PROFIN para a sua escola"; as internas não aparecem.
// Para declarar ou corrigir gastos, a direção usa Prestação de contas. Peça em componentes/ficha-profin.js.
import { iniciar, falhaDados, link } from '../app.js';
import { sessao } from '../auth.js';
import { icone } from '../ui.js';
import { carregarFicha, desempenhoOpcional, fichaHtml } from '../componentes/ficha-profin.js';

const main = await iniciar({ perfil: 'diretor', pagina: 'diretor/financeiro.html', assistente: false });
const escolaId = sessao().escolaId;

async function mostrar() {
  try {
    const [base, desempenho] = await Promise.all([carregarFicha(), desempenhoOpcional(escolaId)]);
    const extra = `<div class="linha-botoes"><a class="botao" href="${link('diretor/prestacao.html')}">${icone('formulario', 20)}Declarar ou corrigir gastos</a></div>`;
    main.innerHTML = `
      <div class="cabecalho-pagina"><h1>Financeiro da escola (PROFIN)</h1></div>
      <p class="pagina-descricao">A mesma ficha que a equipe do PROFIN acompanha: quanto entrou, quanto foi gasto e comprovado, o que falta para a escola ficar em dia e como o dinheiro está sendo usado. Você vê apenas as anotações que o PROFIN compartilhou com a sua escola.</p>
      <section aria-labelledby="ficha-titulo">${fichaHtml(base, escolaId, { desempenho, tecnico: false, cabecalhoExtra: extra, acaoDeclaracao: () => `<p class="esp-t-1 esp-b-0"><a href="${link('diretor/prestacao.html')}">Resolver em Prestação de contas</a></p>` })}</section>`;
  } catch { falhaDados(main, mostrar); }
}
mostrar();
