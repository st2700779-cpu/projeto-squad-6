// Vida escolar do estudante em linha do tempo, com destaque quando a matriz curricular mudou.
import { iniciar, falhaDados } from '../app.js';
import { esc, vazio } from '../ui.js';
import { carregar, estudantes } from '../dados.js';
import { linhaDoTempo } from '../componentes/linha-do-tempo.js';
import { trajetoDoEstudante } from '../dominio/trajetoria.js';

const main = await iniciar({ perfil: 'aluno', pagina: 'aluno/linha-do-tempo.html', assistente: false });
async function mostrar() {
  try {
    const [{ atual: est }, escolas, tr] = await Promise.all([estudantes(), carregar('escolas'), carregar('trajetorias')]);
    const itens = trajetoDoEstudante(tr, est.id, escolas);
    main.innerHTML = `<h1>Vida escolar de ${esc(est.nome)}</h1>
      ${itens.length ? linhaDoTempo(itens, tr.matrizes) : vazio('Sem histórico registrado', 'O histórico dos anos anteriores ainda não foi lançado no cadastro.')}`;
  } catch { falhaDados(main, mostrar); }
}
mostrar();
