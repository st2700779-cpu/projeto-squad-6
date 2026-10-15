// Escolas da rede (SEED): lista com endereço, níveis liberados e situação do ato, cadastro de nova escola com o ato
// autorizativo (inclusive divisão de escola) e abertura de vagas. A regra de validação fica em dominio/cadastros.js.
import { iniciar, falhaDados } from '../app.js';
import { sessao } from '../auth.js';
import { esc, etiqueta, icone, avisar, vazio, combina, debounce, comEspera, dataBR, plural } from '../ui.js';
import { carregar, conjunto, salvar, registrarAcao, dataDeReferencia, vagas as lerVagas } from '../dados.js';
import { situacaoAto } from '../regras.js';
import { ETAPAS, TIPOS_DE_ATO, validarEscola, montarEscola, seriesDaEtapa } from '../dominio/cadastros.js';
import { campo, marcas, lerFormulario, mostrarErros } from '../componentes/formulario.js';

const main = await iniciar({ perfil: 'rede', pagina: 'rede/escolas.html', assistente: true });
let escolas, atos, vagas, localidades, hoje;
let busca = '';
let municipio = '';
let aberto = false;
let escolaDasVagas = null;

async function mostrar() {
  try {
    [escolas, atos, vagas, localidades, hoje] = await Promise.all([carregar('escolas'), carregar('atos'), lerVagas(), carregar('localidades'), dataDeReferencia()]);
    desenhar();
  } catch { falhaDados(main, mostrar); }
}
const municipios = () => [...new Set([...localidades.municipios.map((m) => m.municipio), ...escolas.map((e) => e.municipio)])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
const dres = () => [...new Set(escolas.map((e) => e.dre))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
const filtradas = () => escolas.filter((e) => (!municipio || e.municipio === municipio) && combina(busca, e.nome, e.municipio, e.dre, e.bairro, e.inep));
const hojeData = () => new Date(`${hoje}T12:00:00`);

function niveisDa(e) {
  const meus = atos.filter((a) => a.escolaId === e.id);
  if (!meus.length) return '<span class="texto-suave">Nenhum nível liberado</span>';
  return `<div class="etiquetas-linha">${ETAPAS.filter((t) => meus.some((a) => a.etapa === t.etapa)).map((t) => {
    const a = meus.find((x) => x.etapa === t.etapa); const s = situacaoAto(a, hojeData());
    return etiqueta(`${t.curto} (${t.resumo}) · ${s.texto}`, s.tipo);
  }).join('')}</div>`;
}

function tabela(lista) {
  if (!lista.length) return vazio('Nenhuma escola encontrada', 'Mude a busca ou o município para ver outras escolas.');
  return `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Escolas da rede</caption>
    <thead><tr><th scope="col">Escola</th><th scope="col">Endereço</th><th scope="col">Níveis liberados pelo ato</th><th scope="col">Ato e vencimento</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead>
    <tbody>${lista.map((e) => {
      const meus = atos.filter((a) => a.escolaId === e.id);
      const origem = e.origemId ? escolas.find((x) => x.id === e.origemId) : null;
      return `<tr><td class="titulo-linha"><strong>${esc(e.nome)}</strong> ${e.cadastradaEm ? etiqueta('Nova', 'info') : ''}<br><span class="texto-suave texto-pequeno">${esc(e.municipio)} · ${esc(e.dre)}${e.inep ? ` · INEP ${esc(e.inep)}` : ''}</span>${origem ? `<br><span class="texto-suave texto-pequeno">Dividida a partir de ${esc(origem.nome)}</span>` : ''}</td>
        <td data-rotulo="Endereço"><div>${esc(e.endereco || `${e.bairro}, ${e.municipio}`)}${e.telefone ? `<br><span class="texto-suave texto-pequeno">Tel. ${esc(e.telefone)}</span>` : ''}</div></td>
        <td data-rotulo="Níveis liberados">${niveisDa(e)}</td>
        <td data-rotulo="Ato"><div>${meus.length ? [...new Set(meus.map((a) => `${a.numero} · vence em ${dataBR(a.validade)}`))].map(esc).join('<br>') : '—'}</div></td>
        <td class="acoes"><button type="button" class="botao botao-secundario botao-mini" data-vagas="${e.id}" ${meus.length ? '' : 'disabled'}>Vagas</button></td></tr>`;
    }).join('')}</tbody></table></div>
    <p class="contagem">${lista.length} ${plural(lista.length, 'escola', 'escolas')}</p>`;
}

function blocoVagas(e) {
  const series = ETAPAS.filter((t) => atos.some((a) => a.escolaId === e.id && a.etapa === t.etapa)).flatMap((t) => t.series);
  return `<form id="form-vagas" class="form-cadastro" novalidate data-escola="${e.id}" aria-labelledby="vagas-titulo">
    <h2 id="vagas-titulo">Vagas abertas: ${esc(e.nome)}</h2>
    <p class="texto-suave esp-t-0">Quantas vagas a escola abre em cada série liberada pelo ato. Ato vencido bloqueia a matrícula mesmo com vaga aberta.</p>
    <div class="form-bloco">${series.map((s, i) => campo({ nome: `v${i}`, rotulo: s.replace(' EM', ' (Ensino Médio)'), tipo: 'number', valor: String(vagas[e.id]?.[s] ?? 0), atributos: `min="0" max="200" step="1" inputmode="numeric" data-serie="${esc(s)}"` })).join('')}</div>
    <div class="form-acoes"><button type="submit" class="botao">Salvar vagas</button><button type="button" class="botao botao-secundario" id="fechar-vagas">Cancelar</button></div></form>`;
}

function formulario() {
  const so = (rot, lista) => [['', rot], ...lista.map((x) => [x, x])];
  return `<form id="form-escola" class="form-cadastro" novalidate ${aberto ? '' : 'hidden'} aria-labelledby="cad-titulo">
    <h2 id="cad-titulo">Cadastrar escola</h2>
    <p class="texto-suave esp-t-0">Campos com <span class="obrigatorio" aria-hidden="true">*</span> são obrigatórios. A escola só pode oferecer as séries dos níveis liberados pelo ato autorizativo, e só enquanto ele estiver vigente.</p>
    <fieldset class="form-bloco"><legend>Dados da escola</legend>
      <div class="largo">${campo({ nome: 'nome', rotulo: 'Nome da escola', obrigatorio: true, atributos: 'maxlength="120" autocomplete="off"' })}</div>
      ${campo({ nome: 'inep', rotulo: 'Código INEP', dica: '8 números', obrigatorio: true, atributos: 'inputmode="numeric" maxlength="8" autocomplete="off"' })}
      ${campo({ nome: 'municipio', rotulo: 'Município', obrigatorio: true, opcoes: so('Escolha o município', municipios()) })}
      ${campo({ nome: 'dre', rotulo: 'DRE (diretoria regional)', obrigatorio: true, opcoes: so('Escolha a DRE', dres()) })}
      ${campo({ nome: 'telefone', rotulo: 'Telefone', dica: 'Com DDD. Opcional', tipo: 'tel', atributos: 'inputmode="tel" autocomplete="off"' })}
      ${campo({ nome: 'email', rotulo: 'E-mail da escola', dica: 'Opcional', tipo: 'email', atributos: 'autocomplete="off"' })}
    </fieldset>
    <fieldset class="form-bloco"><legend>Endereço</legend>
      <div class="largo">${campo({ nome: 'logradouro', rotulo: 'Rua ou avenida', obrigatorio: true, atributos: 'maxlength="120" autocomplete="off"' })}</div>
      ${campo({ nome: 'numero', rotulo: 'Número', dica: 'Deixe em branco se for sem número', atributos: 'maxlength="10" autocomplete="off"' })}
      ${campo({ nome: 'bairro', rotulo: 'Bairro ou povoado', obrigatorio: true, atributos: 'maxlength="60" autocomplete="off"' })}
      ${campo({ nome: 'cep', rotulo: 'CEP', dica: '8 números', obrigatorio: true, atributos: 'inputmode="numeric" maxlength="9" autocomplete="off"' })}
    </fieldset>
    <fieldset class="form-bloco"><legend>Ato autorizativo (Conselho Estadual de Educação)</legend>
      ${campo({ nome: 'atoTipo', rotulo: 'Tipo do ato', obrigatorio: true, opcoes: so('Escolha o tipo', TIPOS_DE_ATO) })}
      ${campo({ nome: 'atoNumero', rotulo: 'Número do ato', dica: 'Exemplo: Resolução CEE nº 100/2026', obrigatorio: true, atributos: 'maxlength="60" autocomplete="off"' })}
      ${campo({ nome: 'atoPublicacao', rotulo: 'Data de publicação', tipo: 'date', obrigatorio: true, atributos: `max="${hoje}"` })}
      ${campo({ nome: 'atoVencimento', rotulo: 'Data de vencimento', tipo: 'date', obrigatorio: true, atributos: `min="${hoje}"` })}
      <div class="largo" id="campo-origem" hidden>${campo({ nome: 'origemId', rotulo: 'Escola que foi dividida', dica: 'A escola de origem continua cadastrada', opcoes: [['', 'Escolha a escola de origem'], ...escolas.map((e) => [e.id, `${e.nome} (${e.municipio})`])] })}</div>
      <div class="largo">${marcas({ nome: 'etapas', rotulo: 'Nível de ensino que o ato libera', obrigatorio: true, dica: 'Cada nível marcado libera as séries mostradas abaixo dele.', itens: ETAPAS.map((t) => [t.etapa, t.curto, `Libera ${t.resumo}`]) })}</div>
      <p class="previa-series largo" id="previa" aria-live="polite">Nenhuma série liberada ainda.</p>
    </fieldset>
    <div class="form-acoes"><button type="submit" class="botao">${icone('ok', 20)}Cadastrar escola</button><button type="button" class="botao botao-secundario" id="cancelar-cadastro">Cancelar</button></div>
  </form>`;
}

function desenhar() {
  const lista = filtradas();
  const vencidas = escolas.filter((e) => atos.some((a) => a.escolaId === e.id && !situacaoAto(a, hojeData()).vigente)).length;
  main.innerHTML = `
    <div class="cabecalho-pagina"><h1>Escolas da rede</h1></div>
    <p class="pagina-descricao">Cadastro das escolas com endereço, DRE, ato autorizativo e os níveis de ensino que o ato libera.</p>
    <dl class="resumo-linha">
      <div><dd>${escolas.length}</dd><dt>${plural(escolas.length, 'escola cadastrada', 'escolas cadastradas')}</dt></div>
      <div class="${vencidas ? 'alerta' : ''}"><dd>${vencidas}</dd><dt>${plural(vencidas, 'escola com ato vencido', 'escolas com ato vencido')}</dt></div>
      <div><dd>${municipios().length}</dd><dt>municípios</dt></div>
    </dl>
    <div class="ferramentas-tabela">
      <div class="campo campo-busca"><label for="busca">Buscar</label><input id="busca" class="entrada" type="search" placeholder="Nome, município, DRE ou INEP" value="${esc(busca)}">${icone('busca', 20)}</div>
      <div class="campo"><label for="filtro-municipio">Município</label><select id="filtro-municipio" class="entrada"><option value="">Todos os municípios</option>${municipios().map((m) => `<option ${m === municipio ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>
      <button type="button" class="botao" id="nova-escola">${icone('formulario', 20)}Cadastrar escola</button>
    </div>
    ${formulario()}
    <div id="area-vagas">${escolaDasVagas ? blocoVagas(escolas.find((e) => e.id === escolaDasVagas)) : ''}</div>
    <div id="tabela-escolas">${tabela(lista)}</div>`;
}

const previa = () => {
  const marcadas = [...main.querySelectorAll('[name="etapas"]:checked')].map((i) => i.value);
  const series = marcadas.flatMap(seriesDaEtapa);
  main.querySelector('#previa').textContent = series.length ? `Séries liberadas: ${series.map((s) => s.replace(' EM', ' (EM)')).join(', ')}.` : 'Nenhuma série liberada ainda.';
};
main.addEventListener('change', (e) => {
  if (e.target.id === 'filtro-municipio') { municipio = e.target.value; main.querySelector('#tabela-escolas').innerHTML = tabela(filtradas()); }
  if (e.target.id === 'f-atoTipo') main.querySelector('#campo-origem').hidden = e.target.value !== 'Divisão de escola';
  if (e.target.name === 'etapas') previa();
});
const filtrarBusca = debounce(() => { main.querySelector('#tabela-escolas').innerHTML = tabela(filtradas()); });
main.addEventListener('input', (e) => { if (e.target.id === 'busca') { busca = e.target.value; filtrarBusca(); } });
main.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.id === 'nova-escola') { aberto = true; escolaDasVagas = null; desenhar(); const f = main.querySelector('#form-escola'); f.querySelector('input').focus(); f.scrollIntoView({ block: 'start' }); }
  if (b.id === 'cancelar-cadastro') { aberto = false; desenhar(); main.querySelector('#nova-escola').focus(); }
  if (b.dataset.vagas) { escolaDasVagas = b.dataset.vagas; aberto = false; desenhar(); const f = main.querySelector('#form-vagas'); f.querySelector('input').focus(); f.scrollIntoView({ block: 'start' }); }
  if (b.id === 'fechar-vagas') { escolaDasVagas = null; desenhar(); }
});

function coordenadasDe(nomeMunicipio) {
  const m = localidades.municipios.find((x) => x.municipio === nomeMunicipio);
  if (m) return { lat: m.lat, lng: m.lng };
  const irma = escolas.find((x) => x.municipio === nomeMunicipio && x.lat);
  return irma ? { lat: irma.lat, lng: irma.lng } : { lat: localidades.municipios[0].lat, lng: localidades.municipios[0].lng };
}

main.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  if (form.id === 'form-escola') {
    const dados = lerFormulario(form);
    const { ok, erros } = validarEscola({ ...dados, etapas: dados.etapas || [] }, { escolas, hoje });
    if (!mostrarErros(form, erros)) { avisar('Confira os campos marcados em vermelho.', 'erro'); return; }
    try {
      await comEspera(e.submitter, async () => {
        const novo = montarEscola({ ...dados, etapas: dados.etapas }, { escolas, coordenadas: coordenadasDe(dados.municipio), hoje });
        const [escolasNovas, atosNovos, v] = await Promise.all([conjunto('escolas-novas'), conjunto('atos-novos'), lerVagas()]);
        escolasNovas.push(novo.escola); atosNovos.push(...novo.atos); v[novo.escola.id] = novo.vagas;
        await salvar('escolas-novas', escolasNovas); await salvar('atos-novos', atosNovos); await salvar('vagas', v);
        await registrarAcao(sessao().nome, `Cadastrou a escola e o ${novo.atos[0].numero}`, novo.escola.nome);
        escolaDasVagas = novo.escola.id;
      });
      aberto = false;
      await mostrar();
      avisar('Escola cadastrada. As vagas das séries liberadas começam em zero: abra as vagas abaixo.');
      main.querySelector('#form-vagas')?.scrollIntoView({ block: 'start' });
    } catch { avisar('Não foi possível cadastrar a escola. Confira a conexão e tente de novo.'); mostrar(); }
    return;
  }
  if (form.id === 'form-vagas') {
    const campos = [...form.querySelectorAll('input[data-serie]')];
    const erros = {};
    campos.forEach((c, i) => { const n = Number(c.value); if (c.value === '' || !Number.isInteger(n) || n < 0 || n > 200) erros[`v${i}`] = 'Informe um número inteiro de 0 a 200.'; });
    if (!mostrarErros(form, erros)) return;
    try {
      await comEspera(e.submitter, async () => {
        const v = await lerVagas();
        v[form.dataset.escola] = { ...(v[form.dataset.escola] || {}), ...Object.fromEntries(campos.map((c) => [c.dataset.serie, Number(c.value)])) };
        await salvar('vagas', v);
        await registrarAcao(sessao().nome, 'Atualizou as vagas', escolas.find((x) => x.id === form.dataset.escola).nome);
      });
      escolaDasVagas = null;
      await mostrar();
      avisar('Vagas salvas.');
    } catch { avisar('Não foi possível salvar as vagas. Confira a conexão e tente de novo.'); }
  }
});
mostrar();
