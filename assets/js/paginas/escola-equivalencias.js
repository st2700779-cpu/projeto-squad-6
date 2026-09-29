// Equivalências (RF12): compara o histórico da escola de origem com a matriz da rede e aponta
// componentes equivalentes e pendências de adaptação. Só regras, sem IA (regras.js › compararHistorico).
import { iniciar, falhaDados } from '../app.js';
import { esc, icone, avisar, etiqueta, confirmar, vazio, numeroBR, dataHoraBR } from '../ui.js';
import { carregar, matriculas, conjunto, salvar, registrarAcao } from '../dados.js';
import { colunaDaMatriz, compararHistorico } from '../regras.js';

const main = await iniciar({ perfil: 'escola', pagina: 'escola/equivalencias.html', assistente: true, papel: 'Secretaria escolar' });
let historicos, pedidos, pareceres, matriz;
let protocolo = null;

const RESULTADOS = {
  equivalente: ['Equivalente', 'ok'],
  complementar: ['Complementar carga', 'atencao'],
  adaptacao: ['Adaptação: não cursou', 'erro'],
  reprovado: ['Reprovado na origem', 'erro']
};

async function mostrar() {
  try {
    let matrizes;
    [historicos, pedidos, pareceres, matrizes] = await Promise.all([carregar('historicos'), matriculas(), conjunto('equivalencias'), carregar('matrizes')]);
    matriz = matrizes.versoes[0];
    protocolo = protocolo || Object.keys(historicos)[0];
    desenhar();
  } catch { falhaDados(main, mostrar); }
}

function desenhar() {
  const transferidos = pedidos.filter((p) => p.tipo === 'Transferência' && historicos[p.protocolo]);
  if (!transferidos.length) {
    main.innerHTML = `<h1>Equivalências</h1>${vazio('Nenhuma transferência com histórico', 'Quando um estudante de outra escola trouxer o histórico, ele aparece aqui para a análise.')}`;
    return;
  }
  const p = transferidos.find((x) => x.protocolo === protocolo) || transferidos[0];
  protocolo = p.protocolo;
  const h = historicos[p.protocolo];
  const coluna = colunaDaMatriz(h.serieCursada);
  const { linhas, semCorrespondencia } = compararHistorico(h, matriz.componentes, coluna);
  const conta = (r) => linhas.filter((l) => l.resultado === r).length;
  const parecer = pareceres[p.protocolo];
  const pendencias = linhas.filter((l) => l.resultado !== 'equivalente');
  main.innerHTML = `
    <h1 class="esp-b-1">Equivalências</h1>
    <p class="texto-suave esp-t-0">Compara o histórico da escola de origem com a matriz ${esc(matriz.versao)} da rede. O resultado sai das regras da rede; a secretaria confere e registra o parecer.</p>
    <div class="ferramentas-tabela"><div class="campo"><label for="estudante">Estudante transferido</label><select id="estudante" class="entrada">${transferidos.map((x) => `<option value="${esc(x.protocolo)}" ${x.protocolo === p.protocolo ? 'selected' : ''}>${esc(x.estudante)} · ${esc(x.serie)} · ${esc(x.situacao)}</option>`).join('')}</select></div></div>
    <div class="cartao"><strong class="texto-medio">${esc(p.estudante)}</strong><br>
      <span class="texto-suave">Vem de: ${esc(h.escolaOrigem)} · Cursou: ${esc(h.serieCursada)} · Vai para: ${esc(p.serie)}</span></div>
    <div class="numeros">
      <div class="numero"><strong>${conta('equivalente')}</strong><span>equivalentes</span></div>
      <div class="numero"><strong>${conta('complementar')}</strong><span>com complementação de carga</span></div>
      <div class="numero${conta('adaptacao') + conta('reprovado') ? ' alerta' : ''}"><strong>${conta('adaptacao') + conta('reprovado')}</strong><span>pendências de adaptação</span></div>
    </div>
    <div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Comparação do histórico de ${esc(p.estudante)} com a matriz da rede</caption>
      <thead><tr><th scope="col">Componente da rede</th><th scope="col" class="num">Aulas/semana na rede</th><th scope="col">Na escola de origem</th><th scope="col">Resultado</th></tr></thead>
      <tbody>${linhas.map((l) => `<tr><td class="titulo-linha">${esc(l.componente)}</td><td data-rotulo="Aulas/semana na rede" class="num">${l.aulasRede}</td>
        <td data-rotulo="Na escola de origem">${l.origem ? `${esc(l.origem.nome)} · ${l.origem.aulas} aula${l.origem.aulas > 1 ? 's' : ''} · nota ${numeroBR(l.origem.nota)}` : '<span class="texto-suave">Não cursou</span>'}</td>
        <td data-rotulo="Resultado">${etiqueta(RESULTADOS[l.resultado][0], RESULTADOS[l.resultado][1])}${l.resultado === 'complementar' ? `<br><span class="texto-suave texto-pequeno">faltam ${l.faltam} aula${l.faltam > 1 ? 's' : ''}/semana</span>` : ''}</td></tr>`).join('')}</tbody>
    </table></div>
    ${semCorrespondencia.length ? `<p class="texto-suave">Sem correspondência na rede (fica no histórico como enriquecimento curricular): <strong class="cor-tinta">${esc(semCorrespondencia.join(', '))}</strong>.</p>` : ''}
    ${pendencias.length ? `<div class="cartao"><strong>Plano de adaptação sugerido</strong><ul class="lista-recuada">${pendencias.map((l) => `<li>${esc(l.componente)}: ${l.resultado === 'complementar' ? `estudos de complementação (${l.faltam} aula${l.faltam > 1 ? 's' : ''}/semana)` : l.resultado === 'reprovado' ? `recuperação (nota ${numeroBR(l.origem.nota)} na origem)` : 'cursar em regime de adaptação'}</li>`).join('')}</ul></div>` : ''}
    ${parecer
      ? `<p class="registro">${icone('ok', 16)}Parecer registrado por ${esc(parecer.quem)} em ${dataHoraBR(parecer.quando)}.</p>`
      : `<button type="button" class="botao botao-largo" id="registrar-parecer">${icone('ok', 20)}Registrar parecer de equivalência</button>`}`;
}

main.addEventListener('change', (e) => { if (e.target.id === 'estudante') { protocolo = e.target.value; desenhar(); } });
main.addEventListener('click', async (e) => {
  if (!e.target.closest('#registrar-parecer')) return;
  const p = pedidos.find((x) => x.protocolo === protocolo);
  if (!(await confirmar({ titulo: 'Registrar o parecer?', texto: `O parecer de equivalência de ${p.estudante} passa a valer para o histórico escolar. Depois de registrado, só pode ser alterado por um novo parecer da secretaria.`, botao: 'Registrar parecer' }))) return;
  try {
    pareceres[protocolo] = { quem: 'Secretaria escolar', quando: new Date().toISOString() };
    await salvar('equivalencias', pareceres);
    await registrarAcao('Secretaria escolar', `Registrou parecer de equivalência de ${p.estudante}`, protocolo);
    desenhar(); avisar('Parecer registrado.');
  } catch {
    avisar('Não foi possível salvar. Tente de novo.');
    mostrar();
  }
});
mostrar();
