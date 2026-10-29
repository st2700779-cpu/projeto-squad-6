// Regras da sincronização do diário offline. Funções puras: recebem os dados do "servidor" e os registros pendentes
// e devolvem o que mudou, sem tocar em armazenamento (por isso são fáceis de testar).
//
// Conflito simples: cada nota lançada online grava em `meta` o instante do lançamento. Um registro pendente nasceu de um
// estado do servidor (`baseEm`). Se, ao sincronizar, o instante do servidor é outro, alguém mexeu no mesmo estudante
// nesse meio-tempo. Vale o registro MAIS RECENTE (comparando `criadoEm` do pendente com o instante do servidor) e a
// pessoa é avisada de qual venceu.

/**
 * @param {Array<object>} registros pendentes: {tipo:'notas', turmaId, alunoId, valores:{n1,n2,faltas}, baseEm, criadoEm} ou
 *   {tipo:'chamada', turmaId, data, ausentes:[ids], criadoEm}
 * @param {{dados: Record<string, object[]>, chamadas: Record<string, Record<string, object>>, meta: Record<string, {em:string}>}} servidor
 * @returns {{enviados: number, conflitos: Array<{nome:string, resultado:'mantido'|'sobrescrito', servidorEm:string, localEm:string, assunto:string}>}}
 *   Altera `servidor` no lugar.
 */
export function aplicarPendentes(registros, servidor) {
  const { dados, chamadas, meta } = servidor;
  const saida = { enviados: 0, conflitos: [] };
  const ordenados = [...registros].sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  for (const r of ordenados) {
    const alunos = dados[r.turmaId] || [];
    if (r.tipo === 'notas') {
      const aluno = alunos.find((a) => a.id === r.alunoId);
      if (!aluno) continue;
      const chave = `${r.turmaId}|${r.alunoId}`;
      const doServidor = meta[chave];
      const mexeram = doServidor && doServidor.em !== r.baseEm;
      if (mexeram && doServidor.em > r.criadoEm) { saida.conflitos.push({ nome: aluno.nome, assunto: 'notas e faltas', resultado: 'mantido', servidorEm: doServidor.em, localEm: r.criadoEm }); continue; }
      if (mexeram) saida.conflitos.push({ nome: aluno.nome, assunto: 'notas e faltas', resultado: 'sobrescrito', servidorEm: doServidor.em, localEm: r.criadoEm });
      Object.assign(aluno, r.valores);
      meta[chave] = { em: r.criadoEm };
      saida.enviados += 1;
    } else if (r.tipo === 'chamada') {
      const ja = chamadas[r.turmaId]?.[r.data];
      if (ja && ja.quando > r.criadoEm) { saida.conflitos.push({ nome: `Chamada de ${r.data.split('-').reverse().join('/')}`, assunto: 'chamada', resultado: 'mantido', servidorEm: ja.quando, localEm: r.criadoEm }); continue; }
      if (ja) {
        // a chamada do servidor é mais antiga e será substituída: desfaz as faltas que ela tinha lançado
        alunos.forEach((a) => { if (ja.ausentes.includes(a.id)) a.faltas = Math.max(0, a.faltas - 1); });
        saida.conflitos.push({ nome: `Chamada de ${r.data.split('-').reverse().join('/')}`, assunto: 'chamada', resultado: 'sobrescrito', servidorEm: ja.quando, localEm: r.criadoEm });
      }
      alunos.forEach((a) => { if (r.ausentes.includes(a.id)) a.faltas += 1; });
      chamadas[r.turmaId] = { ...(chamadas[r.turmaId] || {}), [r.data]: { ausentes: r.ausentes, quando: r.criadoEm } };
      saida.enviados += 1;
    }
  }
  return saida;
}

/** Aplica os pendentes só na memória, para a tela mostrar o que já foi digitado. Não mexe em meta. */
export function sobreporPendentes(registros, { dados, chamadas }) {
  for (const r of [...registros].sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))) {
    const alunos = dados[r.turmaId] || [];
    if (r.tipo === 'notas') Object.assign(alunos.find((a) => a.id === r.alunoId) || {}, r.valores);
    if (r.tipo === 'chamada' && !chamadas[r.turmaId]?.[r.data]) {
      alunos.forEach((a) => { if (r.ausentes.includes(a.id)) a.faltas += 1; });
      chamadas[r.turmaId] = { ...(chamadas[r.turmaId] || {}), [r.data]: { ausentes: r.ausentes, quando: r.criadoEm, pendente: true } };
    }
  }
}
