// Matrícula e documentos do responsável: situação da matrícula, rematrícula, documentos pendentes (com prazo em cor)
// e pedidos à secretaria (declaração, histórico, atestado).
import { iniciar, link, falhaDados, controleModoSimples } from '../app.js';
import { sessao } from '../auth.js';
import { esc, etiqueta, icone, plural, dataBR } from '../ui.js';
import { carregar, estudantes, escolherEstudante, matriculas, dataDeReferencia } from '../dados.js';
import { serieCompleta, proximaSerie, semaforoPrazo, diasEntre, nomeCurto } from '../regras.js';
import { semaforo, seletorDeEstudante } from '../componentes/indicadores.js';
import { blocoDePedidos, ligarPedidos } from '../componentes/pedidos.js';

const main = await iniciar({ perfil: 'responsavel', pagina: 'responsavel/matricula.html', assistente: true, titulo: 'Matrícula e documentos' });
let atual;
const cor = (s) => (s === 'Confirmada' ? 'ok' : s === 'Recusada' ? 'erro' : 'atencao');

async function mostrar() {
  try {
    const { lista, atual: est } = await estudantes();
    atual = est;
    const [escolas, pedidos, hoje] = await Promise.all([carregar('escolas'), matriculas(), dataDeReferencia()]);
    const escola = escolas.find((e) => e.id === est.escolaId);
    const nome = est.nome.split(' ')[0];
    const docs = est.documentos || [];
    const pendentes = docs.filter((x) => x.situacao === 'pendente');
    const rematricula = pedidos.find((x) => x.meu && x.estudanteId === est.id && x.tipo === 'Rematrícula');
    const seguinte = proximaSerie(est.serie);
    const diasRemat = diasEntre(hoje, '2026-11-28');
    main.innerHTML = `
      <h1>Matrícula e documentos</h1>
      <p class="pagina-descricao">Situação da matrícula de ${esc(nome)} e dos documentos que a escola pede.</p>
      ${seletorDeEstudante(lista, est.id)}
      <div class="esp-b-3">${controleModoSimples()}</div>
      <h2 class="esp-t-0">Matrícula de 2026</h2>
      <p class="esp-b-1">${etiqueta('Matrícula ativa', 'ok')}</p>
      <p class="esp-t-1">${esc(est.nome)} está na <strong>${esc(serieCompleta(est.serie))}</strong>, turma ${esc(est.turma.replace(/^.* /, ''))}, ${esc(est.turno.toLowerCase())}, em ${esc(nomeCurto(escola.nome))}.</p>
      <p class="so-completo texto-suave">Código do aluno <strong>${esc(est.codigoAluno)}</strong> · código da matrícula <strong>${esc(est.matricula)}</strong></p>
      ${seguinte ? `<h2>Rematrícula para 2027</h2>${rematricula
        ? `<p>${etiqueta(rematricula.situacao, cor(rematricula.situacao))} <span class="texto-suave">protocolo ${esc(rematricula.protocolo)}</span></p>`
        : `<p>A rematrícula vai de 3 a 28 de novembro. ${esc(nome)} segue para o <strong>${esc(serieCompleta(seguinte))}</strong>.</p><p>${semaforo(semaforoPrazo(diasRemat))} <span class="texto-suave">prazo final: 28/11</span></p><p><a class="botao" href="${link('familia/matricula.html')}?rematricula=${est.id}">Fazer a rematrícula de ${esc(nome)}</a></p>`}` : ''}
      <h2>Documentos</h2>
      ${docs.length ? `<p class="esp-t-0">${pendentes.length ? `<strong>${pendentes.length} ${plural(pendentes.length, 'documento pendente', 'documentos pendentes')}.</strong> Leve na secretaria.` : 'Nenhum documento pendente.'}</p>
      <div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes"><caption class="sr-only">Documentos da matrícula de ${esc(nome)}</caption>
        <thead><tr><th scope="col">Documento</th><th scope="col">Situação</th><th scope="col">Prazo</th></tr></thead>
        <tbody>${docs.map((x) => `<tr><td class="titulo-linha">${esc(x.nome)}</td><td data-rotulo="Situação"><div>${x.situacao === 'entregue' ? etiqueta('Entregue', 'ok') : etiqueta('Pendente', 'atencao')}</div></td><td data-rotulo="Prazo"><div>${x.situacao === 'pendente' && x.prazo ? `${semaforo(semaforoPrazo(diasEntre(hoje, x.prazo)))}<small>até ${dataBR(x.prazo)}</small>` : '<span class="texto-suave">—</span>'}</div></td></tr>`).join('')}</tbody></table></div>` : '<p>A escola ainda não registrou documentos para este estudante.</p>'}
      <div class="so-completo">${await blocoDePedidos(est)}</div>
      <p class="so-completo esp-t-4">${icone('info', 18)} Telefone da secretaria (fictício): (79) 3000-0000 · segunda a sexta, das 7h às 17h.</p>`;
  } catch { falhaDados(main, mostrar); }
}
main.addEventListener('click', (e) => {
  const b = e.target.closest('[data-estudante]');
  if (!b) return;
  escolherEstudante(b.dataset.estudante);
  mostrar().then(() => main.querySelector(`[data-estudante="${b.dataset.estudante}"]`)?.focus());
});
ligarPedidos(main, { estAtual: () => atual, solicitante: () => `${sessao()?.nome || 'Responsável'} (responsável)`, aoMudar: mostrar });
mostrar();
