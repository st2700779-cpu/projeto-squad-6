// Testes das regras dos painéis (semáforo, margem de faltas, calculadora, agenda, horários e PROFIN).
// Uso (Node 22+, sem instalar nada):  node tools/testar-painel.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semaforoNota, semaforoFrequencia, semaforoPrazo, rotuloDoPrazo, diasEntre, limiteDeFaltas, margemDeFaltas, fraseDaMargem, simularFaltas, notaNecessaria, montarAgenda, proximaProva, faixaDaSerie, selosDoEstudante, prioridades, resumoDoDiario, desempenhoDaTurma } from '../assets/js/dominio/painel.js';
import { horaDaAula, diaDaSemana, aulasDoDia, aulasDoProfessor, conflitosDeHorario, horarioDaTurma, proximoDiaDeAula } from '../assets/js/dominio/horario.js';
import { situacaoDaPrestacao, adimplenciaDaEscola, saldo, percentualExecutado } from '../assets/js/dominio/profin.js';
import { proximaSerie, etapaDaSerie } from '../assets/js/dominio/matricula.js';

const dado = (n) => JSON.parse(readFileSync(new URL(`../data/${n}.json`, import.meta.url), 'utf8'));
let n = 0;
const t = (nome, fn) => { fn(); n += 1; console.log(`ok  ${nome}`); };

t('semáforo de nota: 6 é verde, 5,9 é amarelo, 3,9 é vermelho, sem nota é neutro', () => {
  assert.equal(semaforoNota(6).chave, 'verde'); assert.equal(semaforoNota(5.9).chave, 'amarelo');
  assert.equal(semaforoNota(4).chave, 'amarelo'); assert.equal(semaforoNota(3.9).chave, 'vermelho');
  assert.equal(semaforoNota(null).chave, 'neutro');
  for (const m of [7, 5, 2, null]) assert.ok(semaforoNota(m).texto, 'todo nível tem texto'); // nunca só cor
});
t('semáforo de frequência: 85 e 75 são os cortes', () => {
  assert.equal(semaforoFrequencia(85).chave, 'verde'); assert.equal(semaforoFrequencia(84.9).chave, 'amarelo');
  assert.equal(semaforoFrequencia(75).chave, 'amarelo'); assert.equal(semaforoFrequencia(74.9).chave, 'vermelho');
});
t('dias entre datas e rótulo do prazo', () => {
  assert.equal(diasEntre('2026-10-07', '2026-10-13'), 6); assert.equal(diasEntre('2026-10-07', '2026-10-05'), -2);
  assert.equal(diasEntre('2026-02-27', '2026-03-01'), 2);
  assert.equal(rotuloDoPrazo(0), 'Vence hoje'); assert.equal(rotuloDoPrazo(1), 'Vence amanhã');
  assert.equal(rotuloDoPrazo(-1), 'Atrasado há 1 dia'); assert.equal(rotuloDoPrazo(5), 'Vence em 5 dias');
  assert.equal(semaforoPrazo(3).chave, 'vermelho'); assert.equal(semaforoPrazo(4).chave, 'amarelo'); assert.equal(semaforoPrazo(15).chave, 'verde');
});
t('margem de faltas: limite = 25% das aulas dadas; 83 aulas → 20 faltas', () => {
  assert.equal(limiteDeFaltas(83), 20); assert.equal(limiteDeFaltas(80), 20); assert.equal(limiteDeFaltas(100), 25);
  const m = margemDeFaltas(13, 83);
  assert.deepEqual([m.limite, m.restantes, m.estado], [20, 7, 'folga']);
  assert.equal(margemDeFaltas(20, 83).estado, 'no-limite'); assert.equal(margemDeFaltas(21, 83).estado, 'acima');
  assert.match(fraseDaMargem(margemDeFaltas(13, 83)), /7 aulas/); assert.match(fraseDaMargem(margemDeFaltas(1, 4)), /0|limite/);
  assert.doesNotMatch(fraseDaMargem(m), /vida|game|perdeu/i); // linguagem neutra
});
t('o limite de 20 faltas em 83 aulas bate com a regra de 75% de notas.js', () => {
  const ok = (f, a) => 100 - (f / a) * 100 >= 75;
  assert.ok(ok(20, 83)); assert.ok(!ok(21, 83)); assert.ok(ok(20, 80)); assert.ok(!ok(21, 80));
});
t('simular falta: faltar 5 aulas em 83 muda margem e percentual', () => {
  const s = simularFaltas(13, 83, 5);
  assert.deepEqual([s.faltas, s.aulasDadas], [18, 88]);
  assert.equal(s.margem.limite, 22); assert.equal(s.margem.restantes, 4);
  assert.ok(s.presenca < 100 - (13 / 83) * 100);
});
t('calculadora: média 6 em 4 bimestres', () => {
  assert.deepEqual(pick(notaNecessaria([5, 5, null, null])), { estado: 'possivel', restantes: 2, precisa: 7 });
  assert.equal(notaNecessaria([8, 8, null, null]).precisa, 4);
  assert.equal(notaNecessaria([9, 9, 9, null]).estado, 'ja-alcancada'); assert.equal(notaNecessaria([9, 9, 9, null]).precisa, 0);
  assert.equal(notaNecessaria([2, 2, null, null]).precisa, 10); // 10 em todas as que faltam ainda fecha a média
  assert.equal(notaNecessaria([1, 1, null, null]).estado, 'impossivel');
  assert.equal(notaNecessaria([1, 1, null, null]).precisaRecuperacao, 7); // para a média 4 ainda dá
  assert.equal(notaNecessaria([6, 6, 6, 6]).estado, 'completo'); assert.equal(notaNecessaria([6, 6, 6, 6]).media, 6);
  assert.equal(notaNecessaria([null, null, null, null]).precisa, 6);
  assert.equal(notaNecessaria(['', '5,0'.replace(',', '.'), null, null]).restantes, 3);
  assert.equal(notaNecessaria([7.5, 6.1, null, null], 7).precisa, 7.2); // (28 − 13,6) ÷ 2 = 7,2
});
function pick(r) { return { estado: r.estado, restantes: r.restantes, precisa: r.precisa }; }

t('agenda: ordena por data, agrupa por urgência e separa os feitos', () => {
  const agenda = dado('agenda');
  const { aFazer, feitos } = montarAgenda({ serie: '1ª série EM', agenda, hoje: '2026-10-07', feitos: ['ag1'] });
  assert.equal(feitos.length, 1); assert.equal(feitos[0].id, 'ag1');
  assert.equal(aFazer[0].id, 'ag2'); assert.equal(aFazer[0].grupo, 'Esta semana');
  assert.deepEqual(aFazer.map((i) => i.data), [...aFazer.map((i) => i.data)].sort());
  assert.equal(proximaProva(aFazer).id, 'ag3');
  assert.equal(montarAgenda({ serie: '1ª série EM', agenda, hoje: '2026-10-09' }).aFazer[0].grupo, 'Atrasado');
  assert.ok(montarAgenda({ serie: 'outra', agenda, hoje: '2026-10-07' }).aFazer.length === 0);
});
t('faixa etária pela série', () => {
  assert.equal(faixaDaSerie('3º ano'), 'iniciais'); assert.equal(faixaDaSerie('5º ano'), 'iniciais');
  assert.equal(faixaDaSerie('6º ano'), 'finais'); assert.equal(faixaDaSerie('9º ano'), 'finais'); assert.equal(faixaDaSerie('1ª série EM'), 'medio');
  assert.equal(proximaSerie('3º ano'), '4º ano'); assert.equal(proximaSerie('5º ano'), '6º ano'); assert.equal(proximaSerie('3ª série EM'), null); assert.equal(proximaSerie('7º ano'), '8º ano');
  assert.equal(etapaDaSerie('3º ano'), 'Ensino Fundamental — Anos Iniciais'); assert.equal(etapaDaSerie('7º ano'), 'Ensino Fundamental — Anos Finais');
});
t('selos: só quem cumpriu o critério ganha', () => {
  const linhas = [{ materia: 'A', n1: 10, n2: 9, media: 9.5 }, { materia: 'B', n1: 5, n2: 6, media: 5.5 }];
  const s = Object.fromEntries(selosDoEstudante({ linhas, presenca: 95, tentativasDoQuiz: [{ certas: 4, total: 5 }] }).map((x) => [x.id, x.conquistado]));
  assert.deepEqual(s, { 'nota-10': true, presenca: true, 'todas-na-media': false, subiu: true, quiz: true, 'quiz-80': true });
  const v = Object.fromEntries(selosDoEstudante({ linhas: [], presenca: 60 }).map((x) => [x.id, x.conquistado]));
  assert.ok(Object.values(v).every((x) => x === false));
});
t('resumo do diário e desempenho da turma tt1', () => {
  const dia = dado('professor').diario.tt1; const lv = dado('letivo');
  const r = resumoDoDiario(dia, lv.aulasDadas);
  assert.equal(r.alunos, 37); assert.ok(r.frequenciaMedia > 70 && r.frequenciaMedia <= 100); assert.ok(r.abaixo75 >= 1);
  const d = desempenhoDaTurma({ id: 'tt1', matriculados: 37 }, dia, dado('desempenho').tt1, lv.aulasDadas);
  assert.ok(d.componentes['Matemática'] > 0 && d.componentes['Língua Portuguesa'] > 0 && d.doDiario);
  const r1 = desempenhoDaTurma({ id: 'r1', matriculados: 31 }, undefined, dado('desempenho').r1, lv.aulasDadas);
  assert.equal(r1.doDiario, false); assert.ok(r1.componentes['Matemática'] > 0);
});
t('horários: grades completas, hora por turno e sem choque de professor', () => {
  const hs = dado('horarios');
  for (const h of hs) { const n = h.turmaId === 'r20' ? 4 : 5; for (const d of ['seg', 'ter', 'qua', 'qui', 'sex']) assert.equal(h.aulas[d].length, n, `${h.turma} ${d}`); }
  assert.deepEqual(horaDaAula('Manhã', 0), { inicio: '07:30', fim: '08:20' }); assert.deepEqual(horaDaAula('Tarde', 2), { inicio: '15:30', fim: '16:20' });
  assert.equal(diaDaSemana('2026-10-07'), 'qua'); assert.equal(diaDaSemana('2026-10-10'), 'sab');
  const vistos = new Set();
  for (const h of hs) for (const d of ['seg', 'ter', 'qua', 'qui', 'sex']) aulasDoDia(h, d).forEach((a) => { if (!a.professorId) return; const k = `${a.professorId}|${h.turno}|${d}|${a.indice}`; assert.ok(!vistos.has(k), `choque ${k}`); vistos.add(k); });
  assert.equal(aulasDoProfessor(hs, 'p1').length, 11); // 4 + 3 + 4 aulas de Matemática, como na alocação
  assert.ok(aulasDoProfessor(hs, 'p1').every((a) => a.componente === 'Matemática'));
  assert.equal(horarioDaTurma(hs, { escolaId: 'e1', turma: '1ª série A' }).turmaId, 'tt1');
  assert.equal(proximoDiaDeAula(horarioDaTurma(hs, { escolaId: 'e1', turma: '1ª série A' }), '2026-10-10').dia, 'seg');
  const aula = hs[0].aulas.seg[0];
  assert.deepEqual(conflitosDeHorario(hs, { turmaId: 'tt1', dia: 'seg', indice: 0, professorId: null }), []);
  const outra = hs.find((h) => h.turmaId === 'tt4'); const ocupada = outra.aulas.seg.findIndex((a) => a.professorId === 'p3');
  if (ocupada >= 0) assert.equal(conflitosDeHorario(hs, { turmaId: 'tt1', dia: 'seg', indice: ocupada, professorId: 'p3' }).length, 1);
  assert.ok(aula.componente);
});
t('PROFIN: situação por prestação e pior caso da escola', () => {
  const p = dado('profin'); const hoje = '2026-10-07';
  const e1 = p.repasses.filter((r) => r.escolaId === 'e1');
  assert.deepEqual(e1.map((r) => situacaoDaPrestacao(r, hoje).chave), ['amarelo', 'verde', 'verde', 'vermelho']);
  const a = adimplenciaDaEscola(e1, hoje); assert.equal(a.chave, 'vermelho'); assert.match(a.texto, /suspenso/);
  const de = (id) => adimplenciaDaEscola(p.repasses.filter((r) => r.escolaId === id), hoje);
  assert.deepEqual(['e2', 'e3', 'e4', 'e5'].map((id) => de(id).chave), ['verde', 'amarelo', 'vermelho', 'verde']);
  assert.equal(situacaoDaPrestacao(p.repasses.find((r) => r.escolaId === 'e2' && r.categoria === 'Emenda Parlamentar'), hoje).chave, 'neutro');
  assert.equal(saldo({ recebido: 100, executado: 33.3 }), 66.7); assert.equal(percentualExecutado({ recebido: 200, executado: 50 }), 25); assert.equal(percentualExecutado({ recebido: 0, executado: 0 }), 0);
});
t('prioridades do responsável: do mais grave ao menos grave, com documento e evento', () => {
  const est = dado('estudantes')[0]; const lv = dado('letivo');
  const linhas = Object.entries(est.notas).map(([materia, [a, b]]) => ({ materia, media: Math.round(((a + b) / 2) * 10) / 10 }));
  const lista = prioridades({ nome: 'Iasmim', presenca: 84.3, margem: { restantes: 7 }, linhas, documentos: est.documentos, eventos: dado('calendario'), hoje: lv.dataReferencia });
  assert.ok(lista.length >= 4);
  assert.deepEqual(lista.map((i) => i.ordem), [...lista.map((i) => i.ordem)].sort((a, b) => a - b));
  assert.equal(lista[0].nivel.chave, 'amarelo'); // sem item vermelho: documento vence em 9 dias, frequência em 84,3%
  assert.ok(lista.some((i) => i.destino === 'documentos' && /16\/10/.test(i.texto)));
  assert.ok(lista.some((i) => i.nivel.texto === 'Em 15 dias' && /Reunião/.test(i.titulo)));
  assert.ok(lista.every((i) => i.nivel.texto && i.titulo && i.texto), 'todo item tem palavra');
  const grave = prioridades({ nome: 'Beto', presenca: 70, margem: { restantes: -3 }, linhas: [{ materia: 'X', media: 3 }], hoje: lv.dataReferencia });
  assert.deepEqual(grave.map((i) => i.nivel.chave), ['vermelho', 'vermelho']);
  assert.deepEqual(prioridades({ nome: 'Ok', presenca: 95, margem: { restantes: 10 }, linhas: [{ materia: 'X', media: 8 }], hoje: lv.dataReferencia }), []);
});
console.log(`\n${n} grupos de testes passaram.`);
