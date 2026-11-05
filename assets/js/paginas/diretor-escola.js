// Estrutura da escola (só a direção): as séries que a escola oferece dentro dos níveis do ato autorizativo, os turnos em que
// funciona (inclusive integral) e as salas com o número de lugares. É a base da tela de turmas: a turma escolhe série, turno e
// sala daqui, e as vagas da matrícula nascem das turmas. As regras ficam em dominio/estrutura.js.
import { iniciar, falhaDados, link } from '../app.js';
import { sessao } from '../auth.js';
import { esc, etiqueta, icone, avisar, comEspera, confirmar, plural, dataBR } from '../ui.js';
import { carregar, conjunto, salvar, registrarAcao, turmasEscola } from '../dados.js';
import { situacaoAto } from '../regras.js';
import { ETAPAS, NOMENCLATURAS } from '../dominio/niveis.js';
import { seriesEscolhidas } from '../dominio/cadastros.js';
import { TURNOS } from '../dominio/vagas.js';
import { atosDaEscola, acrescentarSerie, tirarSerie, validarSala, montarSala, podeRemoverSala, validarEdicaoDeSala, turmasDaSala, turnosDaEscola, podeTirarTurno, validarTurnoNovo } from '../dominio/estrutura.js';
import { campo, lerFormulario, mostrarErros } from '../componentes/formulario.js';

const main = await iniciar({ perfil: 'diretor', pagina: 'diretor/escola.html', assistente: false });
const escolaId = sessao().escolaId;
let escola, atos, turmas, salas, todasAsSalas;
let salaAberta = null; // null | 'nova' | id da sala em edição

async function mostrar() {
  try {
    let escolas, todas;
    [escolas, atos, todas, todasAsSalas] = await Promise.all([carregar('escolas'), carregar('atos'), turmasEscola(), conjunto('salas')]);
    escola = escolas.find((e) => e.id === escolaId);
    turmas = todas.filter((t) => t.escolaId === escolaId);
    salas = todasAsSalas.filter((s) => s.escolaId === escolaId);
    desenhar();
  } catch { falhaDados(main, mostrar); }
}
const nivelDe = (etapa) => ETAPAS.find((n) => n.etapa === etapa) || { curto: etapa, nomenclatura: 'serie', series: [] };
const quem = () => sessao()?.nome || 'Direção';

function blocoSeries() {
  const meus = atosDaEscola(atos, escolaId);
  if (!meus.length) return `<p class="alerta-info">${icone('info', 20)}<span>A escola ainda não tem ato autorizativo. Os níveis de ensino são liberados pela SEED no cadastro da escola.</span></p>`;
  return meus.map((a) => {
    const n = nivelDe(a.etapa); const s = situacaoAto(a);
    const oferecidas = seriesEscolhidas(a.etapa, a.series);
    const itens = n.series.map((serie) => {
      const tem = oferecidas.includes(serie);
      const nT = turmas.filter((t) => t.serie === serie).length;
      return `<li><span><strong>${esc(serie)}</strong> ${tem ? etiqueta('Oferece', 'ok') : etiqueta('Não oferece', 'neutra')} <span class="texto-suave texto-pequeno">${nT} ${plural(nT, 'turma', 'turmas')}</span></span>
        ${tem ? `<button type="button" class="botao botao-texto botao-mini" data-tirar-serie="${esc(a.etapa)}" data-serie="${esc(serie)}" aria-label="Deixar de oferecer ${esc(serie)}">Deixar de oferecer</button>` : `<button type="button" class="botao botao-secundario botao-mini" data-por-serie="${esc(a.etapa)}" data-serie="${esc(serie)}" aria-label="Oferecer ${esc(serie)}">Oferecer</button>`}</li>`;
    }).join('');
    return `<div class="bloco-nivel"><div class="linha-entre"><h3 class="esp-b-0">${esc(n.curto)} <span class="texto-suave peso-normal texto-pequeno">${esc(NOMENCLATURAS[n.nomenclatura]?.rotulo || 'Séries')}</span></h3><div>${etiqueta(s.texto, s.tipo)}</div></div>
      <p class="texto-pequeno texto-suave esp-t-1">${esc(a.numero)} · vence em ${dataBR(a.validade)} · curso: ${esc(a.curso || a.etapa)}</p>
      <ul class="lista-simples lista-series">${itens}</ul></div>`;
  }).join('');
}
function blocoTurnos() {
  const meus = turnosDaEscola(escola, turmas);
  return `<ul class="lista-simples">${TURNOS.map((t) => {
    const tem = meus.includes(t);
    const nT = turmas.filter((x) => x.turno === t).length;
    const extra = t === 'Integral' ? '<br><span class="texto-suave texto-pequeno">A turma integral fica de manhã e de tarde (9 aulas por dia) e ocupa a sala nos dois turnos.</span>' : '';
    return `<li><span><strong>${esc(t)}</strong> ${tem ? etiqueta('A escola funciona', 'ok') : etiqueta('Não funciona', 'neutra')} <span class="texto-suave texto-pequeno">${nT} ${plural(nT, 'turma', 'turmas')}</span>${extra}</span>
      <button type="button" class="botao ${tem ? 'botao-texto' : 'botao-secundario'} botao-mini" data-turno="${esc(t)}" aria-label="${tem ? `Tirar o turno ${esc(t)}` : `Acrescentar o turno ${esc(t)}`}">${tem ? 'Tirar turno' : 'Acrescentar turno'}</button></li>`;
  }).join('')}</ul>`;
}
function formularioSala() {
  if (!salaAberta) return '';
  const s = salaAberta === 'nova' ? null : salas.find((x) => x.id === salaAberta);
  return `<form id="form-sala" class="form-cadastro" novalidate aria-labelledby="sa-titulo">
    <h3 id="sa-titulo" class="esp-t-0">${s ? `Editar ${esc(s.nome)}` : 'Cadastrar sala'}</h3>
    <fieldset class="form-bloco"><legend>Sala</legend>
      ${campo({ prefixo: 'sa', nome: 'nome', rotulo: 'Nome da sala', valor: s?.nome || '', obrigatorio: true, dica: 'Exemplo: Bloco A, sala 04', atributos: 'maxlength="60" autocomplete="off"' })}
      ${campo({ prefixo: 'sa', nome: 'capacidade', rotulo: 'Lugares (carteiras)', valor: s ? String(s.capacidade) : '', tipo: 'number', obrigatorio: true, dica: 'De 5 a 80. A turma não pode ter mais vagas que isso.', atributos: 'min="5" max="80" step="1" inputmode="numeric"' })}
    </fieldset>
    <div class="form-acoes"><button type="submit" class="botao">${icone('ok', 20)}${s ? 'Salvar sala' : 'Cadastrar sala'}</button><button type="button" class="botao botao-secundario" data-cancelar-sala>Cancelar</button></div></form>`;
}
function blocoSalas() {
  const lista = [...salas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }));
  return `${formularioSala()}
    ${lista.length ? `<div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes"><caption class="sr-only">Salas da escola</caption>
      <thead><tr><th scope="col">Sala</th><th scope="col" class="num">Lugares</th><th scope="col">Turmas na sala</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead>
      <tbody>${lista.map((s) => { const us = turmasDaSala(s, turmas); return `<tr><td class="titulo-linha"><strong>${esc(s.nome)}</strong></td><td class="num" data-rotulo="Lugares">${s.capacidade}</td>
        <td data-rotulo="Turmas"><div>${us.length ? us.map((t) => `${esc(t.nome)} · ${esc(t.turno)}`).join('<br>') : '<span class="texto-suave">livre nos turnos</span>'}</div></td>
        <td class="acoes"><div class="linha-botoes"><button type="button" class="botao botao-secundario botao-mini" data-editar-sala="${esc(s.id)}" aria-label="Editar ${esc(s.nome)}">Editar</button>${us.length ? '' : `<button type="button" class="botao botao-texto botao-mini" data-apagar-sala="${esc(s.id)}" aria-label="Apagar ${esc(s.nome)}">Apagar</button>`}</div></td></tr>`; }).join('')}</tbody></table></div>
      <p class="contagem">${lista.length} ${plural(lista.length, 'sala', 'salas')} · ${lista.reduce((t, s) => t + s.capacidade, 0)} lugares por turno</p>` : `<p class="alerta-info">${icone('info', 20)}<span>Nenhuma sala cadastrada. Cadastre as salas antes de criar turmas.</span></p>`}`;
}
function desenhar() {
  main.innerHTML = `
    <div class="cabecalho-pagina"><h1>Estrutura da escola</h1></div>
    <p class="pagina-descricao">Só a direção mexe aqui. Escolha as séries que a escola oferece, os turnos em que funciona e as salas. As turmas usam essas escolhas, e as vagas da matrícula nascem das turmas.</p>
    <dl class="resumo-linha">
      <div><dd>${atosDaEscola(atos, escolaId).flatMap((a) => seriesEscolhidas(a.etapa, a.series)).length}</dd><dt>séries oferecidas</dt></div>
      <div><dd>${turnosDaEscola(escola, turmas).length}</dd><dt>turnos</dt></div>
      <div><dd>${salas.length}</dd><dt>${plural(salas.length, 'sala', 'salas')}</dt></div>
      <div><dd>${turmas.length}</dd><dt>${plural(turmas.length, 'turma', 'turmas')} · <a href="${link('diretor/turmas.html')}">abrir turmas</a></dt></div>
    </dl>
    <h2>Séries que a escola oferece</h2>
    <p class="texto-suave esp-t-0">Os níveis vêm do ato autorizativo (a SEED registra). Dentro de cada nível, a direção escolhe as séries. Série com turma não pode sair.</p>
    ${blocoSeries()}
    <h2>Turnos</h2>
    <p class="texto-suave esp-t-0">Turno com turma não pode sair. Para criar turma integral, acrescente o turno Integral.</p>
    ${blocoTurnos()}
    <h2>Salas</h2>
    <div class="linha-botoes esp-b-3"><button type="button" class="botao" data-nova-sala>${icone('mais', 20)}Cadastrar sala</button></div>
    ${blocoSalas()}`;
}

async function salvarAto(atoNovo, acao) {
  const chave = (a) => `${a.escolaId}|${a.etapa}`;
  const outros = (await conjunto('atos-novos')).filter((a) => chave(a) !== chave(atoNovo));
  await salvar('atos-novos', [...outros, atoNovo]);
  await registrarAcao(quem(), acao, escola.nome);
}
const focar = (seletor) => main.querySelector(seletor)?.focus();

main.addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if ('novaSala' in b.dataset) { salaAberta = 'nova'; desenhar(); focar('#sa-nome'); main.querySelector('#form-sala').scrollIntoView({ block: 'start' }); return; }
  if (b.dataset.editarSala) { salaAberta = b.dataset.editarSala; desenhar(); focar('#sa-nome'); main.querySelector('#form-sala').scrollIntoView({ block: 'start' }); return; }
  if ('cancelarSala' in b.dataset) { salaAberta = null; desenhar(); focar('[data-nova-sala]'); return; }
  try {
    if (b.dataset.porSerie || b.dataset.tirarSerie) {
      const etapa = b.dataset.porSerie || b.dataset.tirarSerie; const serie = b.dataset.serie;
      const ato = atos.find((a) => a.escolaId === escolaId && a.etapa === etapa);
      if (b.dataset.porSerie) {
        const r = acrescentarSerie(ato, serie);
        if (!r.ok) { avisar(r.erros.serie, 'erro'); return; }
        await salvarAto(r.ato, `Passou a oferecer ${serie}`);
        avisar(`A escola passa a oferecer ${serie}. Crie as turmas em Direção › Turmas para abrir vagas.`);
      } else {
        const r = tirarSerie(ato, serie, turmas);
        if (!r.ok) { avisar(r.motivo, 'erro'); return; }
        if (!(await confirmar({ titulo: `Deixar de oferecer ${serie}?`, texto: `${serie} some da matrícula on-line desta escola e das vagas. Dá para voltar a oferecer depois.`, botao: 'Deixar de oferecer', perigo: true }))) return;
        await salvarAto(r.ato, `Deixou de oferecer ${serie}`);
        avisar(`A escola deixou de oferecer ${serie}.`);
      }
      await mostrar(); focar(`[data-serie="${CSS.escape(serie)}"]`);
      return;
    }
    if (b.dataset.turno) {
      const t = b.dataset.turno;
      const atuais = turnosDaEscola(escola, turmas);
      let novos;
      if (atuais.includes(t)) {
        const r = podeTirarTurno(t, { turnos: atuais, turmasDaEscola: turmas });
        if (!r.ok) { avisar(r.motivo, 'erro'); return; }
        novos = atuais.filter((x) => x !== t);
      } else {
        const r = validarTurnoNovo(t, atuais);
        if (!r.ok) { avisar(r.erros.turno, 'erro'); return; }
        novos = TURNOS.filter((x) => x === t || atuais.includes(x));
      }
      const outras = (await conjunto('escolas-novas')).filter((x) => x.id !== escola.id);
      await salvar('escolas-novas', [...outras, { ...escola, turnos: novos }]);
      await registrarAcao(quem(), atuais.includes(t) ? `Tirou o turno ${t}` : `Acrescentou o turno ${t}`, escola.nome);
      await mostrar(); focar(`[data-turno="${CSS.escape(t)}"]`);
      avisar(atuais.includes(t) ? `Turno ${t.toLowerCase()} retirado.` : `Turno ${t.toLowerCase()} acrescentado.`);
      return;
    }
    if (b.dataset.apagarSala) {
      const s = salas.find((x) => x.id === b.dataset.apagarSala);
      const r = podeRemoverSala(s, turmas);
      if (!r.ok) { avisar(r.motivo, 'erro'); return; }
      if (!(await confirmar({ titulo: `Apagar ${s.nome}?`, texto: 'A sala sai da lista. Nenhuma turma usa esta sala.', botao: 'Apagar', perigo: true }))) return;
      await salvar('salas', todasAsSalas.filter((x) => x.id !== s.id));
      await registrarAcao(quem(), `Apagou a sala ${s.nome}`, escola.nome);
      await mostrar(); avisar('Sala apagada.'); focar('[data-nova-sala]');
    }
  } catch { avisar('Não foi possível salvar. Confira a conexão e tente de novo.'); mostrar(); }
});

main.addEventListener('submit', async (e) => {
  if (e.target.id !== 'form-sala') return;
  e.preventDefault();
  const dados = lerFormulario(e.target);
  const atual = salaAberta === 'nova' ? null : salas.find((x) => x.id === salaAberta);
  const { erros } = atual ? validarEdicaoDeSala(dados, atual, { salas: todasAsSalas, turmas }) : validarSala(dados, { salas: todasAsSalas, escolaId });
  if (!mostrarErros(e.target, erros, 'sa-')) { avisar('Confira os campos marcados em vermelho.', 'erro'); return; }
  try {
    await comEspera(e.submitter, async () => {
      if (atual) {
        const editada = { ...atual, nome: dados.nome.trim(), capacidade: Number(dados.capacidade) };
        await salvar('salas', todasAsSalas.map((x) => (x.id === atual.id ? editada : x)));
        // O nome da sala aparece na turma e na grade de horário: muda junto.
        if (editada.nome !== atual.nome) {
          const todas = await turmasEscola();
          if (todas.some((t) => t.salaId === atual.id)) { todas.forEach((t) => { if (t.salaId === atual.id) t.sala = editada.nome; }); await salvar('turmas', todas); }
          const horarios = await conjunto('horarios');
          const ids = new Set(todas.filter((t) => t.salaId === atual.id).map((t) => t.id));
          if (horarios.some((h) => ids.has(h.turmaId))) { horarios.forEach((h) => { if (ids.has(h.turmaId)) h.sala = editada.nome; }); await salvar('horarios', horarios); }
        }
        await registrarAcao(quem(), `Editou a sala ${editada.nome}`, escola.nome);
      } else {
        const nova = montarSala(dados, { salas: todasAsSalas, escolaId });
        await salvar('salas', [...todasAsSalas, nova]);
        await registrarAcao(quem(), `Cadastrou a sala ${nova.nome} (${nova.capacidade} lugares)`, escola.nome);
      }
    });
    salaAberta = null; await mostrar(); avisar(atual ? 'Sala salva.' : 'Sala cadastrada. Ela já aparece na criação de turma.');
  } catch { avisar('Não foi possível salvar a sala. Confira a conexão e tente de novo.'); }
});
mostrar();
