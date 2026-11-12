// Rascunho de relatório consolidado do PROFIN: monta o texto com os números do painel e as anotações de contexto,
// por modelo fixo (sem inteligência artificial). A pessoa revisa, escreve as conclusões e copia, baixa ou imprime.
import { iniciar, falhaDados } from '../app.js';
import { profinComDeclaracoes } from '../prestacao-dados.js';
import { esc, avisar, confirmar, baixarTexto, icone } from '../ui.js';
import { carregar, conjunto, dataDeReferencia } from '../dados.js';
import { rascunhoDoRelatorio } from '../regras.js';

const main = await iniciar({ perfil: 'profin', pagina: 'profin/relatorio.html', assistente: false });
let dados, escolas, notas, hoje, gerado = '';

const montar = () => {
  const id = main.querySelector('#escopo').value;
  const categorias = [...main.querySelectorAll('[data-categoria]:checked')].map((c) => c.dataset.categoria);
  return rascunhoDoRelatorio({ escolas: id ? escolas.filter((e) => e.id === id) : escolas, repasses: dados.repasses.filter((r) => !id || r.escolaId === id), notas, hoje, categorias, declaracoes: dados.declaracoes });
};
const atualizarImpressao = () => { main.querySelector('#impressao').textContent = main.querySelector('#rascunho').value; };

async function mostrar() {
  try {
    [dados, escolas, notas, hoje] = await Promise.all([profinComDeclaracoes(), carregar('escolas'), conjunto('profin-notas'), dataDeReferencia()]);
    escolas = escolas.filter((e) => !e.exemplo); // as escolas reais com vagas de exemplo não têm dados do PROFIN no protótipo
    main.innerHTML = `
      <h1>Relatório consolidado</h1>
      <p class="pagina-descricao">O rascunho junta os números do painel e as anotações de contexto num texto pronto para revisar. Montado por modelo fixo, sem inteligência artificial.</p>
      <form id="opcoes" class="painel-inline nao-imprimir" novalidate>
        <div class="campo"><label for="escopo">Escolas</label><select id="escopo" class="entrada"><option value="">Todas as escolas</option>${escolas.map((e) => `<option value="${e.id}">${esc(e.nome)}</option>`).join('')}</select></div>
        <fieldset class="campo"><legend>Categorias</legend><div class="linha-botoes">${dados.categorias.map((c) => `<label class="chave-simples"><input type="checkbox" class="caixa-grande" data-categoria="${esc(c)}" checked><span>${esc(c)}</span></label>`).join('')}</div></fieldset>
        <button type="submit" class="botao">${icone('documento', 20)}Gerar rascunho</button></form>
      <div class="campo esp-t-4"><label for="rascunho">Rascunho (pode editar)</label><textarea id="rascunho" class="entrada rascunho nao-imprimir" spellcheck="true" data-formato="livre" maxlength="20000"></textarea></div>
      <pre id="impressao" class="so-impressao" aria-hidden="true"></pre>
      <div class="linha-botoes nao-imprimir"><button type="button" class="botao botao-secundario" id="copiar">Copiar texto</button><button type="button" class="botao botao-secundario" id="baixar">${icone('baixar', 20)}Baixar (.txt)</button><button type="button" class="botao botao-secundario" id="imprimir">${icone('imprimir', 20)}Imprimir</button></div>`;
    gerado = montar();
    main.querySelector('#rascunho').value = gerado;
    atualizarImpressao();
  } catch { falhaDados(main, mostrar); }
}
main.addEventListener('submit', async (e) => {
  e.preventDefault();
  const campo = main.querySelector('#rascunho');
  if (campo.value !== gerado && !(await confirmar({ titulo: 'Gerar de novo?', texto: 'O texto atual foi editado. Gerar de novo apaga as suas alterações.', botao: 'Gerar de novo' }))) return;
  if (!main.querySelector('[data-categoria]:checked')) { avisar('Marque pelo menos uma categoria.', 'erro'); return; }
  gerado = montar();
  campo.value = gerado;
  atualizarImpressao();
  avisar('Rascunho gerado. Revise e escreva as conclusões no fim.', 'ok');
  campo.focus();
});
main.addEventListener('input', (e) => { if (e.target.id === 'rascunho') atualizarImpressao(); });
main.addEventListener('click', async (e) => {
  const texto = main.querySelector('#rascunho')?.value;
  if (e.target.closest('#copiar')) { try { await navigator.clipboard.writeText(texto); avisar('Texto copiado.'); } catch { main.querySelector('#rascunho').select(); avisar('Não foi possível copiar sozinho. O texto ficou selecionado: use Ctrl+C.', 'info'); } }
  if (e.target.closest('#baixar')) { baixarTexto(`relatorio-profin-${hoje}.txt`, texto); }
  if (e.target.closest('#imprimir')) window.print();
});
mostrar();
