// Domínio: procura por vaga contada por bairro, com dados que o próprio portal tem.
// Procura = pedidos de matrícula aguardando confirmação + crianças na lista de espera.
// Oferta = vagas das escolas do bairro, calculadas a partir das turmas (ver dominio/vagas.js), sem descontar os pedidos
// aguardando, porque eles já estão contados na procura.
// Funções puras, sem tela, testadas em tools/testar-cadastros.mjs.

/** Faixas da relação procura/oferta. Cores fixas porque os tiles do mapa são sempre claros. */
export const FAIXAS_PROCURA = {
  falta: { rotulo: 'Falta de vagas', regra: 'procura acima de 120% das vagas', cor: '#b42318', tipo: 'erro' },
  equilibrio: { rotulo: 'Equilibrado', regra: 'procura entre 90% e 120% das vagas', cor: '#8a5a00', tipo: 'atencao' },
  folga: { rotulo: 'Sobra de vagas', regra: 'procura abaixo de 90% das vagas', cor: '#0f5b3a', tipo: 'ok' }
};
/** Relação procura/vagas → faixa. Sem nenhuma vaga aberta, qualquer procura é falta. */
export const faixaDaRazao = (razao) => (razao > 1.2 ? 'falta' : razao >= 0.9 ? 'equilibrio' : 'folga');

/** Bairro de um pedido: o que a família informou; nos pedidos antigos, o bairro da escola escolhida. */
export function localDoPedido(pedido, escolas) {
  if (pedido.municipio && pedido.bairro) return { municipio: pedido.municipio, bairro: pedido.bairro };
  const e = escolas.find((x) => x.id === pedido.escolaId);
  return e ? { municipio: e.municipio, bairro: e.bairro } : null;
}

/**
 * Procura e oferta por bairro.
 * @param {{listaEspera: object[], pedidos: object[], escolas: object[], vagas: object, series: string[], municipios?: string[]|null}} p
 *   vagas: resultado de calcularVagas; series: séries consideradas; municipios: só estes municípios (null = todos).
 * @returns {Array<{municipio: string, bairro: string, espera: number, pedidos: number, procura: number, oferta: number, escolas: number, razao: number, faixa: string}>}
 *   Ordenado da maior falta para a maior sobra.
 */
export function procuraPorBairro({ listaEspera, pedidos, escolas, vagas, series, municipios = null }) {
  const linhas = new Map();
  const dentro = (m) => !municipios || municipios.includes(m);
  const linha = (municipio, bairro) => {
    const chave = `${municipio}|${bairro}`;
    if (!linhas.has(chave)) linhas.set(chave, { municipio, bairro, espera: 0, pedidos: 0, procura: 0, oferta: 0, escolas: 0 });
    return linhas.get(chave);
  };
  for (const item of listaEspera) {
    if (!series.includes(item.serie) || !dentro(item.municipio) || item.atendidoEm) continue;
    linha(item.municipio, item.bairro).espera += Number(item.quantidade) || 1;
  }
  for (const p of pedidos) {
    if (p.situacao !== 'Aguardando confirmação' || p.tipo === 'Rematrícula' || !series.includes(p.serie)) continue;
    const local = localDoPedido(p, escolas);
    if (local && dentro(local.municipio)) linha(local.municipio, local.bairro).pedidos += 1;
  }
  for (const e of escolas) {
    if (!dentro(e.municipio)) continue;
    const l = linha(e.municipio, e.bairro);
    l.escolas += 1;
    l.oferta += series.reduce((t, s) => t + (vagas[e.id]?.[s]?.oferta || 0), 0);
  }
  return [...linhas.values()].map((l) => {
    const procura = l.espera + l.pedidos;
    const razao = procura === 0 ? 0 : l.oferta ? procura / l.oferta : Infinity;
    return { ...l, procura, razao, faixa: faixaDaRazao(razao) };
  }).sort((a, b) => (b.razao === a.razao ? b.procura - a.procura : b.razao - a.razao));
}

/** Soma as linhas de bairro por município (mesmos campos). */
export function somarPorMunicipio(linhasDeBairro) {
  const m = new Map();
  for (const l of linhasDeBairro) {
    const t = m.get(l.municipio) || { municipio: l.municipio, espera: 0, pedidos: 0, procura: 0, oferta: 0, escolas: 0, bairros: 0 };
    for (const k of ['espera', 'pedidos', 'procura', 'oferta', 'escolas']) t[k] += l[k];
    t.bairros += 1;
    m.set(l.municipio, t);
  }
  return [...m.values()].map((t) => { const razao = t.procura === 0 ? 0 : t.oferta ? t.procura / t.oferta : Infinity; return { ...t, razao, faixa: faixaDaRazao(razao) }; });
}

/**
 * Entrada na lista de espera feita pela família quando nenhuma escola da cidade tem vaga na série.
 * @returns {{ok: boolean, erros: Record<string,string>}}
 */
export function validarEntradaNaEspera(f) {
  const e = {};
  if (!String(f.municipio ?? '').trim()) e.municipio = 'Escolha a cidade.';
  if (!String(f.bairro ?? '').trim()) e.bairro = 'Escolha o bairro onde vocês moram.';
  if (!String(f.serie ?? '').trim()) e.serie = 'Escolha a série.';
  if (String(f.estudante ?? '').trim().length < 3) e.estudante = 'Escreva o nome do estudante.';
  return { ok: !Object.keys(e).length, erros: e };
}
