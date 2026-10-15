// Testes das regras de cadastro (escola e ato, professor, equipe do PROFIN, carga horária) e da prestação de contas
// (declaração dos gastos e retorno do PROFIN).
// Uso (Node 22+, sem instalar nada):  node tools/testar-cadastros.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cpfValido, validarEscola, montarEscola, validarProfessor, montarProfessor, validarMembroProfin, montarMembroProfin, podeDesativar, cargaAnualHoras, situacaoDaCarga, validarCarga, cargaPadrao, seriesDaEtapa, ETAPAS, mascararCpf } from '../assets/js/dominio/cadastros.js';
import { validarLancamento, validarDeclaracao, validarRetorno, aplicarDeclaracoes, valorAprovado, totalDosLancamentos, situacaoDaDeclaracao } from '../assets/js/dominio/prestacao.js';
import { adimplenciaDaEscola, situacaoDaPrestacao } from '../assets/js/dominio/profin.js';

const dado = (n) => JSON.parse(readFileSync(new URL(`../data/${n}.json`, import.meta.url), 'utf8'));
const HOJE = '2026-10-07';
let n = 0;
const t = (nome, fn) => { fn(); n += 1; console.log(`ok  ${nome}`); };

const escolas = dado('escolas');
const profs = dado('professores');
const base = { nome: 'Escola Estadual Nova Esperança', inep: '28123456', municipio: 'Lagarto', dre: 'DRE 06 — Lagarto', logradouro: 'Rua das Palmeiras', numero: '120', bairro: 'Centro', cep: '49400-000', telefone: '(79) 3333-4444', email: 'nova.esperanca@escola.se.gov.br', atoTipo: 'Criação de escola', atoNumero: 'Resolução CEE nº 100/2026', atoPublicacao: '2026-08-10', atoVencimento: '2031-08-10', origemId: '', etapas: ['Ensino Fundamental — Anos Finais'] };

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

console.log(`\n${n} grupos de testes passaram.`);
