// Regras de negócio da rede aplicadas sobre os dados simulados.
export const SERIES = ['6º ano', '7º ano', '8º ano', '9º ano', '1ª série EM', '2ª série EM', '3ª série EM'];
export const etapaDaSerie = (serie) => (serie.includes('EM') ? 'Ensino Médio' : 'Ensino Fundamental — Anos Finais');
export const MEDIA_APROVACAO = 6;
export const PRESENCA_MINIMA = 75;

// Situação de um ato autorizativo em relação a hoje.
export function situacaoAto(ato, hoje = new Date()) {
  const fim = new Date(ato.validade + 'T23:59:59');
  const dias = Math.ceil((fim - hoje) / 86400000);
  if (dias < 0) return { vigente: false, texto: 'Vencido', tipo: 'erro', dias };
  if (dias <= 90) return { vigente: true, texto: `Vence em ${dias} dias`, tipo: 'atencao', dias };
  return { vigente: true, texto: 'Vigente', tipo: 'ok', dias };
}

// RN-01 e RN-04: só oferta a série quem tem ato vigente para a etapa.
export function atoDaEtapa(atos, escolaId, serie) {
  return atos.find((a) => a.escolaId === escolaId && a.etapa === etapaDaSerie(serie)) || null;
}
export function motivoBloqueio({ atos, vagas, escolaId, serie }) {
  const ato = atoDaEtapa(atos, escolaId, serie);
  if (!ato) return 'Esta escola não oferece esta série.';
  if (!situacaoAto(ato).vigente) return 'Sem autorização vigente para esta série.';
  if (!(vagas[escolaId]?.[serie] > 0)) return 'Sem vagas nesta série.';
  return null;
}

export const media = (n1, n2) => (Number(n1) + Number(n2)) / 2;
export const presenca = (faltas, aulasDadas) => Math.max(0, 100 - (faltas / aulasDadas) * 100);
