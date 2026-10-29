// Testes das regras de cadastro (escola e ato, professor, equipe do PROFIN, carga horária) e da prestação de contas
// (declaração dos gastos e retorno do PROFIN).
// Uso (Node 22+, sem instalar nada):  node tools/testar-cadastros.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validarEdicaoDeEscola, aplicarEdicaoDeEscola, validarRenovacaoDeAto, aplicarRenovacaoDeAto, validarEdicaoDeProfessor, aplicarEdicaoDeProfessor, podeDesligar, turmasQueDeixa, semAlocacoesDe, cpfValido, validarEscola, montarEscola, validarProfessor, montarProfessor, validarMembroProfin, montarMembroProfin, podeDesativar, cargaAnualHoras, situacaoDaCarga, validarCarga, cargaPadrao, seriesDaEtapa, ETAPAS, mascararCpf } from '../assets/js/dominio/cadastros.js';
import { validarRepasse, aplicarRepasses, podeEstornar, validarEstorno, aplicarEstorno, validarLancamento, validarDeclaracao, validarRetorno, aplicarDeclaracoes, valorAprovado, totalDosLancamentos, situacaoDaDeclaracao } from '../assets/js/dominio/prestacao.js';
import { adimplenciaDaEscola, situacaoDaPrestacao } from '../assets/js/dominio/profin.js';
import { validarTrocaDeSenha, forcaDaSenha, podeRedefinir, contasDoOperador, gerarSenhaTemporaria } from '../assets/js/dominio/senha.js';
import { validarPlano, montarPlano, normalizarCodigos, codigoCombinaComSerie, CODIGO_BNCC, EXEMPLOS_DE_CODIGOS } from '../assets/js/dominio/plano-aula.js';
import { chaveDoAviso, marcarLidos, lidosDe, naoLidos, isoDoAviso } from '../assets/js/dominio/avisos.js';
import { situacaoDoEstudante, estudantesInativos, validarTransferencia, validarCancelamento, montarMovimentacao, pedidoDeTransferencia, podeDesfazer, ajusteDeVagas, aplicarAjusteDeVagas } from '../assets/js/dominio/movimentacao.js';
import { situacaoAto } from '../assets/js/dominio/matricula.js';
import { definirDataBase, hojeISO, diasEntreDatas } from '../assets/js/dominio/hoje.js';
import { calcularVagas, vagasPorSerie, lugaresLivres, pedidoSeguraVaga, validarTurmaNova, montarTurmaNova } from '../assets/js/dominio/vagas.js';
import { procuraPorBairro, somarPorMunicipio, faixaDaRazao, validarEntradaNaEspera } from '../assets/js/dominio/demanda.js';
import { atoDaEtapa, motivoBloqueio, SERIES } from '../assets/js/dominio/matricula.js';
import { validarCurso, montarCurso, podeDesativarCurso, municipioDaDre, seriesEscolhidas, validarSeriesDaEscola, aplicarSeriesAosAtos, atosDoNivel } from '../assets/js/dominio/cadastros.js';
import { validarRegistroDeAula, montarRegistroDeAula, datasSemRegistro, validarJustificativa, montarJustificativa, validarDecisao, aplicarDecisao, ordenarJustificativas, diasDoPeriodo, abonosPorEstudante, aplicarAbonos, situacaoDosRegistros, turmasSemRegistro } from '../assets/js/dominio/vida-escolar.js';

const dado = (n) => JSON.parse(readFileSync(new URL(`../data/${n}.json`, import.meta.url), 'utf8'));
const HOJE = '2026-10-07';
let n = 0;
const t = (nome, fn) => { fn(); n += 1; console.log(`ok  ${nome}`); };

const escolas = dado('escolas');
const profs = dado('professores');
const base = { nome: 'Escola Estadual Nova Esperança', inep: '28123456', municipio: 'Lagarto', dre: 'DRE 2 — Lagarto', logradouro: 'Rua das Palmeiras', numero: '120', bairro: 'Centro', cep: '49400-000', telefone: '(79) 3333-4444', email: 'nova.esperanca@escola.se.gov.br', atoTipo: 'Criação de escola', atoNumero: 'Resolução CEE nº 100/2026', atoPublicacao: '2026-08-10', atoVencimento: '2031-08-10', origemId: '', etapas: ['Ensino Fundamental — Anos Finais'] };

t('CPF: dígitos verificadores e sequências repetidas', () => {
  assert.equal(cpfValido('529.982.247-25'), true); assert.equal(cpfValido('52998224725'), true);
  assert.equal(cpfValido('529.982.247-24'), false); assert.equal(cpfValido('111.111.111-11'), false); assert.equal(cpfValido('123'), false);
  assert.equal(mascararCpf('52998224725'), '***.982.247-**');
});
t('cada nível libera as suas séries', () => {
  assert.deepEqual(seriesDaEtapa('Ensino Fundamental — Anos Iniciais'), ['1º ano', '2º ano', '3º ano', '4º ano', '5º ano']);
  assert.deepEqual(seriesDaEtapa('Ensino Fundamental — Anos Finais'), ['6º ano', '7º ano', '8º ano', '9º ano']);
  assert.deepEqual(seriesDaEtapa('Ensino Médio'), ['1ª série EM', '2ª série EM', '3ª série EM']);
  assert.deepEqual(seriesDaEtapa('inexistente'), []);
  // as etapas do cadastro são as mesmas dos atos já existentes
  for (const a of dado('atos')) assert.ok(ETAPAS.some((e) => e.etapa === a.etapa), a.etapa);
});
t('escola: cadastro válido passa e gera escola, um ato por nível e vagas zeradas', () => {
  const r = validarEscola({ ...base, etapas: ['Ensino Fundamental — Anos Finais', 'Ensino Médio'] }, { escolas, hoje: HOJE });
  assert.equal(r.ok, true, JSON.stringify(r.erros));
  const m = montarEscola({ ...base, etapas: ['Ensino Fundamental — Anos Finais', 'Ensino Médio'] }, { escolas, coordenadas: { lat: -10.9, lng: -37.6 }, hoje: HOJE });
  assert.equal(m.escola.id, 'e6'); assert.equal(m.escola.inep, '28123456'); assert.match(m.escola.endereco, /Rua das Palmeiras, 120 — Centro — CEP 49400-000/);
  assert.equal(m.atos.length, 2); assert.ok(m.atos.every((a) => a.escolaId === 'e6' && a.validade === '2031-08-10'));
  assert.equal(Object.keys(m.vagas).length, 7); assert.ok(Object.values(m.vagas).every((v) => v === 0));
});
t('escola: campos obrigatórios, vencimento depois da publicação e ato vencido', () => {
  const vazio = validarEscola({ etapas: [] }, { escolas, hoje: HOJE });
  for (const c of ['nome', 'inep', 'municipio', 'dre', 'logradouro', 'bairro', 'cep', 'atoTipo', 'atoNumero', 'atoPublicacao', 'atoVencimento', 'etapas']) assert.ok(vazio.erros[c], `falta erro de ${c}`);
  assert.ok(validarEscola({ ...base, atoVencimento: '2026-08-01' }, { escolas, hoje: HOJE }).erros.atoVencimento);
  assert.match(validarEscola({ ...base, atoPublicacao: '2020-01-01', atoVencimento: '2026-01-01' }, { escolas, hoje: HOJE }).erros.atoVencimento, /venceu/);
  assert.ok(validarEscola({ ...base, atoPublicacao: '2027-01-01' }, { escolas, hoje: HOJE }).erros.atoPublicacao);
  assert.ok(validarEscola({ ...base, cep: '1234' }, { escolas, hoje: HOJE }).erros.cep);
  assert.ok(validarEscola({ ...base, email: 'sem-arroba' }, { escolas, hoje: HOJE }).erros.email);
  assert.equal(validarEscola({ ...base, email: '', telefone: '' }, { escolas, hoje: HOJE }).ok, true, 'telefone e e-mail são opcionais');
});
t('escola: nome repetido no município e INEP repetido são recusados', () => {
  assert.ok(validarEscola({ ...base, nome: escolas[0].nome.toUpperCase(), municipio: escolas[0].municipio }, { escolas, hoje: HOJE }).erros.nome);
  assert.equal(validarEscola({ ...base, nome: escolas[0].nome, municipio: 'Lagarto' }, { escolas, hoje: HOJE }).erros.nome, undefined, 'mesmo nome em outro município pode');
  const comInep = [...escolas, { id: 'e9', nome: 'X', municipio: 'Y', inep: '28123456' }];
  assert.ok(validarEscola(base, { escolas: comInep, hoje: HOJE }).erros.inep);
});
t('escola: divisão de escola exige a escola de origem', () => {
  const div = { ...base, atoTipo: 'Divisão de escola' };
  assert.ok(validarEscola(div, { escolas, hoje: HOJE }).erros.origemId);
  assert.ok(validarEscola({ ...div, origemId: 'e99' }, { escolas, hoje: HOJE }).erros.origemId);
  assert.equal(validarEscola({ ...div, origemId: 'e1' }, { escolas, hoje: HOJE }).ok, true);
  assert.equal(montarEscola({ ...div, origemId: 'e1' }, { escolas, coordenadas: { lat: 0, lng: 0 }, hoje: HOJE }).atos[0].origemId, 'e1');
  assert.equal(montarEscola(base, { escolas, coordenadas: { lat: 0, lng: 0 }, hoje: HOJE }).escola.origemId, null);
});

const prof = { nome: 'Marcos Antônio Rezende Lima', cpf: '529.982.247-25', matriculaFuncional: 'PF-30999', vinculo: 'Efetivo', formacao: 'Licenciatura em Matemática', habilitacao: ['Matemática'], cargaHorariaSemanal: 20, escolaId: 'e1', email: 'marcos@seed.se.gov.br', telefone: '79988887777' };
const componentes = ['Matemática', 'Língua Portuguesa', 'Física'];
t('professor: cadastro válido, id novo e lotação na escola', () => {
  const r = validarProfessor(prof, { professores: profs, escolas, componentes });
  assert.equal(r.ok, true, JSON.stringify(r.erros));
  const novo = montarProfessor(prof, { professores: profs, hoje: HOJE });
  assert.equal(novo.id, `p${profs.length + 1}`); assert.equal(novo.escolaId, 'e1'); assert.deepEqual(novo.habilitacao, ['Matemática']); assert.equal(novo.cpf, '52998224725');
});
t('professor: obrigatórios, CPF, matrícula e habilitação', () => {
  const v = validarProfessor({ habilitacao: [] }, { professores: profs, escolas, componentes });
  for (const c of ['nome', 'cpf', 'matriculaFuncional', 'vinculo', 'formacao', 'habilitacao', 'cargaHorariaSemanal', 'escolaId']) assert.ok(v.erros[c], c);
  assert.ok(validarProfessor({ ...prof, cpf: '111.111.111-11' }, { professores: profs, escolas, componentes }).erros.cpf);
  assert.ok(validarProfessor({ ...prof, matriculaFuncional: profs[0].matriculaFuncional }, { professores: profs, escolas, componentes }).erros.matriculaFuncional);
  assert.ok(validarProfessor({ ...prof, matriculaFuncional: '30999' }, { professores: profs, escolas, componentes }).erros.matriculaFuncional);
  assert.ok(validarProfessor({ ...prof, habilitacao: ['Astrologia'] }, { professores: profs, escolas, componentes }).erros.habilitacao);
  assert.ok(validarProfessor({ ...prof, nome: 'Marcos' }, { professores: profs, escolas, componentes }).erros.nome);
  assert.ok(validarProfessor({ ...prof, cargaHorariaSemanal: 25 }, { professores: profs, escolas, componentes }).erros.cargaHorariaSemanal);
  const comCpf = [...profs, { ...profs[0], cpf: '52998224725', matriculaFuncional: 'PF-1' }];
  assert.match(validarProfessor(prof, { professores: comCpf, escolas, componentes }).erros.cpf, /já está/);
});

const equipe = dado('equipe-profin');
const membro = { nome: 'Patrícia Gomes Valadares', funcao: 'Analista financeiro', matricula: 'PF-41007', email: 'patricia.valadares@seed.se.gov.br', telefone: '79999990000', atende: 'DRE de Itabaiana' };
t('equipe do PROFIN: cadastro, duplicidade e coordenação sempre presente', () => {
  assert.equal(validarMembroProfin(membro, { equipe }).ok, true);
  assert.equal(montarMembroProfin(membro, { equipe, hoje: HOJE }).id, `m${equipe.length + 1}`);
  assert.ok(validarMembroProfin({ ...membro, matricula: 'PF-41001' }, { equipe }).erros.matricula);
  assert.ok(validarMembroProfin({ ...membro, email: equipe[0].email.toUpperCase() }, { equipe }).erros.email);
  assert.ok(validarMembroProfin({ ...membro, email: 'x' }, { equipe }).erros.email);
  assert.ok(validarMembroProfin({ ...membro, funcao: 'Chefe' }, { equipe }).erros.funcao);
  assert.ok(validarMembroProfin({ ...membro, atende: '' }, { equipe }).erros.atende);
  const coord = equipe.find((m) => m.funcao === 'Coordenação do PROFIN');
  assert.equal(podeDesativar(equipe, coord.id).ok, false, 'a última coordenação não pode ser desativada');
  assert.equal(podeDesativar([...equipe, { ...coord, id: 'm9', matricula: 'PF-1', email: 'a@b.cc' }], coord.id).ok, true);
  assert.equal(podeDesativar(equipe, equipe.find((m) => m.funcao === 'Analista financeiro').id).ok, true);
});

t('carga horária: 25 aulas de 50 min em 40 semanas dão 833 h; o mínimo do Fundamental é 800 h e o do Médio, 1000 h', () => {
  assert.equal(cargaAnualHoras({ aulasSemana: 25, minutosAula: 50 }), 833);
  assert.equal(cargaAnualHoras({ aulasSemana: 30, minutosAula: 50 }), 1000);
  assert.equal(situacaoDaCarga('Ensino Fundamental — Anos Finais', { aulasSemana: 24, minutosAula: 50 }).ok, true);
  assert.equal(situacaoDaCarga('Ensino Fundamental — Anos Finais', { aulasSemana: 23, minutosAula: 50 }).ok, false);
  assert.equal(situacaoDaCarga('Ensino Médio', { aulasSemana: 29, minutosAula: 50 }).ok, false);
  assert.equal(situacaoDaCarga('Ensino Médio', { aulasSemana: 29, minutosAula: 50 }).falta, 33);
  assert.equal(validarCarga({ aulasSemana: 25, minutosAula: 50 }).ok, true);
  assert.ok(validarCarga({ aulasSemana: 5, minutosAula: 50 }).erros.aulasSemana); assert.ok(validarCarga({ aulasSemana: 25, minutosAula: 90 }).erros.minutosAula);
  const padrao = cargaPadrao();
  assert.equal(padrao.length, 12); assert.ok(padrao.every((l) => situacaoDaCarga(l.etapa, l).ok), 'o padrão cumpre o mínimo');
  assert.deepEqual(dado('carga-horaria'), padrao, 'data/carga-horaria.json segue o padrão');
});

const repasses = dado('profin').repasses;
const rep = (escolaId, categoria) => repasses.find((r) => r.escolaId === escolaId && r.categoria === categoria);
const lanc = { data: '2026-09-12', descricao: 'Material de limpeza', fornecedor: 'Limpa Tudo Ltda', documento: 'NF 100', natureza: 'Material de consumo', valor: 500, comprovante: { nome: 'nf-100.pdf', tamanho: 1000 } };
t('lançamento: campos obrigatórios, data no ano e fora do futuro, valor positivo, comprovante PDF/JPG/PNG até 5 MB', () => {
  assert.equal(validarLancamento(lanc, { hoje: HOJE }).ok, true);
  const v = validarLancamento({}, { hoje: HOJE }); for (const c of ['data', 'descricao', 'fornecedor', 'documento', 'valor', 'natureza', 'comprovante']) assert.ok(v.erros[c], c);
  assert.ok(validarLancamento({ ...lanc, data: '2026-10-20' }, { hoje: HOJE }).erros.data);
  assert.ok(validarLancamento({ ...lanc, data: '2025-12-31' }, { hoje: HOJE }).erros.data);
  assert.ok(validarLancamento({ ...lanc, valor: 0 }, { hoje: HOJE }).erros.valor); assert.ok(validarLancamento({ ...lanc, valor: -5 }, { hoje: HOJE }).erros.valor); assert.ok(validarLancamento({ ...lanc, valor: 10.123 }, { hoje: HOJE }).erros.valor);
  assert.ok(validarLancamento({ ...lanc, comprovante: { nome: 'nf.exe', tamanho: 10 } }, { hoje: HOJE }).erros.comprovante);
  assert.ok(validarLancamento({ ...lanc, comprovante: { nome: 'nf.pdf', tamanho: 6 * 1024 * 1024 } }, { hoje: HOJE }).erros.comprovante);
});
t('declaração: soma, saldo disponível, categoria sem repasse e nota repetida', () => {
  const r = rep('e1', 'Custeio'); // saldo 7.369,50
  const d = { categoria: 'Custeio', competencia: '2026-09', lancamentos: [lanc, { ...lanc, documento: 'NF 101', valor: 700.25 }] };
  assert.equal(totalDosLancamentos(d.lancamentos), 1200.25);
  assert.equal(validarDeclaracao(d, { repasse: r, outras: [], hoje: HOJE }).ok, true);
  assert.ok(validarDeclaracao({ ...d, lancamentos: [{ ...lanc, valor: 8000 }] }, { repasse: r, outras: [], hoje: HOJE }).geral.some((m) => /saldo/.test(m)));
  assert.ok(validarDeclaracao({ ...d, lancamentos: [] }, { repasse: r, outras: [], hoje: HOJE }).geral.some((m) => /pelo menos um gasto/.test(m)));
  assert.ok(validarDeclaracao({ ...d, competencia: '' }, { repasse: r, outras: [], hoje: HOJE }).geral.some((m) => /mês/.test(m)));
  assert.ok(validarDeclaracao(d, { repasse: rep('e2', 'Emenda Parlamentar'), outras: [], hoje: HOJE }).geral.some((m) => /não recebeu repasse/.test(m)));
  const repetida = validarDeclaracao({ ...d, lancamentos: [lanc, lanc] }, { repasse: r, outras: [], hoje: HOJE });
  assert.ok(repetida.porLinha[1].documento, 'a segunda nota igual é recusada'); assert.equal(repetida.ok, false);
  const jaEnviada = { id: 'DG-1', situacao: 'Enviada', total: 500, lancamentos: [lanc] };
  assert.ok(validarDeclaracao({ ...d, lancamentos: [lanc] }, { repasse: r, outras: [jaEnviada], hoje: HOJE }).porLinha[0].documento);
  // saldo já consumido por declaração em análise
  const grande = { id: 'DG-2', situacao: 'Enviada', total: 7000, lancamentos: [{ ...lanc, documento: 'X' }] };
  assert.ok(validarDeclaracao({ ...d, lancamentos: [{ ...lanc, documento: 'NF 300', valor: 500 }] }, { repasse: r, outras: [grande], hoje: HOJE }).geral.some((m) => /saldo/.test(m)));
  // devolvida não consome saldo e a mesma declaração pode ser reenviada
  assert.equal(validarDeclaracao(d, { repasse: r, outras: [{ ...grande, situacao: 'Devolvida' }], hoje: HOJE }).ok, true);
});
t('retorno do PROFIN: parecer, itens glosados e coerência com o resultado', () => {
  const d = { lancamentos: [lanc, { ...lanc, documento: 'NF 2' }] };
  const ok = { tipo: 'aprovada', responsavel: 'Rogério', parecer: 'Documentos conferidos e compatíveis.', glosas: [] };
  assert.equal(validarRetorno(ok, d).ok, true);
  assert.ok(validarRetorno({ ...ok, parecer: 'ok' }, d).erros.parecer);
  assert.ok(validarRetorno({ ...ok, responsavel: '' }, d).erros.responsavel);
  assert.ok(validarRetorno({ ...ok, glosas: [{ indice: 0, motivo: 'Sem CNPJ' }] }, d).erros.tipo, 'aprovada limpa não pode ter item glosado');
  assert.ok(validarRetorno({ ...ok, tipo: 'ressalvas' }, d).erros.tipo, 'ressalvas pede item glosado');
  assert.equal(validarRetorno({ ...ok, tipo: 'ressalvas', glosas: [{ indice: 1, motivo: 'Sem CNPJ do prestador' }] }, d).ok, true);
  assert.ok(validarRetorno({ ...ok, tipo: 'ressalvas', glosas: [{ indice: 0, motivo: 'Sem CNPJ' }, { indice: 1, motivo: 'Sem CNPJ' }] }, d).erros.tipo, 'tudo glosado: devolver');
  assert.ok(validarRetorno({ ...ok, tipo: 'ressalvas', glosas: [{ indice: 1, motivo: 'x' }] }, d).erros.glosas, 'glosa sem motivo');
  assert.ok(validarRetorno({ ...ok, tipo: 'devolvida' }, d).erros.pendencia, 'devolver exige dizer o que corrigir');
  assert.equal(validarRetorno({ ...ok, tipo: 'devolvida', pendencia: 'Anexar nota fiscal legível do item 2.' }, d).ok, true);
  assert.ok(validarRetorno({ ...ok, tipo: 'qualquer' }, d).erros.tipo);
});
t('valor aprovado desconta os itens glosados e só vale para declaração aprovada', () => {
  const ds = dado('declaracoes-gastos');
  const ress = ds.find((d) => d.situacao === 'Aprovada com ressalvas'); assert.equal(ress.total, 340); assert.equal(valorAprovado(ress), 190);
  assert.equal(valorAprovado(ds.find((d) => d.situacao === 'Aprovada')), 1250);
  assert.equal(valorAprovado(ds.find((d) => d.situacao === 'Devolvida')), 0); assert.equal(valorAprovado(ds.find((d) => d.situacao === 'Enviada')), 0);
  for (const d of ds) { assert.equal(totalDosLancamentos(d.lancamentos), d.total, d.id); assert.ok(situacaoDaDeclaracao(d).texto, 'toda situação tem texto'); }
});
t('declarações entram no painel: aprovada soma ao executado, enviada conta como entregue e devolvida volta a ficar pendente', () => {
  const ds = dado('declaracoes-gastos');
  const novo = aplicarDeclaracoes(repasses, ds);
  assert.equal(novo.length, repasses.length);
  const e2 = novo.find((r) => r.escolaId === 'e2' && r.categoria === 'Custeio'); assert.equal(e2.executado, 37350); assert.equal(e2.prestacao.entregue, true);
  const e5 = novo.find((r) => r.escolaId === 'e5' && r.categoria === 'Merenda'); assert.equal(e5.executado, 19610); assert.ok(e5.executado <= e5.recebido);
  const e1c = novo.find((r) => r.escolaId === 'e1' && r.categoria === 'Custeio'); assert.equal(e1c.emAnalise, 3420.5); assert.equal(rep('e1', 'Custeio').prestacao.entregue, false); assert.equal(e1c.prestacao.entregue, true);
  const e1e = novo.find((r) => r.escolaId === 'e1' && r.categoria === 'Emenda Parlamentar'); assert.equal(e1e.devolvida, true); assert.equal(e1e.prestacao.entregue, false);
  // o original não é alterado
  assert.equal(rep('e2', 'Custeio').executado, 36100);
  // e1 Custeio estava "não entregue" no arquivo-base; com a declaração enviada deixa de estar vermelha/amarela por falta de entrega
  assert.equal(situacaoDaPrestacao(rep('e1', 'Custeio'), HOJE).chave, 'amarelo');
  assert.equal(situacaoDaPrestacao(e1c, HOJE).chave, 'verde');
  // devolvida com prazo vencido: atrasada
  assert.equal(situacaoDaPrestacao(e1e, HOJE).chave, 'vermelho');
  assert.equal(adimplenciaDaEscola(novo.filter((r) => r.escolaId === 'e1'), HOJE).chave, 'vermelho');
});

t('troca de senha: atual correta, nova forte, diferente, sem o usuário e confirmada', () => {
  const ctx = { atualCorreta: true, login: 'RESP-20417' };
  assert.equal(validarTrocaDeSenha({ atual: 'x', nova: 'abc12345', confirmacao: 'abc12345' }, ctx).ok, true);
  assert.ok(validarTrocaDeSenha({ atual: '', nova: 'abc12345', confirmacao: 'abc12345' }, ctx).erros.atual);
  assert.ok(validarTrocaDeSenha({ atual: 'x', nova: 'abc12345', confirmacao: 'abc12345' }, { ...ctx, atualCorreta: false }).erros.atual);
  assert.ok(validarTrocaDeSenha({ atual: 'x', nova: 'abc123', confirmacao: 'abc123' }, ctx).erros.nova, 'curta');
  assert.ok(validarTrocaDeSenha({ atual: 'x', nova: 'abcdefgh', confirmacao: 'abcdefgh' }, ctx).erros.nova, 'sem número');
  assert.ok(validarTrocaDeSenha({ atual: 'abc12345', nova: 'abc12345', confirmacao: 'abc12345' }, ctx).erros.nova, 'igual à atual');
  assert.ok(validarTrocaDeSenha({ atual: 'x', nova: 'resp-20417a1', confirmacao: 'resp-20417a1' }, ctx).erros.nova, 'contém o usuário');
  assert.ok(validarTrocaDeSenha({ atual: 'x', nova: 'abc12345', confirmacao: 'abc12346' }, ctx).erros.confirmacao);
  assert.deepEqual([forcaDaSenha('').nivel, forcaDaSenha('abc').nivel, forcaDaSenha('abcdefgh1').nivel, forcaDaSenha('abcdefgh1!').nivel], [0, 0, 2, 3]);
});
t('data de hoje da demonstração: ato vence no dia da validade e vence de verdade no dia seguinte', () => {
  definirDataBase('2026-10-07');
  assert.equal(hojeISO(), '2026-10-07');
  assert.equal(diasEntreDatas('2026-10-07', '2026-10-17'), 10);
  assert.equal(situacaoAto({ validade: '2026-10-07' }).vigente, true); assert.equal(situacaoAto({ validade: '2026-10-07' }).texto, 'Vence hoje');
  assert.equal(situacaoAto({ validade: '2026-10-06' }).vigente, false);
  assert.equal(situacaoAto({ validade: '2026-10-08' }).texto, 'Vence em 1 dia');
  assert.equal(situacaoAto({ validade: '2027-12-31' }).texto, 'Vigente');
  assert.equal(situacaoAto({ validade: '2026-10-08' }, '2026-10-09').vigente, false, 'a data pode ser passada por parâmetro');
  definirDataBase('data-ruim'); assert.match(hojeISO(), /^\d{4}-\d{2}-\d{2}$/); definirDataBase(null);
});
t('editar escola: não deixa nome ou INEP repetirem e mantém o que não muda', () => {
  const e1 = escolas[0], e2 = escolas[1];
  const f = { nome: e1.nome, inep: e1.inep || '', municipio: e1.municipio, dre: e1.dre, endereco: 'Rua Nova, 100', bairro: 'Centro', telefone: '(79) 3333-4444', email: 'escola@escola.se.gov.br' };
  assert.equal(validarEdicaoDeEscola(f, { escolas, id: e1.id }).ok, true);
  assert.ok(validarEdicaoDeEscola({ ...f, nome: e2.nome, municipio: e2.municipio }, { escolas, id: e1.id }).erros.nome, 'nome de outra escola');
  assert.ok(validarEdicaoDeEscola({ ...f, inep: '123' }, { escolas, id: e1.id }).erros.inep);
  assert.ok(validarEdicaoDeEscola({ ...f, email: 'sem-arroba' }, { escolas, id: e1.id }).erros.email);
  assert.ok(validarEdicaoDeEscola({ ...f, endereco: '' }, { escolas, id: e1.id }).erros.endereco);
  const novo = aplicarEdicaoDeEscola(e1, f, HOJE);
  assert.equal(novo.id, e1.id); assert.equal(novo.endereco, 'Rua Nova, 100'); assert.equal(novo.atualizadaEm, HOJE); assert.equal(novo.telefone, '7933334444');
});
t('registrar ato renovado: novo número, publicação passada e vencimento depois do atual', () => {
  const ato = { numero: 'Resolução CEE nº 10/2021', validade: '2026-12-18' };
  const ok = { numero: 'Resolução CEE nº 200/2026', publicacao: '2026-10-01', vencimento: '2031-12-18' };
  assert.equal(validarRenovacaoDeAto(ok, { atoAtual: ato, hoje: HOJE }).ok, true);
  assert.ok(validarRenovacaoDeAto({ ...ok, numero: ato.numero }, { atoAtual: ato, hoje: HOJE }).erros.numero);
  assert.ok(validarRenovacaoDeAto({ ...ok, publicacao: '2026-11-01' }, { atoAtual: ato, hoje: HOJE }).erros.publicacao, 'publicação no futuro');
  assert.ok(validarRenovacaoDeAto({ ...ok, vencimento: '2026-12-18' }, { atoAtual: ato, hoje: HOJE }).erros.vencimento, 'não passa do vencimento atual');
  assert.ok(validarRenovacaoDeAto({ ...ok, vencimento: '2026-09-01' }, { atoAtual: ato, hoje: HOJE }).erros.vencimento);
  assert.ok(validarRenovacaoDeAto(ok, { atoAtual: null, hoje: HOJE }).erros.etapa);
  const r = aplicarRenovacaoDeAto(ato, ok);
  assert.equal(r.numero, ok.numero); assert.equal(r.validade, ok.vencimento); assert.equal(r.numeroAnterior, ato.numero); assert.equal(r.validadeAnterior, ato.validade);
});
t('editar e desligar professor: matrícula fica, desligar só sem turma', () => {
  const p = profs[0];
  const comps = ['Matemática', 'Língua Portuguesa', 'Física'];
  const f = { vinculo: 'Efetivo', formacao: 'Licenciatura em Matemática', habilitacao: ['Matemática'], cargaHorariaSemanal: '20', escolaId: escolas[0].id, email: '', telefone: '' };
  assert.equal(validarEdicaoDeProfessor(f, { escolas, componentes: comps }).ok, true);
  assert.ok(validarEdicaoDeProfessor({ ...f, habilitacao: [] }, { escolas, componentes: comps }).erros.habilitacao);
  assert.ok(validarEdicaoDeProfessor({ ...f, cargaHorariaSemanal: '25' }, { escolas, componentes: comps }).erros.cargaHorariaSemanal);
  assert.ok(validarEdicaoDeProfessor({ ...f, escolaId: 'zz' }, { escolas, componentes: comps }).erros.escolaId);
  const novo = aplicarEdicaoDeProfessor(p, f, HOJE);
  assert.equal(novo.id, p.id); assert.equal(novo.cargaHorariaSemanal, 20); assert.deepEqual(novo.habilitacao, ['Matemática']);
  assert.equal(podeDesligar(p, []).ok, true);
  const bloqueio = podeDesligar(p, [{ professorId: p.id }, { professorId: p.id }]);
  assert.equal(bloqueio.ok, false); assert.match(bloqueio.motivo, /2 turmas/);
});
t('lançar repasse: valor com 2 casas, data até hoje, prazo depois do crédito, soma ao recebido e reabre a prestação', () => {
  const cats = [...new Set(repasses.map((r) => r.categoria))];
  const f = { escolaId: 'e1', categoria: 'Custeio', valor: '1500.50', data: '2026-10-05', prazo: '2026-12-05' };
  assert.equal(validarRepasse(f, { escolas, categorias: cats, hoje: HOJE }).ok, true);
  assert.ok(validarRepasse({ ...f, valor: '10.123' }, { escolas, categorias: cats, hoje: HOJE }).erros.valor);
  assert.ok(validarRepasse({ ...f, valor: '0' }, { escolas, categorias: cats, hoje: HOJE }).erros.valor);
  assert.ok(validarRepasse({ ...f, data: '2026-11-01' }, { escolas, categorias: cats, hoje: HOJE }).erros.data);
  assert.ok(validarRepasse({ ...f, data: '2025-12-01' }, { escolas, categorias: cats, hoje: HOJE }).erros.data, 'só do ano corrente');
  assert.ok(validarRepasse({ ...f, prazo: '2026-10-05' }, { escolas, categorias: cats, hoje: HOJE }).erros.prazo);
  assert.ok(validarRepasse({ ...f, categoria: 'Inexistente' }, { escolas, categorias: cats, hoje: HOJE }).erros.categoria);
  const antes = rep('e1', 'Custeio');
  const depois = aplicarRepasses(repasses, [{ id: 'RP-1', ...f, valor: 1500.5 }]).find((r) => r.escolaId === 'e1' && r.categoria === 'Custeio');
  assert.equal(depois.recebido, Math.round((antes.recebido + 1500.5) * 100) / 100); assert.equal(depois.prestacao.entregue, false); assert.equal(depois.prestacao.prazo, '2026-12-05');
  assert.equal(antes.recebido, rep('e1', 'Custeio').recebido, 'o original não muda');
  assert.equal(aplicarRepasses(repasses, []).length, repasses.length);
});
t('registro de aula: turma sua, data até hoje, 1 a 6 aulas, conteúdo, sem duplicar o mesmo dia', () => {
  const ctx = { hoje: HOJE, minhasTurmas: ['tt1'], existentes: [] };
  const f = { turma: 'tt1|Matemática', data: '2026-10-06', aulas: '2', conteudo: 'Funções do 1º grau: gráfico e coeficientes.', tarefa: '' };
  assert.equal(validarRegistroDeAula(f, ctx).ok, true);
  assert.ok(validarRegistroDeAula({ ...f, turma: 'tt9|Matemática' }, ctx).erros.turma);
  assert.ok(validarRegistroDeAula({ ...f, data: '2026-10-08' }, ctx).erros.data, 'futuro');
  assert.ok(validarRegistroDeAula({ ...f, data: '2025-01-10' }, ctx).erros.data, 'mais de 6 meses');
  assert.ok(validarRegistroDeAula({ ...f, data: '2026-02-30' }, ctx).erros.data, 'data impossível');
  assert.ok(validarRegistroDeAula({ ...f, aulas: '0' }, ctx).erros.aulas); assert.ok(validarRegistroDeAula({ ...f, aulas: '7' }, ctx).erros.aulas); assert.ok(validarRegistroDeAula({ ...f, aulas: '1.5' }, ctx).erros.aulas);
  assert.ok(validarRegistroDeAula({ ...f, conteudo: 'curto' }, ctx).erros.conteudo);
  const r = montarRegistroDeAula(f, { id: 'RA-1', professorId: 'p1', turmaNome: '1ª série A', hoje: HOJE });
  assert.equal(r.aulas, 2); assert.equal(r.componente, 'Matemática'); assert.equal(r.turmaId, 'tt1');
  assert.ok(validarRegistroDeAula(f, { ...ctx, existentes: [r] }).erros.data, 'duplicado');
  assert.equal(validarRegistroDeAula(f, { ...ctx, existentes: [r], editandoId: 'RA-1' }).ok, true, 'editar o mesmo registro vale');
  assert.deepEqual(datasSemRegistro(dado('chamadas'), [r], 'tt1', 'Matemática', 3), ['2026-09-28', '2026-09-25', '2026-09-24']);
  assert.deepEqual(datasSemRegistro(dado('chamadas'), [{ ...r, data: '2026-09-28' }], 'tt1', 'Matemática', 2), ['2026-09-25', '2026-09-24']);
});
t('justificar falta: estudante do responsável, datas até hoje e em 30 dias, motivo, atestado se saúde > 3 dias, sem duplicar', () => {
  const ctx = { hoje: HOJE, estudantesDoResponsavel: ['a3'], existentes: [] };
  const f = { estudanteId: 'a3', de: '2026-10-05', ate: '', motivo: 'saude', descricao: '' };
  assert.equal(validarJustificativa(f, ctx).ok, true);
  assert.ok(validarJustificativa({ ...f, estudanteId: 'a9' }, ctx).erros.estudanteId, 'filho de outro responsável');
  assert.ok(validarJustificativa({ ...f, de: '2026-10-08' }, ctx).erros.de, 'futuro');
  assert.ok(validarJustificativa({ ...f, de: '2026-08-01' }, ctx).erros.de, 'fora do prazo de 30 dias');
  assert.ok(validarJustificativa({ ...f, ate: '2026-10-04' }, ctx).erros.ate, 'fim antes do início');
  assert.ok(validarJustificativa({ ...f, de: '2026-09-20', ate: '2026-10-07' }, ctx).erros.ate, 'mais de 15 dias');
  assert.ok(validarJustificativa({ ...f, motivo: '' }, ctx).erros.motivo);
  assert.ok(validarJustificativa({ ...f, motivo: 'outro', descricao: 'curto' }, ctx).erros.descricao);
  assert.equal(validarJustificativa({ ...f, motivo: 'outro', descricao: 'Consulta de rotina no interior.' }, ctx).ok, true);
  assert.ok(validarJustificativa({ ...f, de: '2026-10-01', ate: '2026-10-05' }, ctx).erros.anexo, 'saúde por 5 dias sem atestado');
  assert.equal(validarJustificativa({ ...f, de: '2026-10-01', ate: '2026-10-05' }, { ...ctx, anexo: { nome: 'atestado.pdf', tamanho: 1000 } }).ok, true);
  assert.equal(diasDoPeriodo('2026-10-01', '2026-10-05'), 5); assert.equal(diasDoPeriodo('2026-10-01', ''), 1);
  const j = montarJustificativa(f, { protocolo: 'JUS-2026-0006', estudante: { id: 'a3', nome: 'Iasmim', turma: '1ª série A', turmaId: 'tt1', escolaId: 'e1', responsavel: 'Edilene' }, hoje: HOJE });
  assert.equal(j.situacao, 'Aguardando análise'); assert.equal(j.ate, j.de);
  assert.ok(validarJustificativa(f, { ...ctx, existentes: [j] }).erros.de, 'mesmas datas');
  assert.equal(validarJustificativa(f, { ...ctx, existentes: [{ ...j, situacao: 'Recusada' }] }).ok, true, 'recusada não bloqueia nova tentativa');
});
t('decisão da secretaria: recusar exige explicação, só decide o que aguarda, pendentes primeiro', () => {
  const j = { protocolo: 'JUS-1', situacao: 'Aguardando análise', enviadaEm: '2026-10-05' };
  assert.equal(validarDecisao(j, { decisao: 'Aceita', parecer: '' }).ok, true);
  assert.ok(validarDecisao(j, { decisao: 'Recusada', parecer: 'não' }).erros.parecer);
  assert.equal(validarDecisao(j, { decisao: 'Recusada', parecer: 'Sem atestado anexado.' }).ok, true);
  assert.ok(validarDecisao({ ...j, situacao: 'Aceita' }, { decisao: 'Recusada', parecer: 'Sem atestado.' }).erros.geral, 'já decidida');
  assert.ok(validarDecisao(j, { decisao: 'Talvez', parecer: '' }).erros.geral);
  const d = aplicarDecisao(j, { decisao: 'Recusada', parecer: ' Sem atestado. ', por: 'Secretaria', hoje: HOJE });
  assert.equal(d.situacao, 'Recusada'); assert.equal(d.parecer, 'Sem atestado.'); assert.equal(d.decididaEm, HOJE); assert.equal(j.situacao, 'Aguardando análise');
  const ordem = ordenarJustificativas([d, { ...j, protocolo: 'B', enviadaEm: '2026-10-06' }, { ...j, protocolo: 'A', enviadaEm: '2026-10-01' }]).map((x) => x.protocolo);
  assert.deepEqual(ordem, ['A', 'B', 'JUS-1']);
});
t('abono: só justificativa aceita desconta, só em dia de chamada com falta, sem passar das faltas e sem mexer no diário', () => {
  const chamadas = dado('chamadas');
  const j = (extra) => ({ estudanteId: 'a3', turmaId: 'tt1', de: '2026-09-24', ate: '2026-09-25', situacao: 'Aceita', ...extra });
  assert.deepEqual(abonosPorEstudante(chamadas, [j()]), { a3: 2 });
  assert.deepEqual(abonosPorEstudante(chamadas, [j({ situacao: 'Aguardando análise' })]), {});
  assert.deepEqual(abonosPorEstudante(chamadas, [j({ situacao: 'Recusada' })]), {});
  assert.deepEqual(abonosPorEstudante(chamadas, [j({ de: '2026-09-26', ate: '2026-09-27' })]), {}, 'sem chamada com falta no período');
  assert.deepEqual(abonosPorEstudante(chamadas, [j(), j({ de: '2026-09-25', ate: '2026-09-25' })]), { a3: 2 }, 'períodos sobrepostos não contam duas vezes');
  assert.deepEqual(abonosPorEstudante(chamadas, [j({ estudanteId: 'a1' })]), {}, 'estudante que não faltou');
  const dia = { tt1: [{ id: 'a3', faltas: 5 }, { id: 'a5', faltas: 1 }] };
  const novo = aplicarAbonos(dia, { a3: 2, a5: 4 });
  assert.equal(novo.tt1[0].faltas, 3); assert.equal(novo.tt1[0].abonadas, 2);
  assert.equal(novo.tt1[1].faltas, 0); assert.equal(novo.tt1[1].abonadas, 1, 'nunca abona mais do que as faltas registradas');
  assert.equal(dia.tt1[0].faltas, 5, 'o diário original não muda');
  assert.deepEqual(aplicarAbonos(undefined, {}), {});
});
t('estornar repasse: só se o valor ainda estiver livre, com motivo, e some do recebido e do prazo', () => {
  const l = { id: 'RP-1', escolaId: 'e1', categoria: 'Custeio', valor: 1500.5, data: '2026-10-05', prazo: '2026-12-05' };
  const com = aplicarRepasses(repasses, [l]).find((r) => r.escolaId === 'e1' && r.categoria === 'Custeio');
  const base = rep('e1', 'Custeio');
  assert.equal(podeEstornar(l, com).ok, true, 'ninguém gastou o valor novo');
  assert.equal(podeEstornar(l, { ...com, executado: com.recebido - 1000 }).ok, false, 'já gastou além do que sobraria');
  assert.match(podeEstornar(l, { ...com, executado: com.recebido - 1000 }).motivo, /saldo negativo/);
  assert.equal(podeEstornar(l, { ...com, executado: base.recebido - 1, emAnalise: 1 }).ok, true, 'exatamente no limite');
  assert.equal(podeEstornar(l, { ...com, executado: base.recebido, emAnalise: 1 }).ok, false, 'em análise também conta');
  assert.equal(podeEstornar({ ...l, estornadoEm: '2026-10-06' }, com).ok, false, 'já estornado');
  assert.ok(validarEstorno({ motivo: 'x' }).erros.motivo); assert.equal(validarEstorno({ motivo: 'Lançado na escola errada.' }).ok, true);
  const est = aplicarEstorno(l, { motivo: ' Lançado na escola errada. ', por: 'PROFIN', hoje: HOJE });
  assert.equal(est.estornadoEm, HOJE); assert.equal(est.estornoMotivo, 'Lançado na escola errada.'); assert.equal(l.estornadoEm, undefined);
  const depois = aplicarRepasses(repasses, [est]).find((r) => r.escolaId === 'e1' && r.categoria === 'Custeio');
  assert.equal(depois.recebido, base.recebido, 'volta ao recebido anterior'); assert.deepEqual(depois.prestacao, base.prestacao, 'volta ao prazo anterior');
  // dois repasses: estornar o mais novo deixa o prazo do mais antigo
  const l2 = { id: 'RP-2', escolaId: 'e1', categoria: 'Custeio', valor: 100, data: '2026-10-06', prazo: '2027-01-10' };
  const um = aplicarRepasses(repasses, [l, aplicarEstorno(l2, { motivo: 'Duplicado', por: 'P', hoje: HOJE })]).find((r) => r.escolaId === 'e1' && r.categoria === 'Custeio');
  assert.equal(um.prestacao.prazo, '2026-12-05'); assert.equal(um.recebido, Math.round((base.recebido + 1500.5) * 100) / 100);
});
t('mudar o professor de escola: motivo, turmas que deixa, alocações liberadas e histórico de lotação', () => {
  const p = { ...profs[0], escolaId: 'e1', habilitacao: ['Matemática'], vinculo: 'Efetivo', formacao: 'Licenciatura em Matemática', cargaHorariaSemanal: 20 };
  const f = { vinculo: 'Efetivo', formacao: p.formacao, habilitacao: ['Matemática'], cargaHorariaSemanal: '20', escolaId: 'e2', email: '', telefone: '' };
  const v = (x) => validarEdicaoDeProfessor(x, { escolas, componentes: ['Matemática'], escolaAtual: 'e1' });
  assert.ok(v(f).erros.motivoLotacao, 'mudar de escola pede motivo');
  assert.equal(v({ ...f, motivoLotacao: 'Remoção a pedido' }).ok, true);
  assert.equal(v({ ...f, escolaId: 'e1' }).ok, true, 'sem mudança não pede motivo');
  const turmas = [{ id: 'tt1', nome: '1ª série A', escolaId: 'e1' }, { id: 'tt9', nome: '9º ano B', escolaId: 'e2' }];
  const aloc = [{ turmaId: 'tt1', componente: 'Matemática', professorId: p.id }, { turmaId: 'tt9', componente: 'Matemática', professorId: p.id }, { turmaId: 'tt1', componente: 'Física', professorId: 'outro' }];
  const saidas = turmasQueDeixa(p, 'e2', aloc, turmas);
  assert.deepEqual(saidas.map((s) => s.turma), ['1ª série A'], 'só sai das turmas da escola antiga');
  assert.deepEqual(turmasQueDeixa(p, 'e1', aloc, turmas).map((s) => s.turma), ['9º ano B']);
  const resto = semAlocacoesDe(aloc, p.id, saidas);
  assert.equal(resto.length, 2); assert.ok(resto.some((a) => a.professorId === 'outro'), 'não mexe nas alocações dos outros');
  const novo = aplicarEdicaoDeProfessor(p, { ...f, motivoLotacao: ' Remoção a pedido ' }, HOJE);
  assert.equal(novo.escolaId, 'e2'); assert.equal(novo.lotadoDesde, HOJE);
  assert.deepEqual(novo.historicoLotacao, [{ escolaId: 'e1', de: null, ate: HOJE, motivo: 'Remoção a pedido' }]);
  const volta = aplicarEdicaoDeProfessor(novo, { ...f, escolaId: 'e1', motivoLotacao: 'Volta' }, '2026-11-01');
  assert.equal(volta.historicoLotacao.length, 2); assert.equal(volta.historicoLotacao[1].de, HOJE, 'o início da lotação vira o "de" do histórico');
  assert.equal(aplicarEdicaoDeProfessor(p, { ...f, escolaId: 'e1' }, HOJE).historicoLotacao, undefined, 'sem mudança não cria histórico');
});
t('registros de aula: verde até 7 dias, amarelo de 8 a 14, vermelho acima ou sem registro, mais atrasadas primeiro', () => {
  const reg = (turmaId, data) => ({ turmaId, data });
  const rs = [reg('t1', '2026-10-07'), reg('t2', '2026-10-01'), reg('t3', '2026-09-26'), reg('t3', '2026-09-20'), reg('t4', '2026-09-20')];
  assert.equal(situacaoDosRegistros('t1', rs, HOJE).chave, 'verde'); assert.match(situacaoDosRegistros('t1', rs, HOJE).texto, /hoje/);
  assert.equal(situacaoDosRegistros('t2', rs, HOJE).chave, 'verde'); assert.equal(situacaoDosRegistros('t2', rs, HOJE).dias, 6);
  assert.equal(situacaoDosRegistros('t3', rs, HOJE).chave, 'amarelo'); assert.equal(situacaoDosRegistros('t3', rs, HOJE).dias, 11, 'vale o registro mais recente da turma');
  assert.equal(situacaoDosRegistros('t4', rs, HOJE).chave, 'vermelho');
  assert.equal(situacaoDosRegistros('t5', rs, HOJE).chave, 'vermelho'); assert.equal(situacaoDosRegistros('t5', rs, HOJE).texto, 'Nenhum registro');
  assert.equal(situacaoDosRegistros('t2', [reg('t2', '2026-09-30')], HOJE).dias, 7, 'sete dias ainda é verde'); assert.equal(situacaoDosRegistros('t2', [reg('t2', '2026-09-30')], HOJE).chave, 'verde');
  assert.equal(situacaoDosRegistros('t2', [reg('t2', '2026-09-29')], HOJE).chave, 'amarelo', 'oito dias já alerta');
  assert.equal(situacaoDosRegistros('t2', [reg('t2', '2026-10-09')], HOJE).dias, 0, 'registro à frente do hoje não dá dias negativos');
  const turmas = ['t1', 't2', 't3', 't4', 't5'].map((id) => ({ id, nome: `Turma ${id}` }));
  assert.deepEqual(turmasSemRegistro(turmas, rs, HOJE).map((x) => x.turma.id), ['t5', 't4', 't3']);
});
t('plano de aula: códigos da BNCC no formato certo e combinando com a etapa e o ano da turma', () => {
  assert.deepEqual(normalizarCodigos(' ef06ma01, EF06MA02;ef06ma01  EM13MAT101 '), ['EF06MA01', 'EF06MA02', 'EM13MAT101']);
  for (const [c] of EXEMPLOS_DE_CODIGOS) assert.ok(CODIGO_BNCC.test(c), c);
  for (const ruim of ['EF6MA01', 'EF06MA1', 'XX06MA01', 'EM13MAT10', 'EM12MAT101', 'EF06M01', 'abc']) assert.equal(CODIGO_BNCC.test(ruim), false, ruim);
  for (const bom of ['EF69LP01', 'EF67LP05', 'EM13LP01', 'EM13LGG101', 'EM13CNT101', 'EM13CHS101', 'EF08MA06']) assert.equal(CODIGO_BNCC.test(bom), true, bom);
  assert.equal(codigoCombinaComSerie('EF06MA01', '6º ano'), true); assert.equal(codigoCombinaComSerie('EF06MA01', '7º ano'), false);
  assert.equal(codigoCombinaComSerie('EF69LP01', '8º ano'), true, 'EF69 cobre do 6º ao 9º'); assert.equal(codigoCombinaComSerie('EF67LP05', '8º ano'), false); assert.equal(codigoCombinaComSerie('EF67LP05', '7º ano'), true);
  assert.equal(codigoCombinaComSerie('EF89LP01', '9º ano'), true);
  assert.equal(codigoCombinaComSerie('EM13MAT101', '1ª série EM'), true); assert.equal(codigoCombinaComSerie('EM13MAT101', '9º ano'), false); assert.equal(codigoCombinaComSerie('EF09MA09', '3ª série EM'), false);
  const ctx = { minhasTurmas: [{ id: 'tt1', serie: '1ª série EM' }, { id: 'tt2', serie: '7º ano' }], hoje: HOJE };
  const f = { turma: 'tt1|Matemática', tema: 'Funções do 2º grau', data: '2026-10-14', aulas: '2', habilidades: 'em13mat302, EM13MAT101', objetivos: 'Construir e interpretar gráficos.', atividades: 'Exposição, exercícios em dupla e correção.', recursos: '', avaliacao: '' };
  assert.equal(validarPlano(f, ctx).ok, true);
  assert.ok(validarPlano({ ...f, turma: 'tt9|x' }, ctx).erros.turma);
  assert.ok(validarPlano({ ...f, tema: 'ab' }, ctx).erros.tema);
  assert.ok(validarPlano({ ...f, data: '2028-10-14' }, ctx).erros.data, 'a mais de um ano');
  assert.ok(validarPlano({ ...f, aulas: '9' }, ctx).erros.aulas);
  assert.match(validarPlano({ ...f, habilidades: '' }, ctx).erros.habilidades, /pelo menos uma/);
  assert.match(validarPlano({ ...f, habilidades: 'EF06MA' }, ctx).erros.habilidades, /fora do formato/);
  assert.match(validarPlano({ ...f, habilidades: 'EF06MA01' }, ctx).erros.habilidades, /não combina/, 'código de 6º ano em turma de Ensino Médio');
  assert.equal(validarPlano({ ...f, turma: 'tt2|Matemática', habilidades: 'EF07MA04' }, ctx).ok, true);
  assert.ok(validarPlano({ ...f, objetivos: 'curto' }, ctx).erros.objetivos); assert.ok(validarPlano({ ...f, atividades: '' }, ctx).erros.atividades);
  assert.ok(validarPlano({ ...f, habilidades: 'EM13MAT101,EM13MAT102,EM13MAT103,EM13MAT104,EM13MAT105,EM13MAT106,EM13MAT107' }, ctx).erros.habilidades, 'mais de 6');
  const pl = montarPlano(f, { id: 'PL-1', professorId: 'p1', turmaNome: '1ª série A', agora: '2026-10-07T10:00:00Z' });
  assert.deepEqual(pl.habilidades, ['EM13MAT302', 'EM13MAT101']); assert.equal(pl.componente, 'Matemática'); assert.equal(pl.aulas, 2);
});
t('avisos lidos: marcação por usuário, chave estável, marcar e desmarcar sem mexer no original', () => {
  const a1 = { titulo: 'Rematrícula para 2027', data: '15/09/2026' }, a2 = { titulo: 'Reunião de pais', iso: '2026-10-05' };
  assert.equal(isoDoAviso(a1), '2026-09-15'); assert.equal(chaveDoAviso(a1), '2026-09-15|Rematrícula para 2027'); assert.equal(chaveDoAviso(a2), '2026-10-05|Reunião de pais');
  const vazio = {};
  const um = marcarLidos(vazio, 'u1', [chaveDoAviso(a1)]);
  assert.deepEqual(vazio, {}, 'não altera o original');
  assert.equal(naoLidos([a1, a2], lidosDe(um, 'u1')).length, 1); assert.equal(naoLidos([a1, a2], lidosDe(um, 'u2')).length, 2, 'cada usuário tem a sua marcação');
  const todos = marcarLidos(um, 'u1', [chaveDoAviso(a1), chaveDoAviso(a2)]);
  assert.equal(naoLidos([a1, a2], lidosDe(todos, 'u1')).length, 0); assert.equal(todos.u1.length, 2, 'sem repetir');
  const volta = marcarLidos(todos, 'u1', [chaveDoAviso(a1)], false);
  assert.deepEqual(naoLidos([a1, a2], lidosDe(volta, 'u1')).map((a) => a.titulo), ['Rematrícula para 2027']);
  assert.equal(lidosDe(undefined, 'u1').size, 0);
});
t('redefinir senha: quem pode redefinir de quem, só a própria escola, senha temporária ditável e que passa na regra', () => {
  assert.equal(podeRedefinir('escola', 'aluno'), true); assert.equal(podeRedefinir('escola', 'professor'), true); assert.equal(podeRedefinir('escola', 'diretor'), false);
  assert.equal(podeRedefinir('rede', 'escola'), true); assert.equal(podeRedefinir('rede', 'profin'), true); assert.equal(podeRedefinir('rede', 'rede'), false, 'a rede não redefine a própria equipe');
  assert.equal(podeRedefinir('aluno', 'aluno'), false); assert.equal(podeRedefinir('profin', 'escola'), false); assert.equal(podeRedefinir(undefined, 'aluno'), false);
  const contas = dado('usuarios');
  const escolaDe = (c) => (c.perfil === 'aluno' || c.perfil === 'professor' || c.perfil === 'responsavel' ? { a3: 'e1', b7: 'e1', c5: 'e1', p1: 'e1', resp1: 'e1' }[c.refId] : c.escolaId ?? null);
  const daSecretaria = contasDoOperador('escola', 'e1', contas, escolaDe);
  assert.ok(daSecretaria.length >= 5 && daSecretaria.every((c) => ['aluno', 'responsavel', 'professor'].includes(c.perfil)), 'só alunos, responsáveis e professores');
  assert.deepEqual(contasDoOperador('escola', 'e2', contas, escolaDe), [], 'outra escola não enxerga estas contas');
  assert.deepEqual(contasDoOperador('rede', null, contas, escolaDe).map((c) => c.perfil).sort(), ['coordenador', 'diretor', 'escola', 'profin']);
  // gerador determinístico para o teste
  let k = 0; const fixo = (n) => (k++ * 7) % n;
  const s = gerarSenhaTemporaria(fixo);
  assert.match(s, /^[A-Z][a-z]{4}-\d{4}$/); assert.doesNotMatch(s, /[ilo]/i, 'sem letras que confundem');
  for (let i = 0; i < 200; i++) { const t = gerarSenhaTemporaria((n) => Math.floor(Math.random() * n)); assert.match(t, /^[A-Z][a-z]{4}-[2-9]{4}$/); assert.doesNotMatch(t, /[ilo]/i); }
  assert.equal(validarTrocaDeSenha({ atual: s, nova: 'Definitiva2026', confirmacao: 'Definitiva2026' }, { atualCorreta: true, login: 'x' }).ok, true, 'a definitiva pode ser escolhida usando a temporária como atual');
});
t('transferência e cancelamento: destino com ato vigente e vaga, motivo, data, situação do estudante, vagas e desfazer', () => {
  const atos = dado('atos'), vagas = dado('vagas');
  const estudante = { id: 'a3', nome: 'Iasmim Cardoso de Jesus', serie: '1ª série EM', turma: '1ª série A', turmaId: 'tt1', responsavel: 'Edilene' };
  const ativo = { chave: 'ativo' };
  const ctx = { estudante, situacao: ativo, escolaOrigemId: 'e1', escolas, atos, vagas, hoje: HOJE };
  const f = { destinoId: 'e2', data: '2026-10-06', motivo: 'Mudança de bairro da família' };
  assert.equal(validarTransferencia(f, ctx).ok, true, 'e2 tem ato vigente e vaga na 1ª série EM');
  assert.ok(validarTransferencia({ ...f, destinoId: 'e1' }, ctx).erros.destinoId, 'destino igual à origem');
  assert.ok(validarTransferencia({ ...f, destinoId: 'zz' }, ctx).erros.destinoId);
  assert.match(validarTransferencia({ ...f, destinoId: 'e3' }, ctx).erros.destinoId, /não oferece|Sem /, 'escola sem a série ou sem vaga');
  assert.match(validarTransferencia(f, { ...ctx, vagas: { ...vagas, e2: { ...vagas.e2, '1ª série EM': 0 } } }).erros.destinoId, /Sem vagas/);
  assert.ok(validarTransferencia({ ...f, data: '2026-10-09' }, ctx).erros.data, 'futuro'); assert.ok(validarTransferencia({ ...f, data: '2026-08-01' }, ctx).erros.data, 'mais de 30 dias');
  assert.ok(validarTransferencia({ ...f, motivo: 'x' }, ctx).erros.motivo);
  assert.ok(validarTransferencia(f, { ...ctx, situacao: { chave: 'cancelado' } }).erros.estudanteId, 'já cancelado'); assert.ok(validarTransferencia(f, { ...ctx, estudante: null }).erros.estudanteId);
  const c = { motivoChave: 'mudanca', descricao: '', data: '2026-10-06' };
  assert.equal(validarCancelamento(c, ctx).ok, true);
  assert.ok(validarCancelamento({ ...c, motivoChave: '' }, ctx).erros.motivoChave); assert.ok(validarCancelamento({ ...c, motivoChave: 'outro' }, ctx).erros.descricao);
  assert.equal(validarCancelamento({ ...c, motivoChave: 'outro', descricao: 'Família viajou para o exterior.' }, ctx).ok, true);
  const mov = montarMovimentacao('Transferência', f, { id: 'MOV-1', estudante, escolaOrigemId: 'e1', escolas, protocoloDestino: 'MAT-2026-0006', hoje: HOJE, por: 'Secretaria' });
  assert.equal(mov.destinoNome, escolas.find((x) => x.id === 'e2').nome); assert.equal(mov.turmaId, 'tt1');
  const canc = montarMovimentacao('Cancelamento', { ...c, motivoChave: 'obito' }, { id: 'MOV-2', estudante: { ...estudante, id: 'a5' }, escolaOrigemId: 'e1', escolas, hoje: HOJE, por: 'Secretaria' });
  assert.equal(canc.motivo, 'Óbito');
  // situação: a mais recente que não foi desfeita
  assert.equal(situacaoDoEstudante('a3', [mov]).chave, 'transferido'); assert.match(situacaoDoEstudante('a3', [mov]).texto, /Transferido para/);
  assert.equal(situacaoDoEstudante('a3', [{ ...mov, desfeitaEm: HOJE }]).chave, 'ativo', 'desfeita volta a ativo'); assert.equal(situacaoDoEstudante('a9', [mov]).chave, 'ativo');
  assert.equal(situacaoDoEstudante('a5', [canc]).chave, 'cancelado');
  assert.deepEqual([...estudantesInativos([mov, canc, { ...canc, id: 'MOV-3', estudanteId: 'a9', desfeitaEm: HOJE }])].sort(), ['a3', 'a5']);
  // pedido no destino
  const pedido = pedidoDeTransferencia(mov, { estudante, protocolo: 'MAT-2026-0006', dataBR: '07/10/2026' });
  assert.equal(pedido.tipo, 'Transferência'); assert.equal(pedido.escolaId, 'e2'); assert.equal(pedido.situacao, 'Aguardando confirmação'); assert.equal(pedido.movimentacao, 'MOV-1');
  // desfazer
  assert.equal(podeDesfazer(mov, { situacao: 'Aguardando confirmação' }).ok, true); assert.equal(podeDesfazer(mov, { situacao: 'Recusada' }).ok, true);
  assert.equal(podeDesfazer(mov, { situacao: 'Confirmada' }).ok, false); assert.equal(podeDesfazer(canc, null).ok, true); assert.equal(podeDesfazer({ ...mov, desfeitaEm: HOJE }, null).ok, false);
  // vagas: origem libera e destino reserva; desfazer devolve só o que ainda está reservado
  assert.deepEqual(ajusteDeVagas(mov, 'movimentar'), [{ escolaId: 'e1', serie: '1ª série EM', delta: 1 }, { escolaId: 'e2', serie: '1ª série EM', delta: -1 }]);
  assert.deepEqual(ajusteDeVagas(canc, 'movimentar'), [{ escolaId: 'e1', serie: '1ª série EM', delta: 1 }]);
  assert.deepEqual(ajusteDeVagas(mov, 'desfazer', 'Aguardando confirmação'), [{ escolaId: 'e1', serie: '1ª série EM', delta: -1 }, { escolaId: 'e2', serie: '1ª série EM', delta: 1 }]);
  assert.deepEqual(ajusteDeVagas(mov, 'desfazer', 'Recusada'), [{ escolaId: 'e1', serie: '1ª série EM', delta: -1 }], 'destino já devolveu a vaga ao recusar');
  const depois = aplicarAjusteDeVagas(vagas, ajusteDeVagas(mov, 'movimentar'));
  assert.equal(depois.e1['1ª série EM'], vagas.e1['1ª série EM'] + 1); assert.equal(depois.e2['1ª série EM'], vagas.e2['1ª série EM'] - 1); assert.equal(vagas.e2['1ª série EM'], 13, 'o original não muda');
  assert.equal(aplicarAjusteDeVagas({ e1: { s: 0 } }, [{ escolaId: 'e1', serie: 's', delta: -1 }]).e1.s, 0, 'nunca fica negativa');
});

// ---------------- Rede: vagas calculadas, procura por bairro, séries, cursos, DRE e histórico de atos ----------------
t('vagas calculadas: lugares livres das turmas aprovadas menos os pedidos sem turma, por turno', () => {
  const turmas = [
    { id: 'a', escolaId: 'x', serie: '6º ano', turno: 'Manhã', situacao: 'Aprovada', capacidade: 30, matriculados: 25 },
    { id: 'b', escolaId: 'x', serie: '6º ano', turno: 'Tarde', situacao: 'Aprovada', capacidade: 30, matriculados: 28 },
    { id: 'c', escolaId: 'x', serie: '6º ano', turno: 'Noite', situacao: 'Pendente de aprovação', capacidade: 30, matriculados: 0 }
  ];
  const pedidos = [
    { protocolo: 'P1', escolaId: 'x', serie: '6º ano', tipo: 'Matrícula nova', situacao: 'Aguardando confirmação' },
    { protocolo: 'P2', escolaId: 'x', serie: '6º ano', tipo: 'Transferência', situacao: 'Confirmada' },
    { protocolo: 'P3', escolaId: 'x', serie: '6º ano', tipo: 'Matrícula nova', situacao: 'Confirmada' },
    { protocolo: 'P4', escolaId: 'x', serie: '6º ano', tipo: 'Matrícula nova', situacao: 'Recusada' },
    { protocolo: 'P5', escolaId: 'x', serie: '6º ano', tipo: 'Rematrícula', situacao: 'Aguardando confirmação' }
  ];
  const enturmacao = { P3: 'a' }; // P3 já está na turma a
  assert.equal(lugaresLivres(turmas[0], enturmacao), 4); assert.equal(lugaresLivres(turmas[2]), 0, 'turma não aprovada não abre vaga');
  assert.equal(pedidoSeguraVaga(pedidos[0]), true); assert.equal(pedidoSeguraVaga(pedidos[3]), false); assert.equal(pedidoSeguraVaga(pedidos[4]), false, 'rematrícula não usa vaga nova');
  assert.equal(pedidoSeguraVaga(pedidos[2], enturmacao), false, 'enturmado já ocupa lugar na turma');
  const c = calcularVagas({ turmas, pedidos, enturmacao }).x['6º ano'];
  assert.deepEqual(c.porTurno, { Manhã: 4, Tarde: 2 }); assert.equal(c.lugares, 6); assert.equal(c.aguardando, 1); assert.equal(c.aguardandoTurma, 1);
  assert.equal(c.vagas, 4); assert.equal(c.oferta, 5, 'o mapa não desconta os pedidos aguardando (eles entram na procura)');
  // ato vencido bloqueia mesmo com lugar livre; série fora do ato não aparece como oferecida
  const atos = [{ escolaId: 'x', etapa: 'Ensino Fundamental — Anos Finais', validade: '2026-01-01' }];
  assert.equal(calcularVagas({ turmas, pedidos, enturmacao, atos, hoje: HOJE }).x['6º ano'].vagas, 0);
  assert.equal(calcularVagas({ turmas, pedidos: [], atos: [{ ...atos[0], validade: '2030-01-01' }], hoje: HOJE }).x['6º ano'].vagas, 7, 'sem pedidos nem enturmados: 5 + 2');
  // com os dados de demonstração: a 2ª série do Osvaldo está cheia (34 de 34) e tem pedidos, então não tem vaga
  const det = calcularVagas({ turmas: [...dado('turmas'), ...dado('turmas-rede')], pedidos: dado('matriculas'), enturmacao: dado('enturmacao'), atos: dado('atos'), hoje: HOJE });
  assert.equal(det.e1['2ª série EM'].vagas, 0); assert.equal(det.e1['2ª série EM'].excesso, 2);
  assert.equal(vagasPorSerie(det).e2['1ª série EM'], 13, 'as turmas das outras escolas chegam ao mesmo número de antes');
});
t('turma aberta pela rede: série liberada, turno, nome e lugares', () => {
  const ctx = { series: ['6º ano', '7º ano'], turmas: [{ escolaId: 'x', nome: '6º ano A', turno: 'Manhã' }], escolaId: 'x' };
  assert.equal(validarTurmaNova({ serie: '6º ano', turno: 'Tarde', nome: '6º ano A', capacidade: '35' }, ctx).ok, true);
  const r = validarTurmaNova({ serie: '1ª série EM', turno: 'Madrugada', nome: '6º ano a', capacidade: '5' }, { ...ctx, series: ctx.series });
  assert.ok(r.erros.serie && r.erros.turno && r.erros.capacidade);
  assert.ok(validarTurmaNova({ serie: '6º ano', turno: 'Manhã', nome: '6º ano a', capacidade: 30 }, ctx).erros.nome, 'mesmo nome no mesmo turno');
  const t1 = montarTurmaNova({ serie: '6º ano', turno: 'Tarde', nome: ' 6º ano B ', capacidade: '35' }, { escolaId: 'x', hoje: HOJE, por: 'SEED' });
  assert.equal(t1.situacao, 'Aprovada'); assert.equal(t1.capacidade, 35); assert.equal(t1.nome, '6º ano B'); assert.equal(t1.matriculados, 0);
});
t('procura por bairro: lista de espera + pedidos aguardando x vagas das escolas do bairro', () => {
  const escolasT = [{ id: 'x', municipio: 'Aracaju', bairro: 'Bugio' }];
  const vagasT = { x: { '6º ano': { oferta: 10 } } };
  const espera = [{ municipio: 'Aracaju', bairro: 'Bugio', serie: '6º ano', quantidade: 4 }, { municipio: 'Aracaju', bairro: 'Santos Dumont', serie: '6º ano', quantidade: 5 }, { municipio: 'Aracaju', bairro: 'Bugio', serie: '7º ano', quantidade: 9 }];
  const pedidosT = [{ escolaId: 'x', serie: '6º ano', tipo: 'Matrícula nova', situacao: 'Aguardando confirmação', municipio: 'Aracaju', bairro: 'Santos Dumont' }, { escolaId: 'x', serie: '6º ano', tipo: 'Matrícula nova', situacao: 'Aguardando confirmação' }, { escolaId: 'x', serie: '6º ano', tipo: 'Matrícula nova', situacao: 'Confirmada' }];
  const l = procuraPorBairro({ listaEspera: espera, pedidos: pedidosT, escolas: escolasT, vagas: vagasT, series: ['6º ano'] });
  const sd = l.find((x) => x.bairro === 'Santos Dumont'); const bu = l.find((x) => x.bairro === 'Bugio');
  assert.deepEqual([sd.espera, sd.pedidos, sd.procura, sd.oferta, sd.faixa], [5, 1, 6, 0, 'falta'], 'pedido conta no bairro onde a família mora');
  assert.deepEqual([bu.espera, bu.pedidos, bu.procura, bu.oferta, bu.faixa], [4, 1, 5, 10, 'folga'], 'pedido antigo sem bairro conta no bairro da escola');
  assert.equal(l[0].bairro, 'Santos Dumont', 'maior falta primeiro');
  assert.equal(somarPorMunicipio(l)[0].procura, 11);
  assert.equal(procuraPorBairro({ listaEspera: espera, pedidos: [], escolas: escolasT, vagas: vagasT, series: SERIES, municipios: ['Lagarto'] }).length, 0);
  assert.equal(faixaDaRazao(1.21), 'falta'); assert.equal(faixaDaRazao(1), 'equilibrio'); assert.equal(faixaDaRazao(0.5), 'folga');
  assert.ok(validarEntradaNaEspera({ municipio: 'Aracaju', serie: '6º ano', estudante: 'Ana' }).erros.bairro);
});
t('séries que a escola tem: o ato guarda as séries e a matrícula respeita', () => {
  const atos = [{ escolaId: 'x', etapa: 'Ensino Médio', validade: '2030-01-01', series: ['1ª série EM', '2ª série EM'] }];
  assert.ok(atoDaEtapa(atos, 'x', '1ª série EM')); assert.equal(atoDaEtapa(atos, 'x', '3ª série EM'), null);
  assert.equal(motivoBloqueio({ atos, vagas: { x: { '3ª série EM': 5 } }, escolaId: 'x', serie: '3ª série EM' }), 'Esta escola não oferece esta série.');
  assert.deepEqual(seriesEscolhidas('Ensino Médio', undefined), ['1ª série EM', '2ª série EM', '3ª série EM'], 'cadastro antigo: todas as séries');
  assert.equal(validarEscola({ ...base, etapas: ['Ensino Médio'], series: ['6º ano'] }, { escolas, hoje: HOJE }).erros.series !== undefined, true);
  const m = montarEscola({ ...base, etapas: ['Ensino Fundamental — Anos Finais', 'Ensino Médio'], series: ['6º ano', '7º ano', '1ª série EM'], referencia: ' Ao lado da praça ' }, { escolas, coordenadas: { lat: 0, lng: 0 }, hoje: HOJE });
  assert.deepEqual(m.atos.map((a) => a.series), [['6º ano', '7º ano'], ['1ª série EM']]); assert.equal(m.escola.referencia, 'Ao lado da praça');
  assert.ok(validarSeriesDaEscola(['6º ano'], m.atos).erros.series, 'cada nível precisa de uma série');
  assert.deepEqual(aplicarSeriesAosAtos(m.atos, ['8º ano', '2ª série EM']).map((a) => a.series), [['8º ano'], ['2ª série EM']]);
});
t('DRE e município, ponto de referência e curso no cadastro', () => {
  const dres = dado('dres');
  assert.equal(municipioDaDre(dres, 'DRE 2 — Lagarto', 'Lagarto'), true); assert.equal(municipioDaDre(dres, 'DRE 2 — Lagarto', 'Aracaju'), false);
  for (const e of escolas) assert.equal(municipioDaDre(dres, e.dre, e.municipio), true, `${e.nome}: o município é da DRE`);
  const f = { ...base, dre: 'DRE 2 — Lagarto', municipio: 'Aracaju', etapas: ['Ensino Médio'] };
  assert.match(validarEscola(f, { escolas, hoje: HOJE, dres }).erros.municipio, /não é atendido/);
  assert.ok(validarEscola({ ...base, referencia: 'x'.repeat(121) }, { escolas, hoje: HOJE }).erros.referencia);
  const cursos = dado('cursos');
  const ok = { ...base, dre: 'DRE 2 — Lagarto', municipio: 'Lagarto', etapas: ['Ensino Médio'], cursos: { 'Ensino Médio': 'Ensino Médio em Tempo Integral' } };
  assert.equal(validarEscola(ok, { escolas, hoje: HOJE, dres, cursos }).ok, true);
  assert.ok(validarEscola({ ...ok, cursos: { 'Ensino Médio': 'Ensino Fundamental — Anos Finais' } }, { escolas, hoje: HOJE, dres, cursos }).erros.cursos, 'curso de outro nível');
  assert.equal(montarEscola(ok, { escolas, coordenadas: { lat: 0, lng: 0 }, hoje: HOJE }).atos[0].curso, 'Ensino Médio em Tempo Integral');
});
t('DREs de Sergipe: as 10 diretorias da SEDUC atendem os 75 municípios, cada um em uma só; bairros de cada município; 10 escolas reais por diretoria', () => {
  const dres = dado('dres');
  assert.equal(dres.length, 10, 'DEA + DRE 1 a DRE 9');
  assert.deepEqual(dres.map((d) => d.numero), [null, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const todos = dres.flatMap((d) => d.municipios);
  assert.equal(todos.length, 75, 'Sergipe tem 75 municípios'); assert.equal(new Set(todos).size, 75, 'nenhum município em duas DREs');
  for (const d of dres) assert.ok(d.municipios.includes(d.sede), `${d.dre}: a sede é um dos municípios`);
  const de = (m) => dres.find((d) => d.municipios.includes(m)).dre;
  assert.equal(de('Aracaju'), 'DEA — Aracaju'); assert.equal(de('São Cristóvão'), 'DRE 8 — Nossa Senhora do Socorro'); assert.equal(de('Boquim'), 'DRE 2 — Lagarto');
  assert.equal(de('Muribeca'), 'DRE 6 — Propriá'); assert.equal(de('Siriri'), 'DRE 4 — Japaratuba'); assert.equal(de('Porto da Folha'), 'DRE 7 — Gararu');
  const locais = dado('localidades');
  for (const m of todos) assert.ok(locais.municipios.some((x) => x.municipio === m), `${m}: tem coordenadas para o mapa`);
  for (const m of todos) assert.ok(locais.bairros.some((b) => b.municipio === m), `${m}: tem ao menos um bairro`);
  for (const b of locais.bairros) assert.ok(Number.isFinite(b.lat) && Number.isFinite(b.lng) && b.nome === `${b.municipio} — ${b.nome.split(' — ').pop()}`, `${b.nome}: nome e posição`);
  assert.equal(new Set(locais.bairros.map((b) => b.nome)).size, locais.bairros.length, 'bairro repetido');
  const temBairro = (m, b) => locais.bairros.some((x) => x.nome === `${m} — ${b}`);
  for (const x of dado('lista-espera')) assert.ok(temBairro(x.municipio, x.bairro), `lista de espera ${x.id}: ${x.bairro}, ${x.municipio} existe`);
  for (const e of escolas) assert.ok(temBairro(e.municipio, e.bairro), `${e.nome}: o bairro está na lista`);
  const contas = dado('usuarios').filter((u) => u.perfil === 'rede' && u.dre);
  // Escolas reais da rede (10 por diretoria): DRE certa pelo município, INEP sem repetição, atos e turmas de exemplo
  const reais = escolas.filter((e) => e.exemplo);
  for (const d of dres) assert.equal(reais.filter((e) => e.dre === d.dre).length, 10, `${d.dre}: 10 escolas`);
  const ineps = escolas.map((e) => e.inep).filter(Boolean); assert.equal(new Set(ineps).size, ineps.length, 'INEP repetido');
  const atosR = dado('atos'); const turmasR = dado('turmas-rede');
  for (const e of reais) {
    const meus = atosR.filter((a) => a.escolaId === e.id);
    assert.ok(meus.length && meus.every((a) => a.exemplo && a.series?.length), `${e.nome}: ato de exemplo com as séries`);
    const series = meus.flatMap((a) => a.series);
    assert.ok(turmasR.some((t) => t.escolaId === e.id), `${e.nome}: tem turma`);
    for (const t of turmasR.filter((x) => x.escolaId === e.id)) assert.ok(series.includes(t.serie) && t.matriculados <= t.capacidade, `${e.nome}: turma ${t.nome}`);
  }
  assert.deepEqual(contas.map((u) => u.dre).sort(), dres.map((d) => d.dre).sort(), 'uma conta de técnico por diretoria');
});
t('cursos: cadastro, nome repetido e curso em uso não desativa', () => {
  const cursos = dado('cursos');
  assert.equal(validarCurso({ nome: 'Ensino Médio Integrado — Técnico em Agropecuária', etapa: 'Ensino Médio', modalidade: 'Educação profissional (técnico integrado)' }, { cursos }).ok, true);
  assert.ok(validarCurso({ nome: 'ensino médio em tempo integral', etapa: 'Ensino Médio', modalidade: 'Tempo integral' }, { cursos }).erros.nome);
  assert.ok(validarCurso({ nome: 'Curso X qualquer', etapa: 'Superior', modalidade: 'Outra' }, { cursos }).erros.etapa);
  assert.equal(montarCurso({ nome: ' Curso Novo ', etapa: 'Ensino Médio', modalidade: 'Regular' }, { cursos, hoje: HOJE }).id, `c${cursos.length + 1}`);
  const regular = cursos.find((c) => c.nome === 'Ensino Médio — Formação Geral Básica');
  assert.equal(podeDesativarCurso(regular, dado('atos')).ok, false); assert.equal(podeDesativarCurso(cursos.find((c) => c.nome === 'EJA — Ensino Médio'), dado('atos')).ok, true);
});
t('ato renovado: o atual vai para o histórico, com o PDF, e nada se perde', () => {
  const ato = dado('atos').find((a) => a.escolaId === 'e1' && a.etapa === 'Ensino Médio');
  const pdf = { id: 'pdf-1', nome: 'resolucao.pdf', tamanho: 1200 };
  const r = aplicarRenovacaoDeAto({ ...ato, pdf: { id: 'pdf-0', nome: 'antigo.pdf', tamanho: 10 } }, { numero: 'Resolução CEE nº 400/2026', publicacao: '2026-10-01', vencimento: '2031-10-01', pdf });
  assert.equal(r.pdf.id, 'pdf-1'); assert.equal(r.historico[0].numero, ato.numero); assert.equal(r.historico[0].pdf.id, 'pdf-0');
  assert.equal(r.historico.length, (ato.historico || []).length + 1);
  const todos = atosDoNivel(r);
  assert.deepEqual(todos.map((x) => x.vigente), [true, ...r.historico.map(() => false)]); assert.equal(todos[0].numero, 'Resolução CEE nº 400/2026');
  assert.equal(r.series, ato.series); assert.equal(r.curso, ato.curso, 'séries e curso continuam');
});

console.log(`\n${n} grupos de testes passaram.`);
