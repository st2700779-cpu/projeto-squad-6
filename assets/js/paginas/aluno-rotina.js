// Provas e rotina: agenda única por urgência, calculadora "Quanto preciso tirar" e o modo Dia de Prova (?foco=<id>).
import { iniciar, falhaDados } from '../app.js';
import { esc, numeroBR, plural, etiqueta, vazio, icone } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { estudantes, carregar } from '../dados.js';
import { painelDoEstudante, marcarFeito } from '../painel-dados.js';
import { notaNecessaria, diaDaSemana, NOME_DO_DIA, TIPOS_DA_AGENDA, MEDIA_APROVACAO } from '../regras.js';
import { semaforo, dataPorExtenso, diaMes } from '../componentes/indicadores.js';

const main = await iniciar({ perfil: 'aluno', pagina: 'aluno/rotina.html', assistente: true, titulo: 'Provas e rotina' });
const GRUPOS = ['Atrasado', 'Hoje', 'Amanhã', 'Esta semana', 'Mais adiante'];
let est, p, avisos, calendario, focoId = new URLSearchParams(location.search).get('foco');

const quando = (i) => `${diaMes(i.data)}<small>${NOME_DO_DIA[diaDaSemana(i.data)].slice(0, 3).toLowerCase()}${i.hora ? ` · ${i.hora}` : ''}</small>`;
function linhaDaAgenda(i) {
  const acao = i.tipo === 'prova'
    ? `<a class="botao botao-secundario botao-mini" href="?foco=${i.id}">Modo Dia de Prova</a>`
    : `<button type="button" class="botao botao-secundario botao-mini" data-feito="${i.id}">Marcar como feito</button>`;
  return `<li><div class="quando">${quando(i)}</div>
    <div class="titulo">${esc(i.titulo)}<small>${esc(i.componente)}${i.sala ? ` · ${esc(i.sala)}` : ''}</small></div>
    <div class="acoes-item">${etiqueta(TIPOS_DA_AGENDA[i.tipo], 'info')}${semaforo(i.semaforo)}${acao}</div></li>`;
}
function blocoAgenda() {
  const { aFazer, feitos } = p.agenda;
  if (!aFazer.length && !feitos.length) return vazio('Nada na agenda', 'Quando houver prova, trabalho ou entrega marcados para a sua turma, eles aparecem aqui, do mais urgente para o menos urgente.');
  const grupos = GRUPOS.map((g) => [g, aFazer.filter((i) => i.grupo === g)]).filter(([, l]) => l.length);
  return `${grupos.map(([g, l]) => `<h3 class="agenda-grupo">${g}</h3><ul class="agenda">${l.map(linhaDaAgenda).join('')}</ul>`).join('') || vazio('Tudo em dia', 'Você marcou tudo como feito.')}
    ${feitos.length ? `<details class="esp-t-4"><summary>Feitos (${feitos.length})</summary><ul class="agenda">${feitos.map((i) => `<li><div class="quando">${quando(i)}</div><div class="titulo">${esc(i.titulo)}<small>${esc(i.componente)}</small></div><div class="acoes-item">${etiqueta('Feito', 'ok')}<button type="button" class="botao botao-texto botao-mini" data-desfazer="${i.id}">Desfazer</button></div></li>`).join('')}</ul></details>` : ''}`;
}

// ---- Quanto preciso tirar ----
const lerNota = (texto) => { const t = texto.trim().replace(',', '.'); if (t === '') return { valor: null }; const v = Number(t); return Number.isNaN(v) || v < 0 || v > 10 ? { erro: 'Use um valor de 0 a 10.' } : { valor: Math.round(v * 10) / 10 }; };
function notasDa(materia) { const l = p.d.linhas.find((x) => x.materia === materia); return [l?.n1 ?? null, l?.n2 ?? null, null, null]; }
function formCalculadora() {
  const materia = p.d.linhas[0]?.materia;
  const notas = notasDa(materia);
  return `<form id="calc" novalidate>
    <div class="campo"><label for="calc-materia">Matéria</label><select id="calc-materia" class="entrada">${p.d.linhas.map((l) => `<option>${esc(l.materia)}</option>`).join('')}</select></div>
    <div class="calculadora">
      ${[1, 2, 3, 4].map((b, k) => `<div class="campo"><label for="calc-n${b}">${b}º bimestre</label><input id="calc-n${b}" class="entrada" inputmode="decimal" autocomplete="off" aria-describedby="calc-ajuda" value="${notas[k] === null ? '' : numeroBR(notas[k])}"><p class="erro" id="calc-erro${b}" role="alert"></p></div>`).join('')}
      <div class="campo"><label for="calc-meta">Média que quero</label><input id="calc-meta" class="entrada" inputmode="decimal" autocomplete="off" value="${numeroBR(MEDIA_APROVACAO)}"><p class="erro" id="calc-erro-meta" role="alert"></p></div>
    </div>
    <p class="dica texto-suave texto-pequeno" id="calc-ajuda">Deixe em branco a nota que ainda não saiu. A média do ano é a média dos 4 bimestres.</p>
    <div id="resultado-calc" class="resultado-calc" role="status" aria-live="polite"></div></form>`;
}
function calcular() {
  const campos = [1, 2, 3, 4].map((b) => ({ el: main.querySelector(`#calc-n${b}`), erro: main.querySelector(`#calc-erro${b}`) }));
  const meta = { el: main.querySelector('#calc-meta'), erro: main.querySelector('#calc-erro-meta') };
  let invalido = false;
  const lidas = [...campos, meta].map(({ el, erro }) => { const r = lerNota(el.value); erro.textContent = r.erro || ''; if (r.erro) { el.setAttribute('aria-invalid', 'true'); invalido = true; } else el.removeAttribute('aria-invalid'); return r.valor ?? null; });
  const saida = main.querySelector('#resultado-calc');
  if (invalido) { saida.innerHTML = ''; return; }
  const alvo = lidas[4] ?? MEDIA_APROVACAO;
  const r = notaNecessaria(lidas.slice(0, 4), alvo);
  const nivelDe = (v) => (v <= 7 ? { chave: 'verde', icone: 'ok', texto: 'Alcançável' } : v <= 9 ? { chave: 'amarelo', icone: 'alerta', texto: 'Exige esforço' } : { chave: 'vermelho', icone: 'fechar', texto: 'Difícil' });
  const meta1 = numeroBR(alvo);
  let html;
  if (r.estado === 'completo') html = `<p class="esp-t-0">${semaforo(r.media >= alvo ? { chave: 'verde', icone: 'ok', texto: 'Meta alcançada' } : { chave: 'vermelho', icone: 'fechar', texto: 'Abaixo da meta' }, { grande: true })}</p><p>Com as quatro notas, a média do ano é <strong>${numeroBR(r.media)}</strong>. A meta era ${meta1}.</p>`;
  else if (r.estado === 'ja-alcancada') html = `<p class="esp-t-0">${semaforo({ chave: 'verde', icone: 'ok', texto: 'Meta alcançada' }, { grande: true })}</p><p>Você já alcançou a média ${meta1}, mesmo que as próximas notas sejam baixas.</p>`;
  else if (r.estado === 'possivel') html = `<p class="esp-t-0">${semaforo(nivelDe(r.precisa), { grande: true })}</p><p>Para fechar o ano com média ${meta1}, você precisa de pelo menos <strong>${numeroBR(r.precisa)}</strong> ${r.restantes === 1 ? 'no bimestre que falta' : `em cada um dos ${r.restantes} bimestres que faltam`}.</p>`;
  else html = `<p class="esp-t-0">${semaforo({ chave: 'vermelho', icone: 'fechar', texto: 'Difícil' }, { grande: true })}</p><p>Mesmo com 10 ${r.restantes === 1 ? 'no bimestre que falta' : 'em todos os bimestres que faltam'}, a média não chega a ${meta1}. ${r.precisaRecuperacao !== null ? `Para ficar em recuperação (média 4,0), você precisa de pelo menos <strong>${numeroBR(r.precisaRecuperacao)}</strong> ${r.restantes === 1 ? 'no bimestre que falta' : 'em cada um'}.` : 'Converse com o professor sobre as opções.'}</p>`;
  saida.innerHTML = html;
}

// ---- Modo Dia de Prova ----
function telaFoco(item) {
  document.body.classList.add('modo-foco');
  const ate = (c) => c.fim || c.inicio;
  const doDia = calendario.filter((c) => c.inicio <= item.data && ate(c) >= item.data && (!c.para || c.para === 'alunos'));
  const lembretes = [...doDia.map((c) => `${c.titulo}`), ...avisos.filter((a) => /prova/i.test(a.titulo + a.texto) && (!a.para || a.para === 'todos')).map((a) => a.texto)];
  const quandoTexto = item.dias === 0 ? 'Hoje' : item.dias === 1 ? 'Amanhã' : `Em ${item.dias} dias`;
  const falado = `${item.titulo}. ${quandoTexto}${item.hora ? `, às ${item.hora}` : ''}. ${item.sala ? `Sala: ${item.sala}.` : ''} Conteúdo: ${item.conteudo.join('. ')}.`;
  main.innerHTML = `
    <button type="button" class="botao botao-secundario botao-foco-sair" id="sair-foco">${icone('fechar', 20)}Sair do modo foco</button>
    <article class="foco-prova" aria-labelledby="foco-titulo">
      <p class="grande esp-b-1"><strong>${quandoTexto}</strong> · ${esc(dataPorExtenso(item.data))}${item.hora ? ` · ${item.hora}` : ''}</p>
      <h1 id="foco-titulo" tabindex="-1">${esc(item.titulo)}</h1>
      ${item.sala ? `<section class="bloco-foco"><h2>Sala</h2><p class="grande esp-b-0"><strong>${esc(item.sala)}</strong></p></section>` : ''}
      <section class="bloco-foco"><h2>Conteúdo de ${esc(item.componente)}</h2><ul class="esp-b-0">${item.conteudo.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></section>
      ${lembretes.length ? `<section class="bloco-foco"><h2>Avisos do dia</h2><ul class="esp-b-0">${lembretes.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></section>` : ''}
      <div class="linha-botoes">${botaoOuvir(falado, 'Ouvir tudo')}</div>
    </article>`;
  main.querySelector('#foco-titulo').focus();
}
function sairDoFoco() { document.body.classList.remove('modo-foco'); focoId = null; history.replaceState(null, '', location.pathname); mostrar(); }

async function mostrar() {
  try {
    ({ atual: est } = await estudantes());
    [p, avisos, calendario] = await Promise.all([painelDoEstudante(est), carregar('avisos'), carregar('calendario')]);
    const foco = focoId && [...p.agenda.aFazer, ...p.agenda.feitos].find((i) => i.id === focoId);
    if (foco) { telaFoco(foco); return; }
    document.body.classList.remove('modo-foco');
    const proxima = p.agenda.aFazer.find((i) => i.tipo === 'prova' && i.dias >= 0);
    main.innerHTML = `
      <h1>Provas e rotina</h1>
      <p class="pagina-descricao">Provas, trabalhos e entregas de todas as matérias, do mais urgente para o menos. Hoje é ${esc(dataPorExtenso(p.hoje))}.</p>
      ${proxima ? `<div class="linha-botoes esp-b-4"><a class="botao" href="?foco=${proxima.id}">${icone('alvo', 20)}Modo Dia de Prova: ${esc(proxima.titulo)}</a></div>` : ''}
      <h2 class="esp-t-0">Agenda</h2>
      <div id="agenda">${blocoAgenda()}</div>
      <h2>Quanto preciso tirar</h2>
      <p class="esp-t-0 texto-suave">Digite as notas que já saíram e a média que você quer. O cálculo mostra a nota que falta.</p>
      ${p.d.linhas.length ? formCalculadora() : vazio('Sem notas ainda', 'Quando houver notas lançadas, a calculadora usa elas.')}`;
    if (p.d.linhas.length) calcular();
  } catch { falhaDados(main, mostrar); }
}

main.addEventListener('click', (e) => {
  const b = e.target.closest('[data-feito],[data-desfazer]');
  if (b) {
    marcarFeito(est.id, b.dataset.feito || b.dataset.desfazer, 'feito' in b.dataset);
    painelDoEstudante(est).then((novo) => { p = novo; main.querySelector('#agenda').innerHTML = blocoAgenda(); main.querySelector('#agenda button, #agenda summary')?.focus(); });
    return;
  }
  if (e.target.closest('#sair-foco')) sairDoFoco();
});
main.addEventListener('input', (e) => { if (e.target.closest('#calc') && e.target.id !== 'calc-materia') calcular(); });
main.addEventListener('change', (e) => {
  if (e.target.id !== 'calc-materia') return;
  const notas = notasDa(e.target.value);
  [1, 2, 3, 4].forEach((b, k) => { main.querySelector(`#calc-n${b}`).value = notas[k] === null ? '' : numeroBR(notas[k]); });
  calcular();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('modo-foco') && !document.querySelector('dialog[open]')) sairDoFoco(); });
mostrar();
