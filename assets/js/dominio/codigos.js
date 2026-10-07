// Os dois códigos do estudante, que costumam ser confundidos:
//  - código do aluno: identifica a PESSOA na rede inteira; nunca muda (ex.: ALU-31742);
//  - código da matrícula: identifica a MATRÍCULA do ano, naquela escola; muda a cada ano (ex.: 202610317).
// Cadastros completos (data/estudantes.json) trazem os dois. Para quem só aparece no diário, o protótipo gera códigos fixos a partir do id.

const numeroDoId = (id) => Number(String(id).replace(/\D/g, '')) || 0;

/** @param {{id: string, codigoAluno?: string, matricula?: string}} e @returns {{aluno: string, matricula: string, gerados: boolean}} */
export function codigosDoEstudante(e) {
  const n = numeroDoId(e.id);
  return {
    aluno: e.codigoAluno || `ALU-${String(10000 + ((n * 7919) % 89999)).padStart(5, '0')}`,
    matricula: e.matricula || `2026${String(10000 + ((n * 313) % 89999)).padStart(5, '0')}`,
    gerados: !(e.codigoAluno && e.matricula)
  };
}

/** Diz que tipo de código a pessoa digitou (ou null se não parece nenhum). */
export function tipoDoCodigo(texto) {
  const t = String(texto).trim().toUpperCase().replace(/\s+/g, '');
  if (/^ALU-?\d{3,5}$/.test(t)) return 'aluno';
  if (/^\d{9}$/.test(t)) return 'matricula';
  return null;
}
/** Normaliza para comparar: "alu 31742" e "ALU-31742" são o mesmo código do aluno. */
export const normalizarCodigo = (texto) => { const t = String(texto).trim().toUpperCase().replace(/\s+/g, ''); return /^ALU\d/.test(t) ? t.replace('ALU', 'ALU-') : t; };
