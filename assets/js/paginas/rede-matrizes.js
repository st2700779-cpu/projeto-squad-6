// Matrizes curriculares e carga horária por nível e série (rede). A carga é editável pela equipe técnica da SEED:
// aulas por semana × minutos da aula × 40 semanas letivas = horas por ano, comparadas com o mínimo do nível.
import { iniciar, falhaDados } from '../app.js';
import { sessao } from '../auth.js';
import { esc, etiqueta, icone, avisar, confirmar, comEspera } from '../ui.js';
import { carregar, conjunto, salvar, registrarAcao } from '../dados.js';
import { ETAPAS, HORAS_MINIMAS, SEMANAS_LETIVAS, cargaAnualHoras, situacaoDaCarga, validarCarga, cargaPadrao } from '../dominio/cadastros.js';

const main = await iniciar({ perfil: 'rede', pagina: 'rede/matrizes.html', assistente: true });
let carga, m, componentesEtapa;

const selo = (etapa, linha) => {
  const s = situacaoDaCarga(etapa, linha);
  return `${s.horas} h ${s.ok ? etiqueta(`cumpre o mínimo de ${s.minimo} h`, 'ok') : etiqueta(`abaixo do mínimo de ${s.minimo} h (faltam ${s.falta} h)`, 'erro')}`;
};

function tabelaCarga() {
  return ETAPAS.filter((t) => t.ativo !== false && carga.some((l) => l.etapa === t.etapa)).map((t) => `<h3>${esc(t.etapa)} <span class="texto-suave peso-normal texto-pequeno">mínimo de ${HORAS_MINIMAS[t.etapa]} h por ano</span></h3>
    <div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes cargas"><caption class="sr-only">Carga horária por série: ${esc(t.etapa)}</caption>
      <thead><tr><th scope="col">Série</th><th scope="col" class="num">Aulas por semana</th><th scope="col" class="num">Minutos por aula</th><th scope="col">Carga anual (${SEMANAS_LETIVAS} semanas)</th></tr></thead>
      <tbody>${carga.filter((l) => l.etapa === t.etapa).map((l) => { const i = carga.indexOf(l); return `<tr data-i="${i}"><td class="titulo-linha"><strong>${esc(l.serie.replace(' EM', ' (Ensino Médio)'))}</strong></td>
        <td class="num" data-rotulo="Aulas por semana"><div><label class="sr-only" for="a${i}">Aulas por semana, ${esc(l.serie)}</label><input id="a${i}" class="entrada" type="number" min="15" max="40" step="1" inputmode="numeric" value="${l.aulasSemana}" data-campo="aulasSemana"><p class="erro" id="a${i}-erro" role="alert"></p></div></td>
        <td class="num" data-rotulo="Minutos por aula"><div><label class="sr-only" for="m${i}">Minutos por aula, ${esc(l.serie)}</label><input id="m${i}" class="entrada" type="number" min="40" max="60" step="1" inputmode="numeric" value="${l.minutosAula}" data-campo="minutosAula"><p class="erro" id="m${i}-erro" role="alert"></p></div></td>
        <td data-rotulo="Carga anual"><div class="resultado-carga" aria-live="polite">${selo(t.etapa, l)}</div></td></tr>`; }).join('')}</tbody></table></div>`).join('');
}

function tabelaMatriz(v, ref) {
  const somas = [1, 2, 3].map((c) => v.componentes.reduce((s, x) => s + x[c], 0));
  return `<div class="tabela-rolagem"><table class="tabela min-0"><caption class="sr-only">Matriz versão ${esc(v.versao)}</caption>
    <thead><tr><th scope="col">Componente</th><th scope="col" class="num">1ª série</th><th scope="col" class="num">2ª série</th><th scope="col" class="num">3ª série</th></tr></thead>
    <tbody>${v.componentes.map(([c, ...h]) => {
      const o = ref?.componentes.find((x) => x[0] === c);
      const marca = ref ? (!o ? etiqueta('Novo', 'info') : h.some((x, i) => x !== o[i + 1]) ? etiqueta('Carga alterada', 'atencao') : '') : '';
      return `<tr><td>${esc(c)} ${marca}</td>${h.map((x) => `<td class="num">${x}</td>`).join('')}</tr>`;
    }).join('')}</tbody>
    <tfoot><tr><th scope="row">Aulas da formação geral</th>${somas.map((s) => `<td class="num"><strong>${s}</strong></td>`).join('')}</tr></tfoot></table></div>`;
}

async function mostrar() {
  try {
    let salva;
    [salva, m, componentesEtapa] = await Promise.all([conjunto('carga-horaria'), carregar('matrizes'), carregar('componentes-etapa')]);
    // Uma linha por série dos níveis ativos (Rede › Cadastros). Série nova entra com o padrão do nível até alguém salvar outro valor.
    carga = cargaPadrao().map((p) => salva.find((l) => l.etapa === p.etapa && l.serie === p.serie) || p);
    const [nova, antiga] = m.versoes;
    const aulasMedio = carga.filter((l) => l.etapa === 'Ensino Médio').map((l) => l.aulasSemana);
    main.innerHTML = `
      <h1>Matrizes e carga horária</h1>
      <p class="pagina-descricao">A carga horária de cada série e as matrizes por componente. Cada estudante segue a versão da matriz do ano em que entrou.</p>
      <h2>Carga horária por série</h2>
      <p class="texto-suave esp-t-0">Aulas por semana × minutos por aula × ${SEMANAS_LETIVAS} semanas letivas (200 dias) = horas por ano. O mínimo de cada nível (800 h no Ensino Fundamental, 1.000 h no Ensino Médio) e os níveis da lista vêm de Rede › Cadastros.</p>
      <form id="form-carga" novalidate>${tabelaCarga()}
        <div class="form-acoes esp-t-4"><button type="submit" class="botao">${icone('ok', 20)}Salvar carga horária</button><button type="button" class="botao botao-secundario" id="padrao-carga">Restaurar valores padrão</button></div></form>
      <h2>Ensino Fundamental — Anos Finais: componentes</h2>
      <p class="esp-t-0">${(componentesEtapa['Ensino Fundamental — Anos Finais'] || []).map((c) => etiqueta(c, 'neutra')).join(' ')}</p>
      <h2>Ensino Médio — ${esc(m.curso.replace('Ensino Médio — ', ''))}</h2>
      <p class="texto-suave esp-t-0">Aulas por semana. Carga semanal do Ensino Médio: ${[...new Set(aulasMedio)].join(' e ')} aulas; o que passa das aulas da formação geral fica para itinerários e eletivas.</p>
      <h3>Versão ${esc(nova.versao)} ${etiqueta(nova.aplicacao, 'ok')}</h3>${tabelaMatriz(nova, antiga)}
      <h3>Versão ${esc(antiga.versao)} ${etiqueta(antiga.aplicacao, 'neutra')}</h3>${tabelaMatriz(antiga)}`;
  } catch { falhaDados(main, mostrar); }
}

// Recalcula a carga anual da linha enquanto a pessoa digita, sem redesenhar a tabela (o foco não se perde).
main.addEventListener('input', (e) => {
  const tr = e.target.closest('tr[data-i]');
  if (!tr || !e.target.dataset.campo) return;
  const l = carga[Number(tr.dataset.i)];
  const a = Number(tr.querySelector('[data-campo="aulasSemana"]').value), mi = Number(tr.querySelector('[data-campo="minutosAula"]').value);
  tr.querySelector('.resultado-carga').innerHTML = (Number.isFinite(a) && Number.isFinite(mi) && a > 0 && mi > 0) ? selo(l.etapa, { aulasSemana: a, minutosAula: mi }) : '—';
});
main.addEventListener('click', async (e) => {
  if (e.target.id !== 'padrao-carga') return;
  if (!(await confirmar({ titulo: 'Restaurar a carga horária padrão?', texto: 'Volta para as aulas por semana padrão de cada nível (25 no Ensino Fundamental e 30 no Ensino Médio), de 50 minutos cada.', botao: 'Restaurar' }))) return;
  try { await salvar('carga-horaria', cargaPadrao()); await registrarAcao(sessao().nome, 'Restaurou a carga horária padrão', 'Todas as séries'); await mostrar(); avisar('Carga horária padrão restaurada.'); } catch { avisar('Não foi possível restaurar. Confira a conexão e tente de novo.'); }
});
main.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  let falhou = null; let mudou = 0;
  const nova = carga.map((l, i) => {
    const a = form.querySelector(`#a${i}`), mi = form.querySelector(`#m${i}`);
    const linha = { ...l, aulasSemana: a.value === '' ? NaN : Number(a.value), minutosAula: mi.value === '' ? NaN : Number(mi.value) };
    const { erros } = validarCarga(linha);
    for (const [campo, el] of [['aulasSemana', a], ['minutosAula', mi]]) {
      const p = form.querySelector(`#${el.id}-erro`); p.textContent = erros[campo] || '';
      if (erros[campo]) { el.setAttribute('aria-invalid', 'true'); falhou ??= el; } else el.removeAttribute('aria-invalid');
    }
    if (linha.aulasSemana !== l.aulasSemana || linha.minutosAula !== l.minutosAula) mudou += 1;
    return linha;
  });
  if (falhou) { falhou.focus(); avisar('Confira os valores marcados em vermelho.', 'erro'); return; }
  if (!mudou) { avisar('Nenhum valor foi alterado.'); return; }
  const abaixo = nova.filter((l) => !situacaoDaCarga(l.etapa, l).ok);
  if (abaixo.length && !(await confirmar({ titulo: 'Salvar com carga abaixo do mínimo?', texto: `${abaixo.length} ${abaixo.length === 1 ? 'série fica' : 'séries ficam'} abaixo do mínimo de horas por ano: ${abaixo.map((l) => l.serie).join(', ')}.`, botao: 'Salvar mesmo assim', perigo: true }))) return;
  try {
    await comEspera(e.submitter, async () => { await salvar('carga-horaria', nova); await registrarAcao(sessao().nome, `Alterou a carga horária (${mudou} ${mudou === 1 ? 'série' : 'séries'})`, 'Matrizes'); });
    await mostrar(); avisar('Carga horária salva.');
  } catch { avisar('Não foi possível salvar a carga horária. Confira a conexão e tente de novo.'); }
});
mostrar();
