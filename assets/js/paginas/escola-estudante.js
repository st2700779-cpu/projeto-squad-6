// Ficha do estudante na secretaria: dados de cadastro, declarações e linha do tempo da vida escolar.
import { iniciar, falhaDados, link } from '../app.js';
import { esc, dataBR, vazio } from '../ui.js';
import { carregar } from '../dados.js';
import { serieCompleta } from '../regras.js';
import { linhaDoTempo } from '../componentes/linha-do-tempo.js';
import { trajetoDoEstudante } from '../dominio/trajetoria.js';

const main = await iniciar({ perfil: 'escola', titulo: 'Ficha do estudante', assistente: false });
async function mostrar() {
  try {
    const id = new URLSearchParams(location.search).get('id');
    const [lista, escolas, tr] = await Promise.all([carregar('estudantes'), carregar('escolas'), carregar('trajetorias')]);
    const e = lista.find((x) => x.id === id);
    if (!e) { main.innerHTML = '<h1>Estudante não encontrado</h1>' + vazio('Nenhum cadastro com este código', 'Volte à lista de estudantes e abra a ficha de novo.') + `<p><a href="${link('escola/estudantes.html')}">Voltar à lista de estudantes</a></p>`; return; }
    const escola = escolas.find((x) => x.id === e.escolaId);
    const itens = trajetoDoEstudante(tr, e.id, escolas);
    main.innerHTML = `<h1>${esc(e.nome)}</h1>
      <p class="pagina-descricao">Matrícula ${esc(e.matricula)} · ${esc(serieCompleta(e.serie))}, ${esc(e.turma)}, ${esc(e.turno.toLowerCase())} · ${esc(escola.nome)}</p>
      <dl class="dados-verificacao">
        <dt>Nascimento</dt><dd>${dataBR(e.nascimento)}</dd>
        <dt>Responsável</dt><dd>${esc(e.responsavel)}</dd>
        <dt>Carteirinha</dt><dd>válida até ${dataBR(e.validade)}</dd>
      </dl>
      <div class="linha-botoes esp-b-4">
        <a class="botao botao-secundario" href="${link('aluno/declaracao.html')}?tipo=matricula&estudante=${encodeURIComponent(e.id)}">Emitir declaração de matrícula</a>
        <a class="botao botao-secundario" href="${link('aluno/declaracao.html')}?tipo=frequencia&estudante=${encodeURIComponent(e.id)}">Emitir declaração de frequência</a>
      </div>
      <h2>Vida escolar</h2>
      ${itens.length ? linhaDoTempo(itens, tr.matrizes) : vazio('Sem histórico registrado', 'O histórico dos anos anteriores ainda não foi lançado.')}
      <p class="esp-t-4"><a href="${link('escola/estudantes.html')}">Voltar à lista de estudantes</a></p>`;
  } catch { falhaDados(main, mostrar); }
}
mostrar();
