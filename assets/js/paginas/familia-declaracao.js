// Emissão de declarações: matrícula, frequência e transferência, prontas para imprimir ou salvar em PDF.
// ?tipo=matricula|frequencia|transferencia
//   &estudante=<id>   estudante da família (dados de data/estudantes.json e do diário)
//   &protocolo=<MAT>  pedido confirmado, emitido pela secretaria (só declaração de matrícula)
// É um protótipo: a folha leva marca-d'água de documento simulado, sem valor legal.
import { iniciar, falhaDados } from '../app.js';
import { esc, icone, dataBR, hojeBR, avisar } from '../ui.js';
import { carregar, diario, letivo, estudantes, matriculas, novoProtocolo, registrarAcao } from '../dados.js';
import { desempenho, serieCompleta, PRESENCA_MINIMA } from '../regras.js';

const params = new URLSearchParams(location.search);
const tipo = ['matricula', 'frequencia', 'transferencia'].includes(params.get('tipo')) ? params.get('tipo') : 'matricula';
const protocolo = params.get('protocolo');
const TITULOS = { matricula: 'Declaração de matrícula', frequencia: 'Declaração de frequência', transferencia: 'Declaração de transferência' };
const main = await iniciar({
  perfil: protocolo ? 'escola' : 'familia',
  assistente: false, // documento para imprimir: o botão flutuante cobriria o botão Imprimir no celular
  titulo: TITULOS[tipo],
  voltar: protocolo ? 'escola/matriculas.html' : 'familia/documentos.html'
});
const ANO = 2026;
let numero = null;

async function dadosDoAluno() {
  const escolas = await carregar('escolas');
  if (protocolo) {
    const p = (await matriculas()).find((x) => x.protocolo === protocolo && x.situacao === 'Confirmada');
    if (!p) return null;
    return { nome: p.estudante, serie: p.serie, turma: null, turno: null, nascimento: null, escola: escolas.find((e) => e.id === p.escolaId), presenca: null };
  }
  const [{ lista, atual }, dia, lv] = await Promise.all([estudantes(), diario(), letivo()]);
  const est = lista.find((e) => e.id === params.get('estudante')) || atual;
  return { ...est, escola: escolas.find((e) => e.id === est.escolaId), presenca: desempenho(est, dia, lv.aulasDadas).presenca };
}

function texto(a) {
  const quem = `<strong>${esc(a.nome.toUpperCase())}</strong>${a.nascimento ? `, nascido(a) em ${dataBR(a.nascimento)},` : ''}`;
  const onde = `na <strong>${esc(serieCompleta(a.serie))}</strong>${a.turma ? `, turma ${esc(a.turma.replace(/^.* /, ''))}` : ''}${a.turno ? `, turno ${esc(a.turno.toLowerCase())}` : ''}, do(a) <strong>${esc(a.escola.nome)}</strong>`;
  if (tipo === 'frequencia') {
    return `<p>Declaramos, para os devidos fins, que ${quem} está regularmente matriculado(a) ${onde}, no ano letivo de ${ANO}, e apresenta frequência de <strong>${a.presenca.toFixed(0)}%</strong> das aulas dadas até ${hojeBR()}.</p>
      <p>A frequência mínima exigida para aprovação é de ${PRESENCA_MINIMA}% do total de horas letivas.</p>`;
  }
  if (tipo === 'transferencia') {
    return `<p>Declaramos, para os devidos fins, que ${quem} esteve regularmente matriculado(a) ${onde}, no ano letivo de ${ANO}, e solicitou transferência nesta data.</p>
      <p>O(a) estudante deve ser matriculado(a) na mesma série na escola de destino. O histórico escolar será enviado em até 30 dias.</p>`;
  }
  return `<p>Declaramos, para os devidos fins, que ${quem} está regularmente matriculado(a) ${onde}, no ano letivo de ${ANO}.</p>`;
}

async function mostrar() {
  try {
    const a = await dadosDoAluno();
    if (!a) {
      main.innerHTML = `<p class="alerta-erro">${icone('alerta', 20)}<span>Só é possível emitir a declaração de matrícula depois que a escola confirmar o pedido.</span></p>`;
      return;
    }
    if (tipo === 'frequencia' && a.presenca === null) {
      main.innerHTML = `<p class="alerta-erro">${icone('alerta', 20)}<span>A declaração de frequência sai depois que o estudante tiver aulas registradas no diário.</span></p>`;
      return;
    }
    main.innerHTML = `
      <div class="nao-imprimir">
        <h1 style="margin-bottom:.3rem">${TITULOS[tipo]}</h1>
        <p class="texto-suave" style="margin-top:0">Confira os dados. Ao emitir, a declaração recebe um número e abre a janela de impressão, onde você também pode salvar em PDF.</p>
      </div>
      <article class="folha" aria-label="Prévia da declaração">
        <div class="marca-dagua" aria-hidden="true">DOCUMENTO SIMULADO<br>PROTÓTIPO · SEM VALOR LEGAL</div>
        <div class="cabecalho-folha"><strong>Rede Estadual de Ensino de Sergipe</strong><br>${esc(a.escola.nome)}<br>${esc(a.escola.municipio)}/SE</div>
        <h2>${TITULOS[tipo].toUpperCase()}</h2>
        ${texto(a)}
        <p style="text-align:right;margin-top:1.5rem">${esc(a.escola.municipio)}/SE, ${hojeBR()}.</p>
        <div class="assinatura"><span></span>Secretaria escolar<br>${esc(a.escola.nome)}</div>
        <div class="rodape-folha">Declaração nº <strong>${numero ? esc(numero) : '(gerado ao emitir)'}</strong> · Emitida pelo Portal Acadêmico em ${hojeBR()} · Dados fictícios de demonstração.</div>
      </article>
      <div class="barra-acoes nao-imprimir">
        <button type="button" class="botao botao-grande" id="emitir">${icone('imprimir', 22)}${numero ? 'Imprimir de novo' : 'Emitir e imprimir'}</button>
      </div>`;
  } catch { falhaDados(main, mostrar); }
}

main.addEventListener('click', async (e) => {
  const b = e.target.closest('#emitir');
  if (!b) return;
  if (!numero) {
    b.disabled = true;
    try {
      numero = await novoProtocolo('DEC');
      await registrarAcao(protocolo ? 'Secretaria escolar' : 'Família', `Emitiu ${TITULOS[tipo].toLowerCase()}`, numero);
    } catch {
      b.disabled = false;
      avisar('Não foi possível emitir agora. Tente de novo.');
      return;
    }
    await mostrar();
  }
  window.print();
});
mostrar();
