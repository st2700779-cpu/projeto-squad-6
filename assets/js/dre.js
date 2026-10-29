// Acesso por DRE (diretoria regional). O técnico de uma DRE vê e altera só as escolas da sua regional;
// a equipe da SEED central (conta sem DRE) vê e altera todas. As DREs e os municípios de cada uma estão em data/dres.json:
// são as 10 diretorias da SEDUC/SE (DEA, em Aracaju, e DRE 1 a DRE 9), que juntas atendem os 75 municípios.
// Protótipo: a regra é aplicada nas telas. Em produção, o servidor também filtraria os dados pela DRE da conta.
import { sessao } from './auth.js';
import { esc } from './ui.js';
import { nomeAtualDaDre } from './dados.js';

/** DRE da conta logada, ou null (SEED central: todas as DREs). */
export const dreDaSessao = () => nomeAtualDaDre(sessao()?.dre) || null;
export const ehSeedCentral = () => !dreDaSessao();
/** A escola é da DRE da conta (a SEED central enxerga todas). */
export const daMinhaDre = (escola) => !dreDaSessao() || escola?.dre === dreDaSessao();

/** DREs que a conta pode escolher: todas para a SEED, só a própria para a DRE. */
export const dresDoAcesso = (dres) => dres.filter((d) => !dreDaSessao() || d.dre === dreDaSessao());

/**
 * Municípios de uma DRE (ou de todas as DREs que a conta enxerga, quando dre é vazio), em ordem alfabética.
 * extras: municípios que já aparecem nas escolas e não estão em dres.json (cadastros antigos).
 */
export function municipiosDa(dres, dre = '', extras = []) {
  const lista = dresDoAcesso(dres).filter((d) => !dre || d.dre === dre).flatMap((d) => d.municipios);
  return [...new Set([...lista, ...(dre || dreDaSessao() ? [] : extras)])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
/** DRE de um município (a primeira que o atende). */
export const dreDoMunicipio = (dres, municipio) => dres.find((d) => d.municipios.includes(municipio))?.dre || '';

/** Aviso no topo das telas da rede, para a pessoa saber o que está vendo. */
export const avisoDeAcesso = () => (dreDaSessao()
  ? `<p class="alerta-info aviso-dre" role="note"><span>Você está vendo só as escolas da <strong>${esc(dreDaSessao())}</strong>. Escolas de outras regionais ficam com o técnico de cada DRE e com a SEED.</span></p>`
  : '');

/**
 * Filtros de DRE e município para a barra de ferramentas. Para a DRE, o filtro de DRE não aparece (ela só vê a própria).
 * @returns {string} HTML com dois <div class="campo"> (ids filtro-dre e filtro-municipio)
 */
export function filtrosDreMunicipio({ dres, dre, municipio, extras = [] }) {
  const doAcesso = dresDoAcesso(dres);
  const municipios = municipiosDa(dres, dre, extras);
  return `${doAcesso.length > 1 ? `<div class="campo"><label for="filtro-dre">DRE</label><select id="filtro-dre" class="entrada"><option value="">Todas as DREs</option>${doAcesso.map((d) => `<option ${d.dre === dre ? 'selected' : ''}>${esc(d.dre)}</option>`).join('')}</select></div>` : ''}
    <div class="campo"><label for="filtro-municipio">Município</label><select id="filtro-municipio" class="entrada"><option value="">${dre || dreDaSessao() ? 'Todos os municípios da DRE' : 'Todos os municípios'}</option>${municipios.map((m) => `<option ${m === municipio ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>`;
}
