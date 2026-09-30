// Junta o trajeto do estudante (data/trajetorias.json) com o nome das escolas da rede.
export function trajetoDoEstudante(trajetorias, id, escolas) {
  return (trajetorias.estudantes[id] || []).map((t) => ({ ...t, escola: t.escolaId ? escolas.find((e) => e.id === t.escolaId)?.nome || t.escolaId : t.escolaNome }));
}
