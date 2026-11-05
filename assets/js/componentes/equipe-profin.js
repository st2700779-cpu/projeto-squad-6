// Equipe do PROFIN: coordenação, analistas e apoio. Usada pela tela do PROFIN e pela da rede (SEED), com os mesmos dados.
import { sessao } from '../auth.js';
import { esc, etiqueta, icone, avisar, vazio, comEspera, confirmar, plural } from '../ui.js';
import { conjunto, salvar, registrarAcao, dataDeReferencia } from '../dados.js';
import { FUNCOES_PROFIN, VINCULOS, validarMembroProfin, montarMembroProfin, podeDesativar, coordenadoresAtivos } from '../dominio/cadastros.js';
import { nomeAtualDoVinculo } from '../dominio/vinculos.js';
import { campo, lerFormulario, mostrarErros } from './formulario.js';

const formatarTel = (t) => { const d = String(t || ''); return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : ''; };

export async function montarEquipe(main, falha) {
  let equipe, hoje, aberto = false;
  const carregarTudo = async () => { [equipe, hoje] = await Promise.all([conjunto('equipe-profin'), dataDeReferencia()]); };

  function tabela() {
    if (!equipe.length) return vazio('Ninguém cadastrado', 'Cadastre a coordenação do PROFIN para começar.');
    const ordem = (m) => FUNCOES_PROFIN.indexOf(m.funcao);
    const lista = [...equipe].sort((a, b) => (b.ativo !== false) - (a.ativo !== false) || ordem(a) - ordem(b) || a.nome.localeCompare(b.nome, 'pt-BR'));
    return `<div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes"><caption class="sr-only">Equipe do PROFIN</caption>
      <thead><tr><th scope="col">Nome</th><th scope="col">Função e vínculo</th><th scope="col">Contato</th><th scope="col">Atende</th><th scope="col">Situação</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead>
      <tbody>${lista.map((m) => `<tr><td class="titulo-linha"><strong>${esc(m.nome)}</strong><br><span class="texto-suave texto-pequeno">Matrícula ${esc(m.matricula)}</span></td>
        <td data-rotulo="Função e vínculo"><div>${etiqueta(m.funcao, m.funcao === 'Coordenação do PROFIN' ? 'info' : 'neutra')}<br><span class="texto-suave texto-pequeno">${m.vinculo ? esc(nomeAtualDoVinculo(m.vinculo)) : 'Vínculo não informado'}</span></div></td>
        <td data-rotulo="Contato"><div>${esc(m.email)}${m.telefone ? `<br><span class="texto-suave texto-pequeno">${esc(formatarTel(m.telefone))}</span>` : ''}</div></td>
        <td data-rotulo="Atende"><div>${esc(m.atende)}</div></td>
        <td data-rotulo="Situação"><div>${m.ativo === false ? etiqueta('Desativado', 'neutra') : etiqueta('Ativo', 'ok')}</div></td>
        <td class="acoes"><button type="button" class="botao botao-secundario botao-mini" data-alternar="${m.id}">${m.ativo === false ? 'Reativar' : 'Desativar'}</button></td></tr>`).join('')}</tbody></table></div>
      <p class="contagem">${equipe.filter((m) => m.ativo !== false).length} ${plural(equipe.filter((m) => m.ativo !== false).length, 'pessoa ativa', 'pessoas ativas')} · ${equipe.length} no total</p>`;
  }

  function formulario() {
    return `<form id="form-membro" class="form-cadastro" novalidate ${aberto ? '' : 'hidden'} aria-labelledby="mb-titulo">
      <h2 id="mb-titulo">Cadastrar na equipe do PROFIN</h2>
      <p class="texto-suave esp-t-0">Campos com <span class="obrigatorio" aria-hidden="true">*</span> são obrigatórios. O acesso ao portal é criado pela equipe técnica depois do cadastro.</p>
      <fieldset class="form-bloco"><legend>Dados da pessoa</legend>
        <div class="largo">${campo({ nome: 'nome', rotulo: 'Nome completo', obrigatorio: true, atributos: 'maxlength="120" autocomplete="off"' })}</div>
        ${campo({ nome: 'funcao', rotulo: 'Função na equipe', obrigatorio: true, opcoes: [['', 'Escolha a função'], ...FUNCOES_PROFIN.map((f) => [f, f])] })}
        ${campo({ nome: 'vinculo', rotulo: 'Tipo de vínculo', obrigatorio: true, dica: 'A lista é mantida pela SEED em Rede › Cadastros.', opcoes: [['', 'Escolha o vínculo'], ...VINCULOS.map((v) => [v, v])] })}
        ${campo({ nome: 'matricula', rotulo: 'Matrícula funcional', dica: 'Exemplo: PF-41007', obrigatorio: true, atributos: 'maxlength="8" autocomplete="off"' })}
        ${campo({ nome: 'email', rotulo: 'E-mail institucional', tipo: 'email', obrigatorio: true, dica: 'Exemplo: nome@seed.se.gov.br', atributos: 'autocomplete="off"' })}
        ${campo({ nome: 'telefone', rotulo: 'Telefone', tipo: 'tel', dica: 'Com DDD. Opcional', atributos: 'inputmode="tel" autocomplete="off"' })}
        <div class="largo">${campo({ nome: 'atende', rotulo: 'Escolas ou DREs que atende', obrigatorio: true, dica: 'Exemplo: DRE de Lagarto, ou Todas as escolas da rede', atributos: 'maxlength="120" autocomplete="off"' })}</div>
      </fieldset>
      <div class="form-acoes"><button type="submit" class="botao">${icone('ok', 20)}Cadastrar</button><button type="button" class="botao botao-secundario" id="cancelar-membro">Cancelar</button></div></form>`;
  }

  function desenhar() {
    const coord = coordenadoresAtivos(equipe);
    main.innerHTML = `
      <div class="cabecalho-pagina"><h1>Equipe do PROFIN</h1></div>
      <p class="pagina-descricao">Quem coordena e analisa a prestação de contas das escolas. As análises das declarações de gastos são assinadas por pessoas desta lista.</p>
      <dl class="resumo-linha">
        <div class="${coord.length ? '' : 'alerta'}"><dd>${coord.length}</dd><dt>${plural(coord.length, 'pessoa na coordenação', 'pessoas na coordenação')}</dt></div>
        <div><dd>${equipe.filter((m) => m.funcao === 'Analista financeiro' && m.ativo !== false).length}</dd><dt>analistas ativos</dt></div>
      </dl>
      <div class="linha-botoes esp-b-3"><button type="button" class="botao" id="novo-membro">${icone('pessoas', 20)}Cadastrar na equipe</button></div>
      ${formulario()}
      ${tabela()}`;
  }

  async function mostrar() { try { await carregarTudo(); desenhar(); } catch { falha(main, mostrar); } }

  main.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'novo-membro') { aberto = true; desenhar(); const f = main.querySelector('#form-membro'); f.querySelector('input').focus(); f.scrollIntoView({ block: 'start' }); }
    if (b.id === 'cancelar-membro') { aberto = false; desenhar(); main.querySelector('#novo-membro').focus(); }
    if (b.dataset.alternar) {
      const m = equipe.find((x) => x.id === b.dataset.alternar);
      if (m.ativo !== false) {
        const r = podeDesativar(equipe, m.id);
        if (!r.ok) { avisar(r.motivo, 'erro'); return; }
        if (!(await confirmar({ titulo: 'Desativar esta pessoa?', texto: `${m.nome} deixa de aparecer como responsável por novas análises. Os pareceres já assinados continuam.`, botao: 'Desativar', perigo: true }))) return;
      }
      try {
        m.ativo = m.ativo === false;
        await salvar('equipe-profin', equipe);
        await registrarAcao(sessao().nome, m.ativo ? 'Reativou na equipe do PROFIN' : 'Desativou na equipe do PROFIN', m.nome);
        desenhar(); avisar(m.ativo ? 'Pessoa reativada.' : 'Pessoa desativada.');
      } catch { avisar('Não foi possível salvar a mudança. Confira a conexão e tente de novo.'); mostrar(); }
    }
  });
  main.addEventListener('submit', async (e) => {
    if (e.target.id !== 'form-membro') return;
    e.preventDefault();
    const dados = lerFormulario(e.target);
    if (!mostrarErros(e.target, validarMembroProfin(dados, { equipe }).erros)) { avisar('Confira os campos marcados em vermelho.', 'erro'); return; }
    try {
      await comEspera(e.submitter, async () => {
        const novo = montarMembroProfin(dados, { equipe, hoje });
        equipe.push(novo);
        await salvar('equipe-profin', equipe);
        await registrarAcao(sessao().nome, `Cadastrou na equipe do PROFIN (${novo.funcao})`, novo.nome);
      });
      aberto = false; desenhar(); avisar('Pessoa cadastrada na equipe do PROFIN.');
    } catch { avisar('Não foi possível cadastrar. Confira a conexão e tente de novo.'); mostrar(); }
  });
  await mostrar();
}
