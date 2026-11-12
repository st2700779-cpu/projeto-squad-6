// Matrícula on-line no modelo do Portal da Matrícula da SEDUC/SE (análise "Analise_Portal_Matricula_SEDUC-SE.pdf", seção 6),
// com as melhorias que a análise sugere. Fluxo:
//   Início (Matrícula on-line + Outros serviços) → Consulta de vagas em passos (ano > modalidade > cidade > série > escolas e
//   turnos, com a quantidade de vagas e um caminho no topo) → a vaga escolhida segue junto → Primeiro acesso (nome, filiação,
//   nascimento e checagem de duplicidade) → Cadastro básico → Responsável e endereço → Termos (vacinação e uso de dados, com o
//   texto na tela) → Conferir → Comprovante (protocolo, QR Code, prazo e documentos).
//   Turno sem vaga: inscrição na lista de espera daquela escola, série e turno, com a posição na fila.
// A rematrícula (?rematricula=) e o link "continuar em outro aparelho" (#rascunho=) continuam no formulário anterior
// (formulario.js), que também é o do atendimento presencial da secretaria. Regras em dominio/portal-matricula.js.
const params = new URLSearchParams(location.search);
if (params.get('rematricula') || location.hash.startsWith('#rascunho=')) {
  await import('./formulario.js');
} else {
  await iniciarPortal();
}

async function iniciarPortal() {
  const { iniciar, link, falhaDados, acoesDoTopo } = await import('../app.js');
  const { esc, icone, hojeBR, abrirJanela, combina } = await import('../ui.js');
  const { botaoOuvir } = await import('../acessibilidade.js');
  const { qrParaElemento } = await import('../qr.js');
  const { carregar, matriculas, vagasDetalhadas, salvar, novoProtocolo, conjunto, registrarAcao } = await import('../dados.js');
  const { serieCompleta, nomeCurto } = await import('../regras.js');
  const { ETAPAS } = await import('../dominio/niveis.js');
  const { hojeISO } = await import('../dominio/hoje.js');
  const { documentosDaMatricula, mascaraCpf, faseDaMatricula, idadeEm } = await import('../dominio/matricula-online.js');
  const { mascararCpf, somenteDigitos } = await import('../dominio/cadastros.js');
  const M = await import('../dominio/portal-matricula.js');
  await import('../componentes/data-br.js');

  document.body.classList.add('portal-matricula');
  const main = await iniciar({ perfil: 'familia', pagina: 'familia/matricula.html', assistente: true, titulo: 'Matrícula on-line' });
  const hoje = hojeISO();
  let base;
  let tela = 'inicio';
  const c = { ano: null, nivelId: null, cidade: null, serie: null, busca: '' }; // consulta de vagas
  let vaga = null; // { escolaId, serie, turno, cidade }
  let espera = null; // { escolaId, serie, turno, cidade } quando a família vai para a lista de espera
  const d = {}; // dados digitados
  let duplicados = [];
  let resultado = null; // { protocolo } ou { protocoloEspera, posicao }
  const ETAPAS_CADASTRO = [['vagas', 'Vaga'], ['primeiro', 'Primeiro acesso'], ['cadastro', 'Cadastro básico'], ['responsavel', 'Responsável e endereço'], ['termos', 'Termos'], ['conferir', 'Conferir e enviar']];

  async function preparar() {
    try {
      const [escolas, vagasDet, online, pedidos, estudantes, localidades, listaEspera] = await Promise.all([carregar('escolas'), vagasDetalhadas(), carregar('matricula-online'), matriculas(), carregar('estudantes'), carregar('localidades'), conjunto('lista-espera')]);
      base = { escolas, vagasDet, online, pedidos, estudantes, localidades, listaEspera };
      desenhar();
    } catch { falhaDados(main, preparar); }
  }

  // ---------- pedaços de tela ----------
  const niveisDaMatricula = () => ETAPAS.filter((n) => n.ativo && n.matricula);
  const nivel = () => niveisDaMatricula().find((n) => n.id === c.nivelId);
  const escolaDe = (id) => base.escolas.find((e) => e.id === id);
  const br = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
  const cartao = (titulo, corpo, { id = '', classe = '' } = {}) => `<section class="mt-cartao ${classe}"${id ? ` aria-labelledby="${id}"` : ''}><h2 class="mt-cartao-titulo"${id ? ` id="${id}"` : ''}>${titulo}</h2><div class="mt-cartao-corpo">${corpo}</div></section>`;
  const obrig = '<span class="mt-obrig" aria-hidden="true">*</span>';
  /** Campo com rótulo, dica e erro logo abaixo. col: 3, 4, 6, 8, 9 ou 12 (de 12 colunas no computador). */
  function campo({ id, rotulo, req = false, valor = '', tipo = 'text', dica = '', col = 12, attrs = '', opcoes = null, vazio = 'Selecione' }, erros = {}) {
    const erro = erros[id] || '';
    const desc = [dica ? `${id}-dica` : '', `${id}-erro`].filter(Boolean).join(' ');
    const comum = `id="f-${id}" name="${id}" class="entrada" aria-describedby="${desc}"${req ? ' aria-required="true"' : ''}${erro ? ' aria-invalid="true"' : ''} ${attrs}`;
    const entrada = opcoes
      ? `<select ${comum}><option value="">${esc(vazio)}</option>${opcoes.map((o) => `<option ${o === valor ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`
      : `<input ${comum} type="${tipo}" value="${esc(valor ?? '')}">`;
    return `<div class="campo mt-col-${col}"><label for="f-${id}">${esc(rotulo)} ${req ? obrig : '<span class="dica">(opcional)</span>'}</label>${entrada}${dica ? `<span class="dica" id="${id}-dica">${esc(dica)}</span>` : ''}<p class="erro" id="${id}-erro">${esc(erro)}</p></div>`;
  }
  /** Grupo de opções (rádio) com legenda. */
  function radios({ id, rotulo, opcoes, valor, req = true, col = 12 }, erros = {}) {
    return `<fieldset class="campo mt-col-${col} mt-radios" aria-describedby="${id}-erro"><legend>${esc(rotulo)} ${req ? obrig : ''}</legend><div class="mt-radios-lista">${opcoes.map((o, i) => `<label class="mt-radio"><input type="radio" name="${id}" value="${esc(o)}" ${o === valor ? 'checked' : ''} ${i === 0 ? `id="f-${id}"` : ''}><span>${esc(o)}</span></label>`).join('')}</div><p class="erro" id="${id}-erro">${esc(erros[id] || '')}</p></fieldset>`;
  }
  const avisoObrigatorios = `<p class="mt-aviso-obrig">Campos com <span aria-hidden="true">*</span><span class="sr-only">asterisco</span> são obrigatórios.</p>`;

  /** Indicador das etapas do cadastro (1 a 6). */
  function etapas(atual) {
    const i = ETAPAS_CADASTRO.findIndex(([t]) => t === atual);
    return `<ol class="mt-etapas" aria-label="Etapas da matrícula">${ETAPAS_CADASTRO.map(([t, nome], k) => `<li class="${k < i ? 'feita' : k === i ? 'atual' : ''}"${k === i ? ' aria-current="step"' : ''}><span class="mt-etapa-num" aria-hidden="true">${k < i ? '✓' : k + 1}</span><span class="mt-etapa-nome">${esc(nome)}</span>${k < i ? '<span class="sr-only"> (feita)</span>' : ''}</li>`).join('')}</ol>`;
  }
  /** A vaga escolhida segue junto em todas as etapas (melhoria da análise: o portal oficial perde a escolha no login). */
  function resumoDaVaga(v = vaga, { trocar = true, titulo = 'Vaga escolhida' } = {}) {
    if (!v) return '';
    const e = escolaDe(v.escolaId);
    return `<div class="mt-vaga-escolhida"><div><span class="mt-rotulo-pequeno">${titulo}</span><strong>${esc(e?.nome || '')}</strong><span>${esc(serieCompleta(v.serie))} · ${esc(v.turno)} · ${esc(e?.bairro || '')}, ${esc(e?.municipio || '')}</span></div>${trocar ? '<button type="button" class="botao botao-secundario botao-mini" data-trocar-vaga>Trocar vaga</button>' : ''}</div>`;
  }

  // ---------- telas ----------
  function telaInicio() {
    const o = base.online;
    const agora = faseDaMatricula(o.fases, hoje);
    return `<h1 class="mt-titulo" tabindex="-1">Matrícula on-line</h1>
      <p class="mt-sub">Rede estadual de Sergipe · ano letivo ${hoje.slice(0, 4)} · ${agora.continua ? 'matrícula contínua, enquanto houver vaga' : `fase ${agora.fase}: ${esc(agora.nome.toLowerCase())}`}</p>
      <div class="mt-grade-inicio">
        ${cartao('Fazer matrícula', `<p>Para quem vai entrar na rede estadual. Primeiro escolha a escola, a série e o turno com vaga. Depois preencha os dados do estudante.</p>
          <button type="button" class="botao botao-grande mt-acao" data-ir="vagas">Consultar vagas e fazer matrícula</button>
          <p class="mt-nota">Quem já estuda na rede continua na mesma escola automaticamente. Para mudar de escola, procure a secretaria da escola atual.</p>`, { id: 'c-fazer' })}
        ${cartao('Outros serviços', `<ul class="mt-servicos">
          <li><button type="button" class="botao botao-secundario" data-ir="vagas">Consultar vagas</button></li>
          <li><a class="botao botao-secundario" href="${link('familia/acompanhar.html')}">Acompanhar pedido</a></li>
          <li><a class="botao botao-secundario" href="${link('familia/acompanhar.html?tipo=espera')}">Consultar lista de espera</a></li>
          <li><a class="botao botao-secundario" href="${link('familia/mapa.html')}">Escolas no mapa</a></li>
        </ul>`, { id: 'c-servicos' })}
      </div>
      <details class="mt-periodos"><summary>Períodos de matrícula ${hoje.slice(0, 4)}</summary>
        <ol>${o.fases.map((f) => `<li${!agora.continua && agora.fase === f.fase ? ' aria-current="step"' : ''}><strong>${esc(f.nome)}</strong> · ${br(f.inicio).slice(0, 5)} a ${br(f.fim).slice(0, 5)}<br><span class="texto-pequeno">${esc(f.publico)}. ${esc(f.detalhe)}</span></li>`).join('')}</ol>
        <p class="texto-pequeno">${esc(o.continua)} Pedido pela internet ${esc(o.horario)}.</p></details>`;
  }

  /** Consulta de vagas: passo a passo com o caminho no topo (Início / ano / cidade / modalidade / série). */
  function telaVagas() {
    const caminho = [['Início', 'inicio'], c.ano && [c.ano, 'ano'], c.cidade && [c.cidade, 'cidade'], c.nivelId && [nivel()?.curto, 'nivel'], c.serie && [c.serie, 'serie']].filter(Boolean);
    const migalhas = `<nav class="mt-caminho" aria-label="Escolhas feitas"><ol>${caminho.map(([t, alvo], i) => `<li>${i === caminho.length - 1 && i > 0 ? `<span aria-current="page">${esc(t)}</span>` : `<button type="button" class="mt-link" data-voltar-a="${alvo}">${esc(t)}</button>`}</li>`).join('')}</ol></nav>`;
    let corpo;
    if (!c.ano) {
      corpo = `<h3 class="mt-pergunta">Em que ano letivo deseja se matricular?</h3><div class="mt-opcoes mt-opcoes-curtas"><button type="button" class="mt-opcao" data-ano="${hoje.slice(0, 4)}">${hoje.slice(0, 4)}</button></div>`;
    } else if (!c.nivelId) {
      corpo = `<h3 class="mt-pergunta">Em qual etapa de ensino?</h3><div class="mt-opcoes">${niveisDaMatricula().map((n) => `<button type="button" class="mt-opcao" data-nivel="${n.id}">${esc(n.etapa)}<small>${esc(n.resumo || '')}</small></button>`).join('')}</div>
        <p class="mt-nota">Educação de Jovens e Adultos e cursos técnicos: a matrícula é feita na secretaria da escola.</p>`;
    } else if (!c.cidade) {
      corpo = `<h3 class="mt-pergunta">Em qual cidade deseja estudar?</h3><div class="mt-opcoes mt-opcoes-curtas"><button type="button" class="mt-opcao" data-abrir-cidades>Escolher a cidade</button></div>`;
    } else if (!c.serie) {
      corpo = `<h3 class="mt-pergunta">Em qual ${nivel()?.nomenclatura === 'serie' ? 'série' : 'ano'}?</h3><div class="mt-opcoes mt-opcoes-series">${nivel().series.map((s) => `<button type="button" class="mt-opcao" data-serie="${esc(s)}">${esc(s.replace(' EM', ''))}</button>`).join('')}</div>`;
    } else corpo = tabelaDeEscolas();
    return `<h1 class="mt-titulo" tabindex="-1">Consulta de vagas</h1>
      ${etapas('vagas')}
      ${cartao('Escolha a vaga', `${migalhas}${corpo}`, { classe: 'mt-consulta' })}`;
  }

  function tabelaDeEscolas() {
    const todas = M.ofertasDaSerie({ escolas: base.escolas, vagasDetalhe: base.vagasDet, cidade: c.cidade, serie: c.serie });
    const linhas = todas.filter((o) => combina(c.busca, o.escola.nome, o.escola.bairro));
    const f2 = base.online.fases.find((f) => f.fase === 2), f3 = base.online.fases.find((f) => f.fase === 3);
    const chip = (o, t) => (t.vagas > 0
      ? `<button type="button" class="mt-turno com-vaga" data-escolher="${o.escola.id}" data-turno="${esc(t.turno)}"><strong>${esc(t.turno)}</strong><span>${t.vagas} ${t.vagas === 1 ? 'vaga' : 'vagas'}</span><span class="sr-only"> em ${esc(o.escola.nome)}. Escolher esta vaga</span></button>`
      : `<div class="mt-turno sem-vaga"><strong>${esc(t.turno)}</strong><span>Oferta o turno, sem vagas agora</span><button type="button" class="mt-link mt-link-espera" data-espera="${o.escola.id}" data-turno="${esc(t.turno)}">Entrar na lista de espera<span class="sr-only"> do turno ${esc(t.turno)} em ${esc(o.escola.nome)}</span></button></div>`);
    return `<h3 class="mt-pergunta">Em qual escola deseja estudar?</h3>
      <p class="mt-nota esp-t-0">Escolha um turno com vaga para continuar. A vaga fica guardada enquanto você preenche os dados. Alunos da rede podem pedir a partir de ${br(f2?.inicio).slice(0, 5)}; novos alunos, a partir de ${br(f3?.inicio).slice(0, 5)}. Depois disso, a matrícula continua enquanto houver vaga.</p>
      <div class="mt-busca campo"><label for="mt-busca">Pesquisar escola</label><input id="mt-busca" class="entrada" type="search" autocomplete="off" placeholder="Nome da escola ou bairro" value="${esc(c.busca)}"></div>
      <p class="mt-contagem" role="status">${linhas.length} ${linhas.length === 1 ? 'escola oferece' : 'escolas oferecem'} ${esc(serieCompleta(c.serie))} em ${esc(c.cidade)}${c.busca ? ' com essa pesquisa' : ''}</p>
      ${linhas.length ? `<div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes mt-tabela"><caption class="sr-only">Escolas com ${esc(c.serie)} em ${esc(c.cidade)} e os turnos</caption>
        <thead><tr><th scope="col">Escola</th><th scope="col">Endereço e bairro</th><th scope="col">Tipo</th><th scope="col">Turnos e vagas</th></tr></thead>
        <tbody>${linhas.map((o) => `<tr><td class="titulo-linha"><strong>${esc(o.escola.nome)}</strong></td><td data-rotulo="Endereço"><div>${esc(o.escola.endereco || '')}${o.escola.endereco ? '<br>' : ''}${esc(o.escola.bairro || '')}</div></td><td data-rotulo="Tipo"><div>${esc(o.tipo)}</div></td><td data-rotulo="Turnos"><div class="mt-turnos">${o.turnos.map((t) => chip(o, t)).join('')}</div></td></tr>`).join('')}</tbody></table></div>`
        : `<p class="mt-vazio">${todas.length ? 'Nenhuma escola com essa pesquisa. Apague a pesquisa para ver todas.' : `Nenhuma escola da rede estadual oferece ${esc(serieCompleta(c.serie))} em ${esc(c.cidade)}. Volte e escolha outra cidade.`}</p>`}`;
  }

  function telaPrimeiro(erros = {}) {
    return `<h1 class="mt-titulo" tabindex="-1">Primeiro acesso</h1>
      ${etapas('primeiro')}
      ${resumoDaVaga()}
      ${cartao('Quem vai estudar?', `<p class="esp-t-0">Antes do cadastro, o sistema confere se o estudante já tem registro na rede estadual. Cada estudante tem um código único: assim ninguém fica com dois cadastros.</p>
        ${avisoObrigatorios}
        <form class="mt-form mt-grade" data-form="primeiro" novalidate>
          ${campo({ id: 'nome', rotulo: 'Nome completo do estudante', req: true, valor: d.nome, dica: 'Sem abreviações, como na certidão de nascimento', col: 12, attrs: 'autocomplete="off" maxlength="100"' }, erros)}
          ${campo({ id: 'filiacao', rotulo: 'Nome da mãe ou do pai', req: true, valor: d.filiacao, dica: 'Sem abreviações', col: 8, attrs: 'autocomplete="off" maxlength="100"' }, erros)}
          ${campo({ id: 'nascimento', rotulo: 'Data de nascimento', req: true, valor: d.nascimento, dica: 'dd/mm/aaaa', col: 4, attrs: 'data-campo-data inputmode="numeric" maxlength="10" placeholder="dd/mm/aaaa" autocomplete="off"' }, erros)}
          <div class="mt-col-12 mt-botoes"><button type="button" class="botao botao-secundario botao-grande" data-ir="vagas">Voltar à consulta de vagas</button><button type="submit" class="botao botao-grande mt-acao">Continuar</button></div>
        </form>`, { id: 'c-primeiro' })}`;
  }

  function telaDuplicados() {
    return `<h1 class="mt-titulo" tabindex="-1">Já existe cadastro com esses dados</h1>
      ${etapas('primeiro')}
      ${cartao('Confira se é o mesmo estudante', `<p class="esp-t-0">Encontramos ${duplicados.length === 1 ? 'um registro' : `${duplicados.length} registros`} com o nome <strong>${esc(d.nome)}</strong> e a data de nascimento <strong>${br(d.nascimento)}</strong>. Para proteger os dados de outras famílias, os nomes aparecem em parte.</p>
        <div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes mt-tabela"><caption class="sr-only">Registros encontrados</caption>
          <thead><tr><th scope="col">Código</th><th scope="col">Nome</th><th scope="col">Filiação</th><th scope="col">Nascimento</th><th scope="col">Escola e série</th></tr></thead>
          <tbody>${duplicados.map((x) => `<tr><td class="titulo-linha"><strong>${esc(x.codigo)}</strong><small>${x.origem === 'pedido' ? 'pedido em andamento' : 'estudante da rede'}</small></td><td data-rotulo="Nome"><div>${esc(x.nome)}</div></td><td data-rotulo="Filiação"><div>${esc(x.filiacao)}${x.confere ? ' <span class="mt-confere">mesma filiação</span>' : ''}</div></td><td data-rotulo="Nascimento"><div>${br(x.nascimento)}</div></td><td data-rotulo="Escola"><div>${esc(nomeCurto(x.escola))}${x.serie ? ` · ${esc(x.serie)}` : ''}</div></td></tr>`).join('')}</tbody></table></div>
        <div class="mt-escolhas">
          <div><h3>É este estudante?</h3><p>${duplicados.some((x) => x.origem === 'pedido') ? 'Se já existe um pedido, acompanhe o pedido em vez de fazer outro. ' : ''}Quem já é da rede não faz cadastro novo: entre no Portal do Estudante ou procure a secretaria da escola, que faz a transferência.</p>
            <p class="mt-botoes-linha">${duplicados.some((x) => x.origem === 'pedido') ? `<a class="botao botao-secundario" href="${link('familia/acompanhar.html')}">Acompanhar pedido</a>` : ''}<a class="botao botao-secundario" href="${link('login.html?perfil=aluno')}">Entrar no Portal do Estudante</a></p>
            <p class="mt-nota">Dúvidas: 0800 285 5321, das 8h às 22h.</p></div>
          <div><h3>Não é nenhum destes</h3><p>Pode ser outra pessoa com o mesmo nome e a mesma data de nascimento. Continue o cadastro.</p>
            <p class="mt-botoes-linha"><button type="button" class="botao mt-acao" data-nao-e>Continuar o cadastro</button></p></div>
        </div>
        <p><button type="button" class="botao botao-texto" data-ir="primeiro">Corrigir nome, filiação ou data</button></p>`, { id: 'c-dup' })}`;
  }

  function telaCadastro(erros = {}) {
    return `<h1 class="mt-titulo" tabindex="-1">Cadastro básico</h1>
      ${etapas('cadastro')}
      ${resumoDaVaga()}
      ${cartao('Dados do estudante', `${avisoObrigatorios}
        <form class="mt-form mt-grade" data-form="cadastro" novalidate>
          ${campo({ id: 'nome', rotulo: 'Nome completo', req: true, valor: d.nome, col: 9, attrs: 'maxlength="100" autocomplete="off"' }, erros)}
          ${campo({ id: 'nascimento', rotulo: 'Data de nascimento', req: true, valor: d.nascimento, col: 3, attrs: 'data-campo-data inputmode="numeric" maxlength="10" placeholder="dd/mm/aaaa"' }, erros)}
          ${campo({ id: 'filiacao1', rotulo: 'Filiação 1 (mãe ou responsável legal)', req: true, valor: d.filiacao1 ?? d.filiacao, col: 6, attrs: 'maxlength="100" autocomplete="off"' }, erros)}
          ${campo({ id: 'filiacao2', rotulo: 'Filiação 2', valor: d.filiacao2, col: 6, attrs: 'maxlength="100" autocomplete="off"' }, erros)}
          ${radios({ id: 'sexo', rotulo: 'Sexo', opcoes: M.SEXOS, valor: d.sexo, col: 4 }, erros)}
          ${campo({ id: 'cpf', rotulo: 'CPF do estudante', req: true, valor: d.cpf ? mascaraCpf(d.cpf) : '', col: 4, attrs: 'inputmode="numeric" maxlength="14" placeholder="000.000.000-00" autocomplete="off"' }, erros)}
          ${campo({ id: 'corRaca', rotulo: 'Cor ou raça', req: true, valor: d.corRaca, col: 4, opcoes: M.CORES_RACA }, erros)}
          ${campo({ id: 'nis', rotulo: 'NIS', valor: d.nis, dica: '11 números', col: 4, attrs: 'inputmode="numeric" maxlength="14" autocomplete="off"' }, erros)}
          ${campo({ id: 'sus', rotulo: 'Cartão SUS', valor: d.sus, dica: '15 números', col: 4, attrs: 'inputmode="numeric" maxlength="18" autocomplete="off"' }, erros)}
          ${radios({ id: 'bolsaFamilia', rotulo: 'A família recebe o Bolsa Família?', opcoes: ['Sim', 'Não'], valor: d.bolsaFamilia, col: 4 }, erros)}
          ${campo({ id: 'origem', rotulo: 'Onde o estudante estudou por último?', req: true, valor: d.origem, col: 12, opcoes: M.ORIGENS, dica: 'Quem vem de outra escola leva a guia de transferência ou a declaração da escola anterior' }, erros)}
          <h3 class="mt-col-12 mt-subtitulo">Documento de identidade</h3>
          ${campo({ id: 'rg', rotulo: 'RG', valor: d.rg, col: 3, dica: 'Pontos e traço automáticos', attrs: 'data-formato="rg" maxlength="14" autocomplete="off"' }, erros)}
          ${campo({ id: 'rgOrgao', rotulo: 'Órgão emissor', valor: d.rgOrgao ?? 'SSP', col: 3, opcoes: M.ORGAOS_RG }, erros)}
          ${campo({ id: 'rgUf', rotulo: 'UF', valor: d.rgUf ?? 'SE', col: 3, opcoes: M.UFS }, erros)}
          ${campo({ id: 'rgEmissao', rotulo: 'Data de emissão', valor: d.rgEmissao, col: 3, attrs: 'data-campo-data inputmode="numeric" maxlength="10" placeholder="dd/mm/aaaa"' }, erros)}
          <h3 class="mt-col-12 mt-subtitulo">Contato</h3>
          ${campo({ id: 'email', rotulo: 'E-mail', req: true, valor: d.email, tipo: 'email', dica: 'A escola usa o e-mail para avisar sobre o pedido e a lista de espera', col: 12, attrs: 'maxlength="80" autocomplete="email"' }, erros)}
          <div class="mt-col-12 mt-botoes"><button type="button" class="botao botao-secundario botao-grande" data-ir="primeiro">Voltar</button><button type="submit" class="botao botao-grande mt-acao">Salvar e continuar</button></div>
        </form>`, { id: 'c-cadastro' })}`;
  }

  function bairrosDa(cidade) {
    const conhecidos = base.localidades.bairros.filter((b) => b.municipio === cidade).map((b) => b.nome.split(' — ').pop());
    const dasEscolas = base.escolas.filter((e) => e.municipio === cidade).map((e) => e.bairro);
    return [...new Set([...conhecidos, ...dasEscolas])].sort((a, b) => a.localeCompare(b, 'pt-BR')).concat('Outro bairro');
  }
  const municipios = () => [...new Set(base.escolas.map((e) => e.municipio))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  function telaResponsavel(erros = {}) {
    const menor = (idadeEm(d.nascimento, hoje) ?? 0) < 18;
    d.municipio ??= vaga?.cidade;
    return `<h1 class="mt-titulo" tabindex="-1">Responsável e endereço</h1>
      ${etapas('responsavel')}
      ${resumoDaVaga()}
      <form class="mt-form" data-form="responsavel" novalidate>
      ${cartao('Responsável legal', `${menor ? '<p class="esp-t-0">O estudante é menor de idade: só a mãe, o pai ou o responsável legal pode fazer a matrícula.</p>' : '<p class="esp-t-0">O estudante é maior de idade. Preencha só se outra pessoa for responsável.</p>'}
        ${avisoObrigatorios}
        <div class="mt-grade">
          ${campo({ id: 'respNome', rotulo: 'Nome do responsável', req: menor, valor: d.respNome ?? d.filiacao1, col: 6, attrs: 'maxlength="100" autocomplete="name"' }, erros)}
          ${campo({ id: 'respCpf', rotulo: 'CPF do responsável', req: menor, valor: d.respCpf ? mascaraCpf(d.respCpf) : '', col: 3, attrs: 'inputmode="numeric" maxlength="14" placeholder="000.000.000-00" autocomplete="off"' }, erros)}
          ${campo({ id: 'respNascimento', rotulo: 'Nascimento do responsável', req: menor, valor: d.respNascimento, col: 3, dica: 'A idade é conferida na hora: precisa ter 18 anos ou mais', attrs: 'data-campo-data inputmode="numeric" maxlength="10" placeholder="dd/mm/aaaa"' }, erros)}
          ${campo({ id: 'parentesco', rotulo: 'Parentesco', req: menor, valor: d.parentesco, col: 6, opcoes: M.PARENTESCOS }, erros)}
          ${campo({ id: 'telefone', rotulo: 'Telefone para contato', req: true, valor: d.telefone, col: 6, tipo: 'tel', attrs: 'inputmode="tel" maxlength="15" placeholder="(79) 99999-9999" autocomplete="tel"' }, erros)}
        </div>`, { id: 'c-resp' })}
      ${cartao('Endereço onde o estudante mora', `<div class="mt-grade">
          ${campo({ id: 'cep', rotulo: 'CEP', valor: d.cep, col: 3, attrs: 'inputmode="numeric" maxlength="9" placeholder="00000-000" autocomplete="postal-code"' }, erros)}
          ${campo({ id: 'logradouro', rotulo: 'Rua ou avenida', req: true, valor: d.logradouro, col: 7, attrs: 'maxlength="100" autocomplete="address-line1"' }, erros)}
          ${campo({ id: 'numero', rotulo: 'Número', req: true, valor: d.numero, col: 2, attrs: 'maxlength="10"' }, erros)}
          ${campo({ id: 'municipio', rotulo: 'Município', req: true, valor: d.municipio, col: 6, opcoes: municipios() }, erros)}
          ${campo({ id: 'bairro', rotulo: 'Bairro', req: true, valor: d.bairro, col: 6, opcoes: bairrosDa(d.municipio), dica: 'A rede usa o bairro para saber onde falta vaga' }, erros)}
        </div>
        <div class="mt-botoes"><button type="button" class="botao botao-secundario botao-grande" data-ir="cadastro">Voltar</button><button type="submit" class="botao botao-grande mt-acao">Salvar e continuar</button></div>`, { id: 'c-end' })}
      </form>`;
  }

  function telaTermos(erros = {}) {
    return `<h1 class="mt-titulo" tabindex="-1">Termos</h1>
      ${etapas('termos')}
      <form class="mt-form" data-form="termos" novalidate>
      ${cartao('Termo de vacinação', `<div class="mt-termo"><p>Autorizo as equipes de Saúde da Família a aplicar na escola, no estudante, as vacinas do calendário do SUS que estiverem faltando no cartão de vacinação.</p><p>Sem a autorização, o estudante não é vacinado na escola. A matrícula vale com qualquer resposta.</p></div>
        ${radios({ id: 'vacinacao', rotulo: 'Resposta', opcoes: ['Autorizo', 'Não autorizo'], valor: d.vacinacao }, erros)}`, { id: 'c-vac' })}
      ${cartao('Termo de uso de dados', `<div class="mt-termo"><p>Declaro que as informações deste cadastro são verdadeiras. Informação falsa pode cancelar a vaga.</p><p>Estou ciente de que os dados serão usados pela Secretaria de Estado da Educação para a matrícula e a vida escolar do estudante e compartilhados com o MEC, o Inep e a Justiça, quando pedirem, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p></div>
        <div class="campo"><label class="mt-check"><input type="checkbox" id="f-usoDeDados" name="usoDeDados" ${d.usoDeDados ? 'checked' : ''} aria-describedby="usoDeDados-erro"><span>Li e concordo com o termo de uso de dados ${obrig}</span></label><p class="erro" id="usoDeDados-erro">${esc(erros.usoDeDados || '')}</p></div>
        <div class="mt-botoes"><button type="button" class="botao botao-secundario botao-grande" data-ir="responsavel">Voltar</button><button type="submit" class="botao botao-grande mt-acao">Continuar</button></div>`, { id: 'c-uso' })}
      </form>`;
  }

  const documentos = () => documentosDaMatricula(base.online.documentos, { tipo: M.tipoPelaOrigem(d.origem), nascimento: d.nascimento, hoje });
  function telaConferir(erro = '') {
    const linha = (rot, val) => (val ? `<dt>${esc(rot)}</dt><dd>${esc(val)}</dd>` : '');
    const bloco = (titulo, alvo, html) => `<section class="mt-conferir-bloco"><div class="mt-conferir-topo"><h3>${titulo}</h3><button type="button" class="botao botao-texto botao-mini" data-ir="${alvo}">Alterar<span class="sr-only"> ${titulo.toLowerCase()}</span></button></div><dl>${html}</dl></section>`;
    return `<h1 class="mt-titulo" tabindex="-1">Confira antes de enviar</h1>
      ${etapas('conferir')}
      ${resumoDaVaga(vaga, { trocar: true })}
      ${cartao('Dados do pedido', `
        ${bloco('Estudante', 'cadastro', linha('Nome', d.nome) + linha('Nascimento', br(d.nascimento)) + linha('CPF', mascararCpf(d.cpf)) + linha('Filiação', [d.filiacao1, d.filiacao2].filter(Boolean).join(' e ')) + linha('Sexo', d.sexo) + linha('Cor ou raça', d.corRaca) + linha('NIS', d.nis) + linha('Cartão SUS', d.sus) + linha('Bolsa Família', d.bolsaFamilia) + linha('Estudou por último', d.origem) + linha('RG', d.rg ? `${d.rg} · ${d.rgOrgao}/${d.rgUf}${d.rgEmissao ? ` · ${br(d.rgEmissao)}` : ''}` : '') + linha('E-mail', d.email))}
        ${bloco('Responsável e endereço', 'responsavel', linha('Responsável', d.respNome ? `${d.respNome} (${d.parentesco}) · CPF ${mascararCpf(d.respCpf)}${d.respNascimento ? ` · ${idadeEm(d.respNascimento, hoje)} anos` : ''}` : 'O próprio estudante') + linha('Telefone', d.telefone) + linha('Endereço', `${d.logradouro}, ${d.numero}${d.cep ? ` · CEP ${d.cep}` : ''}`) + linha('Bairro', `${d.bairro}, ${d.municipio}`))}
        ${bloco('Termos', 'termos', linha('Vacinação na escola', d.vacinacao) + linha('Uso de dados', 'Li e concordo'))}
        <h3 class="mt-subtitulo">Documentos para levar à escola</h3>
        <ul class="mt-docs">${documentos().map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <p class="mt-nota">Leve os documentos à secretaria da escola em até ${base.online.prazoDocumentosDiasUteis || 5} dias úteis depois do pedido. Sem os documentos no prazo, a vaga pode ser perdida.</p>
        <p class="erro" role="alert" id="erro-envio">${esc(erro)}</p>
        <div class="mt-botoes"><button type="button" class="botao botao-secundario botao-grande" data-ir="termos">Voltar</button><button type="button" class="botao botao-grande mt-acao" data-enviar>Enviar pedido de matrícula</button></div>`, { id: 'c-conf' })}`;
  }

  function telaEnviado() {
    const e = escolaDe(vaga.escolaId);
    const docs = documentos();
    return `<div class="mt-sucesso" role="status"><h1 class="mt-titulo" tabindex="-1">Pedido de matrícula enviado</h1><p>Guarde o protocolo: é com ele que a família acompanha o pedido.</p></div>
      ${cartao('Comprovante do pedido de matrícula', `<div class="mt-comprovante">
        <dl class="dados-comprovante">
          <dt>Protocolo</dt><dd><strong class="mt-protocolo">${esc(resultado.protocolo)}</strong></dd>
          <dt>Estudante</dt><dd>${esc(d.nome)} · CPF ${esc(mascararCpf(d.cpf))}</dd>
          <dt>Escola</dt><dd>${esc(e.nome)}<br><span class="texto-pequeno">${esc(e.endereco || `${e.bairro}, ${e.municipio}`)}</span></dd>
          <dt>Série e turno</dt><dd>${esc(serieCompleta(vaga.serie))} · ${esc(vaga.turno)}</dd>
          <dt>Responsável</dt><dd>${esc(d.respNome || d.nome)} · ${esc(d.telefone)}</dd>
          <dt>Pedido feito em</dt><dd>${hojeBR()} pela internet</dd>
          <dt>Situação</dt><dd>Aguardando a escola conferir os documentos e confirmar</dd>
        </dl>
        <div class="mt-qr"><div data-qr></div><span class="texto-pequeno">Para acompanhar o pedido</span></div>
      </div>
      <h3 class="mt-subtitulo">Levar à secretaria em até ${base.online.prazoDocumentosDiasUteis || 5} dias úteis</h3>
      <ul class="mt-docs">${docs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <p class="mt-nota">Sem os documentos no prazo, a escola tenta falar com a família e, sem resposta, a vaga pode ser liberada para outro estudante.</p>`, { id: 'c-comp', classe: 'comprovante-matricula' })}
      <div class="mt-botoes"><button type="button" class="botao botao-secundario botao-grande" data-imprimir>${icone('imprimir', 22)}Imprimir ou salvar o comprovante</button><a class="botao botao-secundario botao-grande" href="${link(`familia/acompanhar.html?protocolo=${encodeURIComponent(resultado.protocolo)}`)}">Acompanhar o pedido</a><a class="botao botao-grande mt-acao" href="${link('index.html')}">Voltar à página inicial</a></div>`;
  }

  function telaEspera(erros = {}) {
    const ja = erros._ja;
    return `<h1 class="mt-titulo" tabindex="-1">Lista de espera</h1>
      ${resumoDaVaga(espera, { titulo: 'Turno sem vaga agora', trocar: false })}
      ${cartao('Inscrição na lista de espera', `<ul class="mt-regras"><li>Cada estudante pode ter só uma inscrição ativa na lista de espera.</li><li>Quando abrir vaga, o primeiro da fila recebe e-mail e ligação e tem 3 dias para confirmar o interesse. Sem confirmação, a inscrição é cancelada.</li><li>Depois de confirmar, a matrícula precisa ser feita na escola em até 7 dias.</li><li>Você pode cancelar a inscrição quando quiser, em Consultar lista de espera.</li></ul>
        ${erros._erro ? `<div class="alerta-erro" role="alert">${icone('alerta', 20)}<span>Não foi possível fazer a inscrição. Confira a conexão e tente de novo.</span></div>` : ''}
        ${ja ? `<div class="alerta-atencao" role="alert">${icone('alerta', 20)}<span>Este CPF já está na lista de espera (protocolo ${esc(ja.id)}). Para trocar de escola ou turno, cancele a inscrição atual em <a href="${link('familia/acompanhar.html?tipo=espera')}">Consultar lista de espera</a>.</span></div>` : ''}
        ${avisoObrigatorios}
        <form class="mt-form mt-grade" data-form="espera" novalidate>
          ${campo({ id: 'nome', rotulo: 'Nome completo do estudante', req: true, valor: d.nome, col: 8, attrs: 'maxlength="100" autocomplete="off"' }, erros)}
          ${campo({ id: 'nascimento', rotulo: 'Data de nascimento', req: true, valor: d.nascimento, col: 4, attrs: 'data-campo-data inputmode="numeric" maxlength="10" placeholder="dd/mm/aaaa"' }, erros)}
          ${campo({ id: 'cpf', rotulo: 'CPF do estudante', req: true, valor: d.cpf ? mascaraCpf(d.cpf) : '', col: 4, attrs: 'inputmode="numeric" maxlength="14" placeholder="000.000.000-00" autocomplete="off"' }, erros)}
          ${campo({ id: 'respNome', rotulo: 'Nome do responsável', req: true, valor: d.respNome, col: 8, attrs: 'maxlength="100" autocomplete="name"' }, erros)}
          ${campo({ id: 'telefone', rotulo: 'Telefone', req: true, valor: d.telefone, col: 4, tipo: 'tel', attrs: 'inputmode="tel" maxlength="15" placeholder="(79) 99999-9999" autocomplete="tel"' }, erros)}
          ${campo({ id: 'email', rotulo: 'E-mail', req: true, valor: d.email, tipo: 'email', col: 8, attrs: 'maxlength="80" autocomplete="email"' }, erros)}
          ${campo({ id: 'bairro', rotulo: 'Bairro onde mora', req: true, valor: d.bairro, col: 12, opcoes: bairrosDa(espera.cidade), dica: `Em ${espera.cidade}. A diretoria regional usa o bairro para saber onde abrir vagas` }, erros)}
          <div class="mt-col-12 mt-botoes"><button type="button" class="botao botao-secundario botao-grande" data-ir="vagas">Voltar à consulta de vagas</button><button type="submit" class="botao botao-grande mt-acao">Entrar na lista de espera</button></div>
        </form>`, { id: 'c-espera' })}`;
  }
  function telaEsperaOk() {
    return `<div class="mt-sucesso" role="status"><h1 class="mt-titulo" tabindex="-1">Inscrição na lista de espera feita</h1></div>
      ${resumoDaVaga(espera, { titulo: 'Lista de espera', trocar: false })}
      ${cartao('Sua inscrição', `<dl class="dados-comprovante"><dt>Protocolo</dt><dd><strong class="mt-protocolo">${esc(resultado.protocoloEspera)}</strong></dd><dt>Posição na fila</dt><dd><strong>${resultado.posicao}º</strong> neste turno</dd><dt>Estudante</dt><dd>${esc(d.nome)}</dd></dl>
        <p class="mt-nota">Quando abrir vaga, avisamos por e-mail (${esc(d.email)}) e pelo telefone ${esc(d.telefone)}. A família tem 3 dias para confirmar. Para ver a posição ou cancelar, use Consultar lista de espera com o protocolo e a data de nascimento.</p>`, { id: 'c-esp-ok' })}
      <div class="mt-botoes"><a class="botao botao-secundario botao-grande" href="${link('familia/acompanhar.html?tipo=espera')}">Consultar lista de espera</a><a class="botao botao-grande mt-acao" href="${link('index.html')}">Voltar à página inicial</a></div>`;
  }

  const NARRACAO = {
    inicio: 'Matrícula on-line da rede estadual. Para fazer a matrícula, toque em Consultar vagas e fazer matrícula.',
    vagas: 'Consulta de vagas. Escolha o ano, a etapa de ensino, a cidade e a série. Depois escolha um turno com vaga em uma escola.',
    primeiro: 'Primeiro acesso. Escreva o nome completo do estudante, o nome da mãe ou do pai e a data de nascimento.',
    duplicados: 'Já existe cadastro com esses dados. Confira se é o mesmo estudante.',
    cadastro: 'Cadastro básico. Preencha os dados do estudante. Os campos com asterisco são obrigatórios.',
    responsavel: 'Responsável e endereço. Preencha os dados do responsável, o telefone e o endereço.',
    termos: 'Termos. Responda o termo de vacinação e marque Li e concordo no termo de uso de dados.',
    conferir: 'Confira os dados antes de enviar o pedido.',
    enviado: 'Pedido de matrícula enviado. Guarde o protocolo.',
    espera: 'Lista de espera. Preencha os dados para entrar na fila deste turno.',
    'espera-ok': 'Inscrição na lista de espera feita.'
  };
  const TELAS = { inicio: telaInicio, vagas: telaVagas, primeiro: telaPrimeiro, duplicados: telaDuplicados, cadastro: telaCadastro, responsavel: telaResponsavel, termos: telaTermos, conferir: telaConferir, enviado: telaEnviado, espera: telaEspera, 'espera-ok': telaEsperaOk };

  function desenhar(arg, { focar = 'titulo' } = {}) {
    acoesDoTopo().innerHTML = botaoOuvir(NARRACAO[tela] || '', '');
    main.innerHTML = TELAS[tela](arg);
    if (tela === 'enviado') qrParaElemento(main.querySelector('[data-qr]'), new URL(link(`familia/acompanhar.html?protocolo=${resultado.protocolo}`), location.href).href, 120).then((ok) => { if (!ok) main.querySelector('.mt-qr')?.remove(); });
    const erros = arg && typeof arg === 'object' ? Object.keys(arg).filter((k) => !k.startsWith('_')) : [];
    if (erros.length) { main.querySelector(`#f-${erros[0]}`)?.focus(); return; }
    if (focar === 'titulo') { main.querySelector('h1')?.focus(); window.scrollTo(0, 0); } else main.querySelector(focar)?.focus();
  }
  const ir = (t, arg) => { tela = t; desenhar(arg); };

  // ---------- leitura dos formulários ----------
  const dadosDo = (form) => {
    const r = {};
    for (const el of form.elements) {
      if (!el.name) continue;
      if (el.type === 'radio') { if (el.checked) r[el.name] = el.value; else r[el.name] ??= undefined; } else if (el.type === 'checkbox') r[el.name] = el.checked; else r[el.name] = el.value.trim();
    }
    return r;
  };
  const semMascara = (r) => ({ ...r, ...(r.cpf !== undefined ? { cpf: somenteDigitos(r.cpf) } : {}), ...(r.respCpf !== undefined ? { respCpf: somenteDigitos(r.respCpf) } : {}) });

  async function enviarPedido() {
    const pedidos = await matriculas();
    const erroCpf = M.validarCadastroBasico(d, { hoje, pedidos }).cpf;
    if (erroCpf) throw Object.assign(new Error('CPF'), { mensagem: erroCpf });
    const protocolo = await novoProtocolo('MAT');
    pedidos.unshift({
      protocolo, estudante: d.nome, nascimento: d.nascimento, cpf: d.cpf, responsavel: d.respNome || d.nome, telefone: d.telefone, email: d.email,
      serie: vaga.serie, turno: vaga.turno, tipo: M.tipoPelaOrigem(d.origem) === 'transferencia' ? 'Transferência' : 'Matrícula nova', escolaId: vaga.escolaId,
      municipio: d.municipio, bairro: d.bairro, situacao: 'Aguardando confirmação', data: hojeBR(), meu: true, origem: 'online',
      filiacao1: d.filiacao1, filiacao2: d.filiacao2 || '', sexo: d.sexo, corRaca: d.corRaca, bolsaFamilia: d.bolsaFamilia, nis: somenteDigitos(d.nis || ''), sus: somenteDigitos(d.sus || ''),
      rg: d.rg ? { numero: d.rg, orgao: d.rgOrgao, uf: d.rgUf, emissao: d.rgEmissao || '' } : null, estudouPorUltimo: d.origem,
      responsavelLegal: d.respNome ? { nome: d.respNome, cpf: d.respCpf, nascimento: d.respNascimento || '', parentesco: d.parentesco } : null,
      endereco: { cep: d.cep || '', logradouro: d.logradouro, numero: d.numero, bairro: d.bairro, municipio: d.municipio, uf: 'SE' },
      termos: { vacinacao: d.vacinacao, usoDeDados: 'Li e concordo', em: new Date().toISOString() }
    });
    await salvar('matriculas', pedidos);
    await registrarAcao('Família', 'Pediu matrícula', protocolo);
    return protocolo;
  }

  // ---------- eventos ----------
  main.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.ir) {
      if (b.dataset.ir === 'vagas' && tela === 'inicio') Object.assign(c, { ano: null, nivelId: null, cidade: null, serie: null, busca: '' });
      ir(b.dataset.ir); return;
    }
    if (b.dataset.voltarA) {
      const a = b.dataset.voltarA;
      if (a === 'inicio') { ir('inicio'); return; }
      if (a === 'ano') Object.assign(c, { ano: null, nivelId: null, cidade: null, serie: null });
      if (a === 'cidade') Object.assign(c, { cidade: null, serie: null });
      if (a === 'nivel') Object.assign(c, { nivelId: null, serie: null });
      if (a === 'serie') c.serie = null;
      ir('vagas'); return;
    }
    if (b.dataset.ano) { c.ano = b.dataset.ano; ir('vagas'); return; }
    if (b.dataset.nivel) { c.nivelId = b.dataset.nivel; ir('vagas'); return; }
    if ('abrirCidades' in b.dataset) { escolherCidade(); return; }
    if (b.dataset.serie) { c.serie = b.dataset.serie; c.busca = ''; ir('vagas'); return; }
    if (b.dataset.escolher) { vaga = { escolaId: b.dataset.escolher, serie: c.serie, turno: b.dataset.turno, cidade: c.cidade }; ir('primeiro'); return; }
    if (b.dataset.espera) { espera = { escolaId: b.dataset.espera, serie: c.serie, turno: b.dataset.turno, cidade: c.cidade }; ir('espera'); return; }
    if ('trocarVaga' in b.dataset) { c.serie = vaga?.serie || c.serie; ir('vagas'); return; }
    if ('naoE' in b.dataset) { ir('cadastro'); return; }
    if ('imprimir' in b.dataset) { document.body.classList.add('imprimindo-comprovante'); window.print(); setTimeout(() => document.body.classList.remove('imprimindo-comprovante'), 500); return; }
    if ('enviar' in b.dataset) {
      b.disabled = true; b.setAttribute('aria-busy', 'true');
      try { resultado = { protocolo: await enviarPedido() }; ir('enviado'); } catch (err) { tela = 'conferir'; desenhar(err.mensagem || 'O pedido não foi enviado e nenhuma vaga foi reservada. Confira a conexão e clique em Enviar pedido de novo.'); main.querySelector('#erro-envio')?.scrollIntoView({ block: 'center' }); }
    }
  });

  main.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const r = semMascara(dadosDo(form));
    const tipo = form.dataset.form;
    if (tipo === 'primeiro') {
      Object.assign(d, r);
      const erros = M.validarPrimeiroAcesso(d, { hoje });
      if (Object.keys(erros).length) { desenhar(erros); return; }
      d.filiacao1 = d.filiacao;
      duplicados = M.buscarDuplicados(d, { estudantes: base.estudantes, pedidos: await matriculas(), escolas: base.escolas });
      ir(duplicados.length ? 'duplicados' : 'cadastro');
      return;
    }
    if (tipo === 'cadastro') {
      Object.assign(d, r);
      const erros = M.validarCadastroBasico(d, { hoje, pedidos: await matriculas() });
      if (Object.keys(erros).length) { desenhar(erros); return; }
      ir('responsavel'); return;
    }
    if (tipo === 'responsavel') {
      Object.assign(d, r);
      const erros = M.validarResponsavelEndereco(d, { nascimento: d.nascimento, hoje });
      if (Object.keys(erros).length) { desenhar(erros); return; }
      ir('termos'); return;
    }
    if (tipo === 'termos') {
      Object.assign(d, r);
      const erros = M.validarTermos(d);
      if (Object.keys(erros).length) { desenhar(erros); return; }
      ir('conferir'); return;
    }
    if (tipo === 'espera') {
      Object.assign(d, r);
      const erros = {};
      const p = M.validarPrimeiroAcesso({ nome: d.nome, filiacao: d.respNome, nascimento: d.nascimento }, { hoje });
      if (p.nome) erros.nome = p.nome; if (p.nascimento) erros.nascimento = p.nascimento; if (p.filiacao) erros.respNome = p.filiacao.replace('da mãe ou do pai', 'do responsável');
      const cb = M.validarCadastroBasico({ ...d, filiacao1: 'Nome Completo', sexo: 'Feminino', corRaca: 'Parda', bolsaFamilia: 'Não', origem: M.ORIGENS[0] }, { hoje });
      if (cb.cpf) erros.cpf = cb.cpf; if (cb.email) erros.email = cb.email;
      const rr = M.validarResponsavelEndereco({ telefone: d.telefone, logradouro: '-', numero: '-', bairro: d.bairro, municipio: espera.cidade }, { nascimento: '2000-01-01', hoje });
      if (rr.telefone) erros.telefone = rr.telefone; if (rr.bairro) erros.bairro = rr.bairro;
      if (Object.keys(erros).length) { desenhar(erros); return; }
      const botao = form.querySelector('[type=submit]'); botao.disabled = true; botao.setAttribute('aria-busy', 'true');
      try {
        const lista = await conjunto('lista-espera');
        const ja = M.esperaAtivaDoCpf(lista, d.cpf);
        if (ja) { desenhar({ _ja: ja }); return; }
        const id = await novoProtocolo('ESP');
        lista.unshift({ id, estudante: d.nome, nascimento: d.nascimento, cpf: d.cpf, responsavel: d.respNome, telefone: d.telefone, email: d.email, municipio: espera.cidade, bairro: d.bairro, serie: espera.serie, escolaId: espera.escolaId, turno: espera.turno, quantidade: 1, desde: hoje, situacao: 'Aguardando', origem: 'Portal (família)' });
        await salvar('lista-espera', lista);
        await registrarAcao('Família', 'Entrou na lista de espera', `${id} · ${espera.serie} · ${espera.turno}`);
        resultado = { protocoloEspera: id, posicao: M.posicaoNaEspera(lista, id) };
        ir('espera-ok');
      } catch { botao.disabled = false; botao.removeAttribute('aria-busy'); desenhar({ _erro: true }); }
    }
  });

  // Máscaras enquanto digita e pesquisa de escola.
  main.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'mt-busca') {
      c.busca = t.value;
      const pos = t.selectionStart;
      desenhar(undefined, { focar: '#mt-busca' });
      const campoBusca = main.querySelector('#mt-busca'); campoBusca.setSelectionRange(pos, pos);
      return;
    }
    if (t.name === 'cpf' || t.name === 'respCpf') t.value = mascaraCpf(t.value);
    if (t.name === 'cep') t.value = M.mascaraCep(t.value);
    if (t.name === 'nis') t.value = M.mascaraNis(t.value);
    if (t.name === 'sus') t.value = M.mascaraSus(t.value);
    if (t.name === 'telefone') {
      const n = t.value.replace(/\D/g, '').slice(0, 11);
      t.value = n.length <= 2 ? (n ? `(${n}` : '') : n.length <= 6 ? `(${n.slice(0, 2)}) ${n.slice(2)}` : `(${n.slice(0, 2)}) ${n.slice(2, n.length > 10 ? 7 : 6)}-${n.slice(n.length > 10 ? 7 : 6)}`;
    }
  });
  // Município do endereço muda a lista de bairros.
  main.addEventListener('change', (e) => {
    if (e.target.name === 'municipio' && tela === 'responsavel') {
      Object.assign(d, semMascara(dadosDo(e.target.form)));
      d.bairro = '';
      desenhar(undefined, { focar: '#f-municipio' });
    }
  });

  /** Janela com a lista pesquisável de cidades que têm oferta na etapa escolhida. */
  function escolherCidade() {
    const cidades = M.cidadesComOferta(base.escolas, base.vagasDet, nivel().series);
    const lista = (filtro = '') => cidades.filter((x) => combina(filtro, x)).map((x) => `<li><button type="button" class="mt-opcao mt-opcao-linha" data-cidade="${esc(x)}">${esc(x)}</button></li>`).join('') || '<li class="texto-suave">Nenhuma cidade com esse nome.</li>';
    abrirJanela(`<h2 id="janela-titulo" class="esp-t-0">Em qual cidade deseja estudar?</h2>
      <div class="campo"><label for="cidade-busca">Pesquisar cidade</label><input id="cidade-busca" class="entrada" type="search" autocomplete="off" placeholder="Digite o nome da cidade"></div>
      <p class="texto-pequeno texto-suave">Só aparecem as cidades com escola da rede estadual que oferece ${esc(nivel().curto)}.</p>
      <ul class="mt-lista-cidades" id="cidade-lista">${lista()}</ul>
      <div class="linha-botoes fim"><button type="button" class="botao botao-secundario" data-acao="fechar">Cancelar</button></div>`, {
      foco: '#cidade-busca',
      aoClicar(ev, fechar) {
        const alvo = ev.target.closest('button');
        if (!alvo) return;
        if (alvo.dataset.acao === 'fechar') fechar(null);
        if (alvo.dataset.cidade) fechar(alvo.dataset.cidade);
      }
    }).then((cidade) => { if (cidade) { c.cidade = cidade; ir('vagas'); } });
    const janela = document.querySelector('dialog.janela');
    janela?.querySelector('#cidade-busca').addEventListener('input', (ev) => { janela.querySelector('#cidade-lista').innerHTML = lista(ev.target.value); });
  }

  preparar();
}
