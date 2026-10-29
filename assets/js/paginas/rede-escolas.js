// Escolas da rede (SEED e DRE): lista com endereço e os atos de cada nível; cadastro de escola com o ato autorizativo
// (inclusive divisão de escola), as séries que a escola tem e o curso de cada nível; busca dos dados pelo código INEP no
// Censo Escolar (base simulada); edição; histórico dos atos com o PDF; turmas e vagas calculadas.
// Quem é de uma DRE vê e altera só as escolas da sua regional (dre.js). As regras ficam em dominio/cadastros.js e dominio/vagas.js.
import { iniciar, falhaDados } from '../app.js';
import { sessao } from '../auth.js';
import { esc, etiqueta, icone, avisar, vazio, combina, debounce, comEspera, dataBR, plural, confirmar } from '../ui.js';
import { carregar, conjunto, salvar, registrarAcao, dataDeReferencia, vagasDetalhadas } from '../dados.js';
import { situacaoAto } from '../regras.js';
import { ETAPAS, TIPOS_DE_ATO, validarEscola, montarEscola, validarEdicaoDeEscola, aplicarEdicaoDeEscola, validarRenovacaoDeAto, aplicarRenovacaoDeAto, seriesEscolhidas, validarSeriesDaEscola, aplicarSeriesAosAtos, atosDoNivel, somenteDigitos } from '../dominio/cadastros.js';
import { TURNOS, textoPorTurno, validarTurmaNova, montarTurmaNova } from '../dominio/vagas.js';
import { campo, marcas, lerFormulario, mostrarErros } from '../componentes/formulario.js';
import { dreDaSessao, daMinhaDre, dresDoAcesso, municipiosDa, dreDoMunicipio, avisoDeAcesso, filtrosDreMunicipio } from '../dre.js';
import { conferirPdf, guardarPdf, abrirPdf, tamanhoLegivel } from '../arquivos.js';

const main = await iniciar({ perfil: 'rede', pagina: 'rede/escolas.html', assistente: true });
let escolas, atos, detalhe, localidades, dres, cursos, turmasAbertas, comSecretaria, hoje;
let busca = '';
let dreFiltro = '';
let municipio = '';
let aberto = false;
let painel = null; // { tipo: 'turmas' | 'editar' | 'atos', id, etapa? }

async function mostrar() {
  try {
    let usuarios;
    [escolas, atos, detalhe, localidades, dres, cursos, turmasAbertas, usuarios, hoje] = await Promise.all([carregar('escolas'), carregar('atos'), vagasDetalhadas(), carregar('localidades'), carregar('dres'), conjunto('cursos'), conjunto('turmas-rede-novas'), carregar('usuarios'), dataDeReferencia()]);
    // Escolas com secretaria no protótipo criam as próprias turmas (Secretaria › Turmas); nas outras, a rede abre as turmas.
    comSecretaria = new Set(usuarios.filter((u) => u.perfil === 'escola' && u.escolaId).map((u) => u.escolaId));
    const pedido = new URLSearchParams(location.search).get('renovar'); // vem da tela de atos: "Registrar ato renovado"
    if (pedido && !painel) { const [id, etapa] = pedido.split('|'); const e = escolas.find((x) => x.id === id); if (e && daMinhaDre(e)) painel = { tipo: 'atos', id, etapa }; }
    desenhar();
  } catch { falhaDados(main, mostrar); }
}
const minhas = () => escolas.filter(daMinhaDre);
const extrasDeMunicipio = () => [...new Set(escolas.map((e) => e.municipio))];
const filtradas = () => minhas().filter((e) => (!dreFiltro || e.dre === dreFiltro) && (!municipio || e.municipio === municipio) && combina(busca, e.nome, e.municipio, e.dre, e.bairro, e.inep));
const hojeData = () => new Date(`${hoje}T12:00:00`);
const atosDa = (e) => ETAPAS.map((t) => atos.find((a) => a.escolaId === e.id && a.etapa === t.etapa)).filter(Boolean);
const etapaInfo = (etapa) => ETAPAS.find((t) => t.etapa === etapa) || { curto: etapa, resumo: '', series: [] };
const listaDeSeries = (series) => series.map((s) => s.replace(' EM', '')).join(', ');
const cursosDoNivel = (etapa) => cursos.filter((c) => c.etapa === etapa && c.ativo !== false);

// ---------------- Lista ----------------
// Uma linha por nível: o ato daquele nível, com a situação, o curso e as séries. Antes a coluna misturava os atos dos níveis.
function atosPorNivel(e) {
  const meus = atosDa(e);
  if (!meus.length) return '<span class="texto-suave">Nenhum nível liberado</span>';
  return `<ul class="atos-niveis">${meus.map((a) => {
    const t = etapaInfo(a.etapa); const s = situacaoAto(a, hojeData());
    return `<li><div class="ato-nivel-topo"><strong>${esc(t.curto)}</strong> ${etiqueta(s.texto, s.tipo)}</div>
      <span class="texto-pequeno">${esc(a.numero)} · vence em ${dataBR(a.validade)}${a.pdf ? ' · PDF anexado' : ''}</span>
      <span class="texto-pequeno texto-suave">${esc(a.curso || t.etapa)} · séries: ${esc(listaDeSeries(seriesEscolhidas(a.etapa, a.series)))}</span></li>`;
  }).join('')}</ul>`;
}

function tabela(lista) {
  if (!lista.length) return vazio('Nenhuma escola encontrada', 'Mude a busca, a DRE ou o município para ver outras escolas.');
  return `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Escolas da rede</caption>
    <thead><tr><th scope="col">Escola</th><th scope="col">Endereço</th><th scope="col">Atos por nível de ensino</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead>
    <tbody>${lista.map((e) => {
      const meus = atosDa(e);
      const origem = e.origemId ? escolas.find((x) => x.id === e.origemId) : null;
      return `<tr><td class="titulo-linha"><strong>${esc(e.nome)}</strong> ${e.cadastradaEm ? etiqueta('Nova', 'info') : ''}${e.exemplo ? ` ${etiqueta('Vagas de exemplo')}` : ''}<br><span class="texto-suave texto-pequeno">${esc(e.municipio)} · ${esc(e.dre)}${e.inep ? ` · INEP ${esc(e.inep)}` : ''}</span>${origem ? `<br><span class="texto-suave texto-pequeno">Dividida a partir de ${esc(origem.nome)}</span>` : ''}</td>
        <td data-rotulo="Endereço"><div>${esc(e.endereco || `${e.bairro}, ${e.municipio}`)}${e.referencia ? `<br><span class="texto-suave texto-pequeno">Referência: ${esc(e.referencia)}</span>` : ''}${e.telefone ? `<br><span class="texto-suave texto-pequeno">Tel. ${esc(e.telefone)}</span>` : ''}</div></td>
        <td data-rotulo="Atos">${atosPorNivel(e)}</td>
        <td class="acoes"><div class="linha-botoes"><button type="button" class="botao botao-secundario botao-mini" data-editar="${e.id}" aria-label="Editar os dados de ${esc(e.nome)}">Editar</button><button type="button" class="botao botao-secundario botao-mini" data-atos="${e.id}" ${meus.length ? '' : 'disabled'} aria-label="Ver os atos e registrar ato renovado de ${esc(e.nome)}">Atos</button><button type="button" class="botao botao-secundario botao-mini" data-turmas="${e.id}" ${meus.length ? '' : 'disabled'} aria-label="Turmas e vagas de ${esc(e.nome)}">Turmas e vagas</button></div></td></tr>`;
    }).join('')}</tbody></table></div>
    <p class="contagem">${lista.length} ${plural(lista.length, 'escola', 'escolas')}</p>`;
}

// ---------------- Painel: turmas e vagas (calculadas) ----------------
function blocoTurmas(e) {
  const meus = atosDa(e);
  const series = meus.flatMap((a) => seriesEscolhidas(a.etapa, a.series));
  const daEscola = detalhe[e.id] || {};
  const linhas = series.map((s) => {
    const c = daEscola[s] || { lugares: 0, porTurno: {}, aguardando: 0, aguardandoTurma: 0, vagas: 0, excesso: 0, turmas: [] };
    const ato = meus.find((a) => seriesEscolhidas(a.etapa, a.series).includes(s));
    const bloq = !ato || !situacaoAto(ato, hojeData()).vigente;
    return `<tr><td class="titulo-linha"><strong>${esc(s.replace(' EM', ' (Ensino Médio)'))}</strong></td>
      <td data-rotulo="Turmas"><div>${c.turmas.length ? c.turmas.map((t) => `${esc(t.nome)} · ${esc(t.turno)} · ${t.ocupados} de ${t.capacidade}`).join('<br>') : '<span class="texto-suave">nenhuma turma aprovada</span>'}</div></td>
      <td data-rotulo="Lugares livres"><div>${c.lugares}${Object.keys(c.porTurno).length ? `<br><span class="texto-suave texto-pequeno">${esc(textoPorTurno(c.porTurno))}</span>` : ''}</div></td>
      <td class="num" data-rotulo="Pedidos sem turma">${c.aguardando + c.aguardandoTurma}</td>
      <td data-rotulo="Vagas"><div>${bloq ? etiqueta('bloq. (ato vencido)', 'erro') : c.excesso ? `${etiqueta('0', 'erro')}<br><span class="texto-pequeno">${c.excesso} ${plural(c.excesso, 'pedido a mais que os lugares', 'pedidos a mais que os lugares')}</span>` : `<strong>${c.vagas}</strong>`}</div></td></tr>`;
  }).join('');
  const podeAbrir = !comSecretaria.has(e.id);
  const abertas = turmasAbertas.filter((t) => t.escolaId === e.id);
  return `<section class="form-cadastro" id="painel-turmas" aria-labelledby="turmas-titulo">
    <h2 id="turmas-titulo">Turmas e vagas: ${esc(e.nome)}</h2>
    <p class="texto-suave esp-t-0">As vagas não são digitadas: são os lugares livres nas turmas aprovadas (lugares da sala − alunos), menos os pedidos de matrícula que ainda não têm turma. Ato vencido bloqueia a série mesmo com lugar livre.</p>
    <div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes"><caption class="sr-only">Turmas e vagas por série</caption>
      <thead><tr><th scope="col">Série</th><th scope="col">Turmas (ocupados de lugares)</th><th scope="col">Lugares livres por turno</th><th scope="col" class="num">Pedidos sem turma</th><th scope="col">Vagas</th></tr></thead>
      <tbody>${linhas}</tbody></table></div>
    ${podeAbrir ? `<form id="form-turma" class="form-bloco" novalidate data-escola="${e.id}" aria-labelledby="tu-titulo">
      <h3 id="tu-titulo">Abrir turma nesta escola</h3>
      ${campo({ prefixo: 'tu', nome: 'serie', rotulo: 'Série', obrigatorio: true, opcoes: [['', 'Escolha a série'], ...series.map((s) => [s, s])] })}
      ${campo({ prefixo: 'tu', nome: 'turno', rotulo: 'Turno', obrigatorio: true, opcoes: [['', 'Escolha o turno'], ...TURNOS.map((t) => [t, t])] })}
      ${campo({ prefixo: 'tu', nome: 'nome', rotulo: 'Nome da turma', dica: 'Exemplo: 6º ano A', obrigatorio: true, atributos: 'maxlength="30" autocomplete="off"' })}
      ${campo({ prefixo: 'tu', nome: 'capacidade', rotulo: 'Lugares na sala', tipo: 'number', dica: 'De 10 a 60', obrigatorio: true, atributos: 'min="10" max="60" step="1" inputmode="numeric"' })}
      <div class="largo form-acoes"><button type="submit" class="botao">${icone('mais', 20)}Abrir turma</button></div>
    </form>
    ${abertas.length ? `<ul class="lista-simples">${abertas.map((t) => `<li><span>${esc(t.nome)} · ${esc(t.turno)} · ${t.capacidade} lugares <span class="texto-suave texto-pequeno">aberta pela rede em ${dataBR(t.abertaEm)}</span></span><button type="button" class="botao botao-secundario botao-mini" data-fechar-turma="${esc(t.id)}">Fechar turma</button></li>`).join('')}</ul>` : ''}`
    : '<p class="alerta-info">As turmas desta escola são criadas pela secretaria e aprovadas pela direção (Secretaria › Turmas). Quando a turma é aprovada, as vagas aparecem aqui sozinhas.</p>'}
    <div class="form-acoes"><button type="button" class="botao botao-secundario" id="fechar-painel">Fechar</button></div></section>`;
}

// ---------------- Painel: editar dados ----------------
function seletorDre(prefixo, valor) {
  const doAcesso = dresDoAcesso(dres);
  if (dreDaSessao()) return `<div class="campo"><span class="rotulo-fixo">DRE</span><p class="valor-fixo">${esc(dreDaSessao())}</p><input type="hidden" name="dre" value="${esc(dreDaSessao())}"></div>`;
  const opcoes = [['', 'Escolha a DRE'], ...doAcesso.map((d) => [d.dre, d.territorio ? `${d.dre} (${d.territorio})` : d.dre])];
  if (valor && !doAcesso.some((d) => d.dre === valor)) opcoes.push([valor, valor]);
  return campo({ prefixo, nome: 'dre', rotulo: 'DRE (diretoria regional)', valor, obrigatorio: true, dica: 'Escolha a DRE primeiro: a lista de municípios mostra só os dela.', opcoes });
}
function opcoesDeMunicipio(dre, valor) {
  const lista = dre ? municipiosDa(dres, dre) : [];
  const itens = [['', dre ? 'Escolha o município' : 'Escolha a DRE primeiro'], ...lista.map((m) => [m, m])];
  if (valor && !lista.includes(valor)) itens.push([valor, `${valor} (fora da DRE)`]);
  return itens;
}
function blocoSeriesDaEscola(e, prefixo) {
  const meus = atosDa(e);
  return `<fieldset class="campo largo" id="${prefixo}-series" aria-describedby="${prefixo}-series-erro"><legend>Séries que a escola tem <span class="obrigatorio" aria-hidden="true">*</span></legend>
    ${meus.map((a) => { const t = etapaInfo(a.etapa); const marcadas = seriesEscolhidas(a.etapa, a.series); return `<p class="negrito esp-b-0">${esc(t.curto)} <span class="texto-suave peso-normal">(${esc(a.numero)})</span></p><div class="marcas">${t.series.map((s) => `<label class="marca-item"><input type="checkbox" name="series" value="${esc(s)}" ${marcadas.includes(s) ? 'checked' : ''}><span>${esc(s.replace(' EM', ' (Médio)'))}</span></label>`).join('')}</div>`; }).join('')}
    <span class="dica">Desmarque a série que a escola não oferece: ela some da matrícula e das vagas.</span><p class="erro" id="${prefixo}-series-erro" role="alert"></p></fieldset>`;
}
function blocoEdicao(e) {
  return `<form id="form-editar" class="form-cadastro" novalidate data-escola="${e.id}" aria-labelledby="ed-titulo">
    <h2 id="ed-titulo">Editar dados: ${esc(e.nome)}</h2>
    <p class="texto-suave esp-t-0">Muda os dados da escola e as séries que ela tem. O ato de cada nível muda pelo botão "Atos".</p>
    <fieldset class="form-bloco"><legend>Dados da escola</legend>
      <div class="largo">${campo({ prefixo: 'ed', nome: 'nome', rotulo: 'Nome da escola', valor: e.nome, obrigatorio: true, atributos: 'maxlength="120"' })}</div>
      ${campo({ prefixo: 'ed', nome: 'inep', rotulo: 'Código INEP', valor: e.inep || '', dica: '8 números. Opcional se ainda não houver', atributos: 'inputmode="numeric" maxlength="8"' })}
      ${seletorDre('ed', e.dre)}
      ${campo({ prefixo: 'ed', nome: 'municipio', rotulo: 'Município', valor: e.municipio, obrigatorio: true, opcoes: opcoesDeMunicipio(dreDaSessao() || e.dre, e.municipio) })}
      ${campo({ prefixo: 'ed', nome: 'telefone', rotulo: 'Telefone', valor: e.telefone || '', tipo: 'tel', dica: 'Com DDD. Opcional' })}
      ${campo({ prefixo: 'ed', nome: 'email', rotulo: 'E-mail', valor: e.email || '', tipo: 'email', dica: 'Opcional' })}
    </fieldset>
    <fieldset class="form-bloco"><legend>Endereço</legend>
      <div class="largo">${campo({ prefixo: 'ed', nome: 'endereco', rotulo: 'Endereço completo', valor: e.endereco || `${e.bairro}, ${e.municipio}`, obrigatorio: true, atributos: 'maxlength="160"' })}</div>
      ${campo({ prefixo: 'ed', nome: 'bairro', rotulo: 'Bairro ou povoado', valor: e.bairro || '', obrigatorio: true })}
      <div class="largo">${campo({ prefixo: 'ed', nome: 'referencia', rotulo: 'Ponto de referência', valor: e.referencia || '', dica: 'Opcional. Exemplo: ao lado da Praça da Matriz', atributos: 'maxlength="120" autocomplete="off"' })}</div>
    </fieldset>
    ${blocoSeriesDaEscola(e, 'ed')}
    <div class="form-acoes"><button type="submit" class="botao">${icone('ok', 20)}Salvar dados</button><button type="button" class="botao botao-secundario" id="fechar-painel">Cancelar</button></div></form>`;
}

// ---------------- Painel: atos da escola (todos, ao longo dos anos) ----------------
function botaoPdf(pdf) {
  return pdf ? `<div><button type="button" class="botao botao-texto botao-mini" data-pdf="${esc(pdf.id)}" aria-label="Abrir o PDF ${esc(pdf.nome)}">${icone('documento', 18)}Abrir PDF</button><br><span class="texto-suave texto-pequeno">${esc(pdf.nome)} · ${esc(tamanhoLegivel(pdf.tamanho))}</span></div>` : '<span class="texto-suave texto-pequeno">sem PDF</span>';
}
function blocoAtos(e) {
  const meus = atosDa(e);
  const etapa = painel.etapa && meus.some((a) => a.etapa === painel.etapa) ? painel.etapa : meus[0]?.etapa;
  const atual = meus.find((a) => a.etapa === etapa);
  const niveis = meus.map((a) => {
    const t = etapaInfo(a.etapa); const s = situacaoAto(a, hojeData());
    return `<div class="ato-historico"><h3>${esc(t.curto)} <span class="texto-suave peso-normal">(${esc(t.resumo)})</span> ${etiqueta(s.texto, s.tipo)}</h3>
      <p class="texto-pequeno texto-suave esp-t-0">Curso: ${esc(a.curso || t.etapa)} · séries: ${esc(listaDeSeries(seriesEscolhidas(a.etapa, a.series)))}</p>
      <div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes"><caption class="sr-only">Atos de ${esc(t.curto)}, do vigente ao mais antigo</caption>
        <thead><tr><th scope="col">Ato</th><th scope="col">Tipo</th><th scope="col">Publicação</th><th scope="col">Vencimento</th><th scope="col">Documento</th></tr></thead>
        <tbody>${atosDoNivel(a).map((x) => `<tr><td class="titulo-linha"><strong>${esc(x.numero)}</strong> ${x.vigente ? etiqueta('Atual', 'info') : etiqueta('Anterior', 'neutra')}</td><td data-rotulo="Tipo">${esc(x.tipo || '—')}</td><td data-rotulo="Publicação">${x.publicacao ? dataBR(x.publicacao) : '<span class="texto-suave">—</span>'}</td><td data-rotulo="Vencimento">${dataBR(x.validade)}</td><td data-rotulo="Documento">${botaoPdf(x.pdf)}</td></tr>`).join('')}</tbody>
      </table></div></div>`;
  }).join('');
  return `<section class="form-cadastro" id="painel-atos" aria-labelledby="atos-titulo">
    <h2 id="atos-titulo">Atos autorizativos: ${esc(e.nome)}</h2>
    <p class="texto-suave esp-t-0">Todos os atos de cada nível, do atual ao mais antigo. O PDF da resolução fica guardado com o ato.</p>
    ${niveis}
    <form id="form-ato" class="form-bloco" novalidate data-escola="${e.id}" aria-labelledby="at-titulo">
      <h3 id="at-titulo">Registrar ato renovado</h3>
      <p class="largo texto-suave esp-t-0">Use quando o Conselho Estadual de Educação publicar o novo ato. O atual vai para o histórico e a escola volta a poder abrir turmas e receber matrículas nesse nível.</p>
      <div class="largo">${campo({ prefixo: 'at', nome: 'etapa', rotulo: 'Nível de ensino do ato', valor: etapa, obrigatorio: true, opcoes: meus.map((a) => [a.etapa, `${etapaInfo(a.etapa).curto} · ${a.numero} · vence em ${dataBR(a.validade)}`]) })}</div>
      ${campo({ prefixo: 'at', nome: 'numero', rotulo: 'Número do novo ato', dica: 'Exemplo: Resolução CEE nº 200/2026', obrigatorio: true, atributos: 'maxlength="60" autocomplete="off"' })}
      ${campo({ prefixo: 'at', nome: 'publicacao', rotulo: 'Data de publicação', tipo: 'date', obrigatorio: true })}
      ${campo({ prefixo: 'at', nome: 'vencimento', rotulo: 'Novo vencimento', tipo: 'date', obrigatorio: true, dica: atual ? `dd/mm/aaaa, depois de ${dataBR(atual.validade)}` : '' })}
      ${campoPdf('at')}
      <div class="largo form-acoes"><button type="submit" class="botao">${icone('ok', 20)}Registrar ato renovado</button><button type="button" class="botao botao-secundario" id="fechar-painel">Fechar</button></div>
    </form></section>`;
}
const campoPdf = (prefixo) => `<div class="campo largo"><label for="${prefixo}-pdf">PDF da resolução</label><input id="${prefixo}-pdf" name="pdf" type="file" class="entrada" accept="application/pdf,.pdf" aria-describedby="${prefixo}-pdf-dica ${prefixo}-pdf-erro"><span class="dica" id="${prefixo}-pdf-dica">Opcional, até 5 MB. No protótipo, o PDF fica guardado neste navegador.</span><p class="erro" id="${prefixo}-pdf-erro" role="alert"></p></div>`;

function blocoPainel() {
  if (!painel) return '';
  const e = escolas.find((x) => x.id === painel.id);
  if (!e || !daMinhaDre(e)) return '';
  return painel.tipo === 'turmas' ? blocoTurmas(e) : painel.tipo === 'editar' ? blocoEdicao(e) : blocoAtos(e);
}
function abrirPainel(novo, seletor) { painel = novo; aberto = false; desenhar(); const f = main.querySelector(seletor); f?.querySelector('input:not([type=hidden]), select')?.focus(); f?.scrollIntoView({ block: 'start' }); }

// ---------------- Cadastro ----------------
function blocoSeriesNovas(etapasMarcadas, seriesMarcadas, cursosEscolhidos) {
  const lista = ETAPAS.filter((t) => etapasMarcadas.includes(t.etapa));
  if (!lista.length) return '<p class="texto-suave esp-t-0">Marque um nível acima para escolher as séries e o curso.</p>';
  return `<fieldset class="campo" id="f-series" aria-describedby="f-series-erro"><legend>Séries que a escola tem <span class="obrigatorio" aria-hidden="true">*</span></legend>
    ${lista.map((t) => {
      const i = ETAPAS.indexOf(t);
      const opcoesCurso = cursosDoNivel(t.etapa);
      const escolhido = cursosEscolhidos[t.etapa] || (opcoesCurso.find((c) => c.modalidade === 'Regular') || opcoesCurso[0])?.nome || '';
      return `<div class="nivel-series"><p class="negrito esp-b-0">${esc(t.curto)}</p>
        <div class="marcas">${t.series.map((s) => `<label class="marca-item"><input type="checkbox" name="series" value="${esc(s)}" ${seriesMarcadas === null || seriesMarcadas.includes(s) ? 'checked' : ''}><span>${esc(s.replace(' EM', ' (Médio)'))}</span></label>`).join('')}</div>
        ${campo({ nome: `curso-${i}`, rotulo: `Curso de ${t.curto}`, valor: escolhido, obrigatorio: true, dica: 'Os cursos são cadastrados em Rede › Cursos.', opcoes: [['', 'Escolha o curso'], ...opcoesCurso.map((c) => [c.nome, `${c.nome} (${c.modalidade})`])] })}</div>`;
    }).join('')}
    <p class="erro" id="f-series-erro" role="alert"></p></fieldset>`;
}
function formulario() {
  const so = (rot, lista) => [['', rot], ...lista.map((x) => [x, x])];
  const minhaDre = dreDaSessao();
  return `<form id="form-escola" class="form-cadastro" novalidate ${aberto ? '' : 'hidden'} aria-labelledby="cad-titulo">
    <h2 id="cad-titulo">Cadastrar escola</h2>
    <p class="texto-suave esp-t-0">Campos com <span class="obrigatorio" aria-hidden="true">*</span> são obrigatórios. Comece pelo código INEP: se a escola estiver no Censo Escolar, os dados vêm preenchidos. A escola só oferece as séries marcadas nos níveis liberados pelo ato, e só enquanto ele estiver vigente.</p>
    <fieldset class="form-bloco"><legend>Censo Escolar</legend>
      <div class="campo campo-com-botao largo"><label for="f-inep">Código INEP <span class="obrigatorio" aria-hidden="true">*</span></label>
        <div class="linha-campo"><input id="f-inep" name="inep" class="entrada" inputmode="numeric" maxlength="8" autocomplete="off" aria-describedby="f-inep-dica f-inep-erro" required><button type="button" class="botao botao-secundario" id="buscar-inep">${icone('busca', 20)}Buscar no Censo Escolar</button></div>
        <span class="dica" id="f-inep-dica">8 números. A busca usa uma base simulada do Censo Escolar.</span><p class="erro" id="f-inep-erro" role="alert"></p><p class="texto-pequeno" id="censo-status" role="status"></p></div>
    </fieldset>
    <fieldset class="form-bloco"><legend>Dados da escola</legend>
      <div class="largo">${campo({ nome: 'nome', rotulo: 'Nome da escola', obrigatorio: true, atributos: 'maxlength="120" autocomplete="off"' })}</div>
      ${seletorDre('f', minhaDre || '')}
      ${campo({ nome: 'municipio', rotulo: 'Município', obrigatorio: true, opcoes: opcoesDeMunicipio(minhaDre, '') })}
      ${campo({ nome: 'telefone', rotulo: 'Telefone', dica: 'Com DDD. Opcional', tipo: 'tel', atributos: 'inputmode="tel" autocomplete="off"' })}
      ${campo({ nome: 'email', rotulo: 'E-mail da escola', dica: 'Opcional', tipo: 'email', atributos: 'autocomplete="off"' })}
    </fieldset>
    <fieldset class="form-bloco"><legend>Endereço</legend>
      <div class="largo">${campo({ nome: 'logradouro', rotulo: 'Rua ou avenida', obrigatorio: true, atributos: 'maxlength="120" autocomplete="off"' })}</div>
      ${campo({ nome: 'numero', rotulo: 'Número', dica: 'Deixe em branco se for sem número', atributos: 'maxlength="10" autocomplete="off"' })}
      ${campo({ nome: 'bairro', rotulo: 'Bairro ou povoado', obrigatorio: true, atributos: 'maxlength="60" autocomplete="off"' })}
      ${campo({ nome: 'cep', rotulo: 'CEP', dica: '8 números', obrigatorio: true, atributos: 'inputmode="numeric" maxlength="9" autocomplete="off"' })}
      <div class="largo">${campo({ nome: 'referencia', rotulo: 'Ponto de referência', dica: 'Opcional. Exemplo: em frente ao posto de saúde', atributos: 'maxlength="120" autocomplete="off"' })}</div>
    </fieldset>
    <fieldset class="form-bloco"><legend>Ato autorizativo (Conselho Estadual de Educação)</legend>
      ${campo({ nome: 'atoTipo', rotulo: 'Tipo do ato', obrigatorio: true, opcoes: so('Escolha o tipo', TIPOS_DE_ATO) })}
      ${campo({ nome: 'atoNumero', rotulo: 'Número do ato', dica: 'Exemplo: Resolução CEE nº 100/2026', obrigatorio: true, atributos: 'maxlength="60" autocomplete="off"' })}
      ${campo({ nome: 'atoPublicacao', rotulo: 'Data de publicação', tipo: 'date', obrigatorio: true })}
      ${campo({ nome: 'atoVencimento', rotulo: 'Data de vencimento', tipo: 'date', obrigatorio: true })}
      ${campoPdf('f')}
      <div class="largo" id="campo-origem" hidden>${campo({ nome: 'origemId', rotulo: 'Escola que foi dividida', dica: 'A escola de origem continua cadastrada', opcoes: [['', 'Escolha a escola de origem'], ...minhas().map((e) => [e.id, `${e.nome} (${e.municipio})`])] })}</div>
      <div class="largo">${marcas({ nome: 'etapas', rotulo: 'Nível de ensino que o ato libera', obrigatorio: true, dica: 'Depois de marcar o nível, escolha abaixo as séries que a escola tem e o curso.', itens: ETAPAS.map((t) => [t.etapa, t.curto, `${t.resumo}`]) })}</div>
      <div class="largo" id="series-niveis">${blocoSeriesNovas([], null, {})}</div>
      <p class="previa-series largo" id="previa" aria-live="polite">Nenhuma série liberada ainda.</p>
    </fieldset>
    <div class="form-acoes"><button type="submit" class="botao">${icone('ok', 20)}Cadastrar escola</button><button type="button" class="botao botao-secundario" id="cancelar-cadastro">Cancelar</button></div>
  </form>`;
}

function ferramentas() {
  return `<div class="campo campo-busca"><label for="busca">Buscar</label><input id="busca" class="entrada" type="search" placeholder="Nome, município, DRE ou INEP" value="${esc(busca)}">${icone('busca', 20)}</div>
    ${filtrosDreMunicipio({ dres, dre: dreFiltro, municipio, extras: extrasDeMunicipio() })}
    <button type="button" class="botao" id="nova-escola">${icone('formulario', 20)}Cadastrar escola</button>`;
}

function desenhar() {
  const lista = filtradas();
  const vistas = minhas();
  const vencidas = vistas.filter((e) => atos.some((a) => a.escolaId === e.id && !situacaoAto(a, hojeData()).vigente)).length;
  main.innerHTML = `
    <div class="cabecalho-pagina"><h1>Escolas da rede</h1></div>
    <p class="pagina-descricao">Cadastro das escolas com endereço, DRE, os atos autorizativos de cada nível, as séries que a escola tem e o curso. As escolas com a etiqueta <strong>Vagas de exemplo</strong> são escolas reais da rede estadual (nome, município, DRE e INEP da SEDUC); as turmas, os atos e as vagas delas são de demonstração.</p>
    ${avisoDeAcesso()}
    <dl class="resumo-linha">
      <div><dd>${vistas.length}</dd><dt>${plural(vistas.length, 'escola cadastrada', 'escolas cadastradas')}</dt></div>
      <div class="${vencidas ? 'alerta' : ''}"><dd>${vencidas}</dd><dt>${plural(vencidas, 'escola com ato vencido', 'escolas com ato vencido')}</dt></div>
      <div><dd>${new Set(vistas.map((e) => e.municipio)).size}</dd><dt>municípios com escola</dt></div>
    </dl>
    <div class="ferramentas-tabela" id="ferramentas">${ferramentas()}</div>
    ${formulario()}
    <div id="area-painel">${blocoPainel()}</div>
    <div id="tabela-escolas">${tabela(lista)}</div>`;
}
const redesenharTabela = () => { main.querySelector('#tabela-escolas').innerHTML = tabela(filtradas()); };

// ---------------- Interação ----------------
function estadoDoCadastro() {
  const form = main.querySelector('#form-escola');
  const etapas = [...form.querySelectorAll('[name="etapas"]:checked')].map((i) => i.value);
  const temSeries = form.querySelector('#f-series');
  const series = temSeries ? [...form.querySelectorAll('[name="series"]:checked')].map((i) => i.value) : null;
  const cursosEscolhidos = Object.fromEntries(ETAPAS.map((t, i) => [t.etapa, form.querySelector(`#f-curso-${i}`)?.value]).filter(([, v]) => v));
  return { etapas, series, cursosEscolhidos };
}
function atualizarPrevia() {
  const { etapas, series } = estadoDoCadastro();
  const lista = etapas.flatMap((t) => seriesEscolhidas(t, series ?? undefined));
  main.querySelector('#previa').textContent = lista.length ? `Séries que a escola terá: ${lista.map((s) => s.replace(' EM', ' (EM)')).join(', ')}.` : 'Nenhuma série liberada ainda.';
}
function trocarMunicipios(form, prefixo, dre, valor = '') {
  const sel = form.querySelector(`#${prefixo}-municipio`);
  sel.innerHTML = opcoesDeMunicipio(dre, valor).map(([v, t]) => `<option value="${esc(v)}" ${v === valor ? 'selected' : ''}>${esc(t)}</option>`).join('');
}

main.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'filtro-dre') { dreFiltro = t.value; if (municipio && !municipiosDa(dres, dreFiltro, extrasDeMunicipio()).includes(municipio)) municipio = ''; main.querySelector('#ferramentas').innerHTML = ferramentas(); redesenharTabela(); main.querySelector('#filtro-dre').focus(); }
  if (t.id === 'filtro-municipio') { municipio = t.value; redesenharTabela(); }
  if (t.id === 'f-atoTipo') main.querySelector('#campo-origem').hidden = t.value !== 'Divisão de escola';
  if (t.name === 'etapas' && t.closest('#form-escola')) {
    const { etapas, series, cursosEscolhidos } = estadoDoCadastro();
    // Nível recém-marcado vem com todas as séries marcadas; as escolhas dos outros níveis continuam.
    const novas = series === null ? null : [...series, ...(t.checked ? ETAPAS.find((x) => x.etapa === t.value).series : [])];
    main.querySelector('#series-niveis').innerHTML = blocoSeriesNovas(etapas, novas, cursosEscolhidos);
    atualizarPrevia();
  }
  if (t.name === 'series' && t.closest('#form-escola')) atualizarPrevia();
  if (t.id === 'f-dre') trocarMunicipios(t.form, 'f', t.value);
  if (t.id === 'ed-dre') trocarMunicipios(t.form, 'ed', t.value, t.form.querySelector('#ed-municipio').value);
  if (t.id === 'at-etapa' && painel?.tipo === 'atos') { painel = { ...painel, etapa: t.value }; main.querySelector('#area-painel').innerHTML = blocoPainel(); main.querySelector('#at-numero').focus(); }
});
const filtrarBusca = debounce(redesenharTabela);
main.addEventListener('input', (e) => {
  if (e.target.id === 'busca') { busca = e.target.value; filtrarBusca(); }
  if (e.target.id === 'f-cep') { const n = somenteDigitos(e.target.value).slice(0, 8); e.target.value = n.length > 5 ? `${n.slice(0, 5)}-${n.slice(5)}` : n; }
});
main.addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.id === 'nova-escola') { aberto = true; painel = null; desenhar(); const f = main.querySelector('#form-escola'); f.querySelector('#f-inep').focus(); f.scrollIntoView({ block: 'start' }); }
  if (b.id === 'cancelar-cadastro') { aberto = false; desenhar(); main.querySelector('#nova-escola').focus(); }
  if (b.id === 'buscar-inep') await buscarNoCenso(b.form);
  if (b.dataset.turmas) abrirPainel({ tipo: 'turmas', id: b.dataset.turmas }, '#painel-turmas');
  if (b.dataset.editar) abrirPainel({ tipo: 'editar', id: b.dataset.editar }, '#form-editar');
  if (b.dataset.atos) abrirPainel({ tipo: 'atos', id: b.dataset.atos }, '#painel-atos');
  if (b.id === 'fechar-painel') { painel = null; desenhar(); }
  if (b.dataset.pdf) { if (!(await abrirPdf(b.dataset.pdf))) avisar('Esse PDF não está neste navegador. No protótipo, o PDF fica só no computador em que foi anexado.', 'erro'); }
  if (b.dataset.fecharTurma) await fecharTurma(b.dataset.fecharTurma);
});

// Busca no Censo Escolar (base simulada em data/censo-escolar.json): preenche o que a base tiver.
async function buscarNoCenso(form) {
  const status = form.querySelector('#censo-status');
  const inep = somenteDigitos(form.querySelector('#f-inep').value);
  if (inep.length !== 8) { status.textContent = 'Digite os 8 números do código INEP para buscar.'; status.className = 'texto-pequeno erro'; form.querySelector('#f-inep').focus(); return; }
  let censo;
  try { censo = await carregar('censo-escolar'); } catch { status.textContent = 'Não foi possível consultar o Censo Escolar agora. Preencha os dados à mão.'; status.className = 'texto-pequeno erro'; return; }
  const jaTem = escolas.find((x) => x.inep && somenteDigitos(x.inep) === inep);
  if (jaTem) { status.textContent = `Essa escola já está cadastrada na rede: ${jaTem.nome} (${jaTem.municipio}).`; status.className = 'texto-pequeno erro'; return; }
  const achada = censo.escolas.find((x) => x.inep === inep);
  if (!achada) { status.textContent = 'Esse código não está no Censo Escolar (base simulada). Confira o número ou preencha os dados à mão.'; status.className = 'texto-pequeno'; return; }
  const dre = dreDoMunicipio(dres, achada.municipio);
  if (dreDaSessao() && dre !== dreDaSessao()) { status.textContent = `Essa escola fica em ${achada.municipio}, da ${dre || 'outra DRE'}. O cadastro é feito pelo técnico dessa DRE ou pela SEED.`; status.className = 'texto-pequeno erro'; return; }
  const preencher = (id, v) => { const el = form.querySelector(`#f-${id}`); if (el && v !== undefined && v !== null && el.type !== 'hidden') el.value = v; };
  preencher('nome', achada.nome);
  if (!dreDaSessao()) preencher('dre', dre);
  trocarMunicipios(form, 'f', dreDaSessao() || dre, achada.municipio);
  preencher('logradouro', achada.logradouro || ''); preencher('numero', achada.numero || ''); preencher('bairro', achada.bairro || '');
  preencher('cep', achada.cep ? achada.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2') : ''); preencher('telefone', achada.telefone || ''); preencher('email', achada.email || '');
  status.textContent = `Dados encontrados no Censo Escolar (base simulada): ${achada.nome}. Confira, complete o que faltar e preencha o ato.`;
  status.className = 'texto-pequeno sucesso-texto';
  form.querySelector('#f-nome').focus();
}

async function fecharTurma(id) {
  const t = turmasAbertas.find((x) => x.id === id);
  if (!t || !(await confirmar({ titulo: 'Fechar esta turma?', texto: `${t.nome} (${t.turno}) deixa de oferecer vagas. Os pedidos de matrícula já feitos continuam com a escola.`, botao: 'Fechar turma', perigo: true }))) return;
  try {
    const lista = (await conjunto('turmas-rede-novas')).filter((x) => x.id !== id);
    await salvar('turmas-rede-novas', lista);
    await registrarAcao(sessao().nome, `Fechou a turma ${t.nome} (${t.turno})`, escolas.find((x) => x.id === t.escolaId)?.nome || t.escolaId);
    await mostrar(); avisar('Turma fechada.');
  } catch { avisar('Não foi possível fechar a turma. Confira a conexão e tente de novo.'); }
}

function coordenadasDe(nomeMunicipio) {
  const m = localidades.municipios.find((x) => x.municipio === nomeMunicipio);
  if (m) return { lat: m.lat, lng: m.lng };
  const irma = escolas.find((x) => x.municipio === nomeMunicipio && x.lat);
  return irma ? { lat: irma.lat, lng: irma.lng } : { lat: localidades.municipios[0].lat, lng: localidades.municipios[0].lng };
}
// Erro do PDF: confere o arquivo escolhido (só PDF, até 5 MB).
const erroDoPdf = (form, prefixo) => { const arq = form.querySelector(`#${prefixo}-pdf`)?.files?.[0]; return { arquivo: arq || null, erro: conferirPdf(arq) }; };

main.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  if (form.id === 'form-escola') {
    const dados = lerFormulario(form);
    const { series, cursosEscolhidos } = estadoDoCadastro();
    const f = { ...dados, dre: dreDaSessao() || dados.dre, etapas: dados.etapas || [], series: series ?? undefined, cursos: cursosEscolhidos };
    const { erros } = validarEscola(f, { escolas, hoje, dres, cursos });
    if (erros.cursos) { const i = ETAPAS.findIndex((t) => (f.etapas || []).includes(t.etapa) && !cursosEscolhidos[t.etapa]); erros[`curso-${i >= 0 ? i : 0}`] = erros.cursos; delete erros.cursos; }
    const pdf = erroDoPdf(form, 'f');
    if (pdf.erro) erros.pdf = pdf.erro;
    if (!mostrarErros(form, erros)) { avisar('Confira os campos marcados em vermelho.', 'erro'); return; }
    try {
      await comEspera(e.submitter, async () => {
        const anexo = pdf.arquivo ? await guardarPdf(pdf.arquivo) : null;
        const novo = montarEscola({ ...f, pdf: anexo }, { escolas, coordenadas: coordenadasDe(f.municipio), hoje });
        const [escolasNovas, atosNovos] = await Promise.all([conjunto('escolas-novas'), conjunto('atos-novos')]);
        escolasNovas.push(novo.escola); atosNovos.push(...novo.atos);
        await salvar('escolas-novas', escolasNovas); await salvar('atos-novos', atosNovos);
        await registrarAcao(sessao().nome, `Cadastrou a escola e o ${novo.atos[0].numero}`, novo.escola.nome);
        painel = { tipo: 'turmas', id: novo.escola.id };
      });
      aberto = false;
      await mostrar();
      avisar('Escola cadastrada. As vagas aparecem quando a escola tiver turmas aprovadas: abra as turmas abaixo.');
      main.querySelector('#painel-turmas')?.scrollIntoView({ block: 'start' });
    } catch { avisar('Não foi possível cadastrar a escola. Confira a conexão e tente de novo.'); mostrar(); }
    return;
  }
  if (form.id === 'form-editar') {
    const dados = lerFormulario(form);
    const atual = escolas.find((x) => x.id === form.dataset.escola);
    const meusAtos = atosDa(atual);
    const f = { ...dados, dre: dreDaSessao() || dados.dre };
    const erros = { ...validarEdicaoDeEscola(f, { escolas, id: form.dataset.escola, dres }).erros, ...validarSeriesDaEscola(dados.series || [], meusAtos).erros };
    if (!mostrarErros(form, erros, 'ed-')) { avisar('Confira os campos marcados em vermelho.', 'erro'); return; }
    try {
      await comEspera(e.submitter, async () => {
        const nova = aplicarEdicaoDeEscola(atual, f, hoje);
        const novas = (await conjunto('escolas-novas')).filter((x) => x.id !== nova.id);
        await salvar('escolas-novas', [...novas, nova]);
        const comSeries = aplicarSeriesAosAtos(meusAtos, dados.series || []);
        const mudou = comSeries.some((a, i) => JSON.stringify(a.series) !== JSON.stringify(seriesEscolhidas(meusAtos[i].etapa, meusAtos[i].series)));
        if (mudou) {
          const chave = (a) => `${a.escolaId}|${a.etapa}`;
          const outros = (await conjunto('atos-novos')).filter((a) => !comSeries.some((x) => chave(x) === chave(a)));
          await salvar('atos-novos', [...outros, ...comSeries]);
        }
        await registrarAcao(sessao().nome, mudou ? 'Editou os dados e as séries da escola' : 'Editou os dados da escola', nova.nome);
      });
      painel = null; await mostrar(); avisar('Dados da escola salvos.');
    } catch { avisar('Não foi possível salvar os dados. Confira a conexão e tente de novo.'); }
    return;
  }
  if (form.id === 'form-ato') {
    const dados = lerFormulario(form);
    const atual = atos.find((a) => a.escolaId === form.dataset.escola && a.etapa === dados.etapa);
    const erros = validarRenovacaoDeAto({ numero: dados.numero, publicacao: dados.publicacao, vencimento: dados.vencimento }, { atoAtual: atual, hoje }).erros;
    const pdf = erroDoPdf(form, 'at');
    if (pdf.erro) erros.pdf = pdf.erro;
    if (!mostrarErros(form, erros, 'at-')) { avisar('Confira os campos marcados em vermelho.', 'erro'); return; }
    try {
      await comEspera(e.submitter, async () => {
        const anexo = pdf.arquivo ? await guardarPdf(pdf.arquivo) : null;
        const novo = aplicarRenovacaoDeAto(atual, { numero: dados.numero, publicacao: dados.publicacao, vencimento: dados.vencimento, pdf: anexo });
        const novos = (await conjunto('atos-novos')).filter((a) => !(a.escolaId === novo.escolaId && a.etapa === novo.etapa));
        await salvar('atos-novos', [...novos, novo]);
        const pedidos = await conjunto('renovacoes');
        await salvar('renovacoes', pedidos.filter((r) => r.ato !== `${novo.escolaId}|${novo.etapa}`));
        await registrarAcao(sessao().nome, `Registrou o ato renovado (${novo.numero}) de ${novo.etapa}`, escolas.find((x) => x.id === novo.escolaId).nome);
      });
      await mostrar(); avisar('Ato renovado registrado. O ato anterior foi para o histórico do nível.');
      main.querySelector('#painel-atos')?.scrollIntoView({ block: 'start' });
    } catch { avisar('Não foi possível registrar o ato. Confira a conexão e tente de novo.'); }
    return;
  }
  if (form.id === 'form-turma') {
    const dados = lerFormulario(form);
    const escolaId = form.dataset.escola;
    const series = atosDa(escolas.find((x) => x.id === escolaId)).flatMap((a) => seriesEscolhidas(a.etapa, a.series));
    const turmasDaEscola = Object.values(detalhe[escolaId] || {}).flatMap((c) => c.turmas.map((t) => ({ ...t, escolaId })));
    const { erros } = validarTurmaNova(dados, { series, turmas: turmasDaEscola, escolaId });
    if (!mostrarErros(form, erros, 'tu-')) { avisar('Confira os campos marcados em vermelho.', 'erro'); return; }
    try {
      await comEspera(e.submitter, async () => {
        const nova = montarTurmaNova(dados, { escolaId, hoje, por: sessao().nome });
        await salvar('turmas-rede-novas', [...(await conjunto('turmas-rede-novas')), nova]);
        await registrarAcao(sessao().nome, `Abriu a turma ${nova.nome} (${nova.turno}, ${nova.capacidade} lugares)`, escolas.find((x) => x.id === escolaId).nome);
      });
      await mostrar(); avisar('Turma aberta. As vagas da série já contam com ela.');
      main.querySelector('#painel-turmas')?.scrollIntoView({ block: 'start' });
    } catch { avisar('Não foi possível abrir a turma. Confira a conexão e tente de novo.'); }
  }
});
mostrar();
