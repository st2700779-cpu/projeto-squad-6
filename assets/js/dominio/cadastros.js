// Domínio: cadastros da rede (escola com ato autorizativo, professor, equipe do PROFIN) e carga horária por série.
// Funções puras, sem tela: cada validação devolve { ok, erros } com UMA mensagem em português por campo.
import { normalizar } from './texto.js';

export const somenteDigitos = (v) => String(v ?? '').replace(/\D/g, '');

/** Níveis de ensino. Cada nível, ao ser liberado por um ato autorizativo, libera as séries listadas. */
export const ETAPAS = [
  { etapa: 'Ensino Fundamental — Anos Iniciais', curto: 'Anos Iniciais', resumo: '1º ao 5º ano', series: ['1º ano', '2º ano', '3º ano', '4º ano', '5º ano'] },
  { etapa: 'Ensino Fundamental — Anos Finais', curto: 'Anos Finais', resumo: '6º ao 9º ano', series: ['6º ano', '7º ano', '8º ano', '9º ano'] },
  { etapa: 'Ensino Médio', curto: 'Ensino Médio', resumo: '1ª a 3ª série', series: ['1ª série EM', '2ª série EM', '3ª série EM'] }
];
export const seriesDaEtapa = (etapa) => ETAPAS.find((e) => e.etapa === etapa)?.series || [];
export const TIPOS_DE_ATO = ['Criação de escola', 'Divisão de escola', 'Autorização de funcionamento', 'Reconhecimento de curso', 'Renovação de reconhecimento'];
export const VINCULOS = ['Efetivo', 'Contratado (REDA)'];
export const FUNCOES_PROFIN = ['Coordenação do PROFIN', 'Analista financeiro', 'Apoio administrativo'];

/** CPF com os dois dígitos verificadores (rejeita sequências repetidas como 111.111.111-11). */
export function cpfValido(valor) {
  const c = somenteDigitos(valor);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const dv = (n) => { let s = 0; for (let i = 0; i < n; i += 1) s += Number(c[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
}
export const cepValido = (v) => somenteDigitos(v).length === 8;
export const inepValido = (v) => somenteDigitos(v).length === 8;
export const emailValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v ?? '').trim());
export const telefoneValido = (v) => [10, 11].includes(somenteDigitos(v).length);
export const dataValida = (iso) => /^\d{4}-\d{2}-\d{2}$/.test(String(iso ?? '')) && !Number.isNaN(Date.parse(`${iso}T12:00:00Z`)) && new Date(`${iso}T12:00:00Z`).toISOString().slice(0, 10) === iso;
export const mascararCpf = (v) => { const c = somenteDigitos(v); return c.length === 11 ? `***.${c.slice(3, 6)}.${c.slice(6, 9)}-**` : ''; };

const resultado = (erros) => ({ ok: Object.keys(erros).length === 0, erros });
const iguais = (a, b) => normalizar(a).replace(/\s+/g, ' ').trim() === normalizar(b).replace(/\s+/g, ' ').trim();

/**
 * Cadastro de escola com o ato autorizativo.
 * @param {object} f nome, inep, municipio, dre, logradouro, numero, bairro, cep, telefone, email, atoTipo, atoNumero, atoPublicacao, atoVencimento, origemId, etapas[]
 * @param {{escolas: Array<{id:string,nome:string,municipio:string,inep?:string}>, hoje: string}} ctx
 */
export function validarEscola(f, { escolas, hoje }) {
  const e = {};
  if (String(f.nome ?? '').trim().length < 5) e.nome = 'Escreva o nome da escola, com pelo menos 5 letras.';
  else if (escolas.some((x) => iguais(x.nome, f.nome) && iguais(x.municipio, f.municipio))) e.nome = 'Já existe uma escola com esse nome neste município.';
  if (!inepValido(f.inep)) e.inep = 'O código INEP tem 8 números.';
  else if (escolas.some((x) => x.inep && somenteDigitos(x.inep) === somenteDigitos(f.inep))) e.inep = 'Esse código INEP já está cadastrado em outra escola.';
  if (!String(f.municipio ?? '').trim()) e.municipio = 'Escolha o município.';
  if (!String(f.dre ?? '').trim()) e.dre = 'Escolha a DRE (diretoria regional).';
  if (String(f.logradouro ?? '').trim().length < 3) e.logradouro = 'Escreva a rua ou avenida.';
  if (String(f.bairro ?? '').trim().length < 2) e.bairro = 'Escreva o bairro ou povoado.';
  if (!cepValido(f.cep)) e.cep = 'O CEP tem 8 números.';
  if (String(f.telefone ?? '').trim() && !telefoneValido(f.telefone)) e.telefone = 'Telefone com DDD, de 10 ou 11 números.';
  if (String(f.email ?? '').trim() && !emailValido(f.email)) e.email = 'Escreva um e-mail válido, como secretaria@escola.se.gov.br.';
  if (!TIPOS_DE_ATO.includes(f.atoTipo)) e.atoTipo = 'Escolha o tipo do ato autorizativo.';
  if (String(f.atoNumero ?? '').trim().length < 3) e.atoNumero = 'Escreva o número do ato, como Resolução CEE nº 100/2026.';
  if (!dataValida(f.atoPublicacao)) e.atoPublicacao = 'Informe a data de publicação do ato.';
  else if (f.atoPublicacao > hoje) e.atoPublicacao = 'A publicação não pode ser depois de hoje.';
  if (!dataValida(f.atoVencimento)) e.atoVencimento = 'Informe a data de vencimento do ato.';
  else if (dataValida(f.atoPublicacao) && f.atoVencimento <= f.atoPublicacao) e.atoVencimento = 'O vencimento tem de ser depois da publicação.';
  else if (f.atoVencimento < hoje) e.atoVencimento = 'Esse ato já venceu. Informe um ato vigente.';
  const etapas = (f.etapas || []).filter((x) => ETAPAS.some((t) => t.etapa === x));
  if (!etapas.length) e.etapas = 'Marque pelo menos um nível de ensino liberado pelo ato.';
  if (f.atoTipo === 'Divisão de escola') {
    if (!f.origemId) e.origemId = 'Escolha a escola que foi dividida.';
    else if (!escolas.some((x) => x.id === f.origemId)) e.origemId = 'Escolha uma escola da lista.';
  }
  return resultado(e);
}

/** Próximo identificador de escola (e1, e2, …). */
export const proximoIdDeEscola = (escolas) => `e${1 + Math.max(0, ...escolas.map((x) => Number(/^e(\d+)$/.exec(x.id)?.[1] || 0)))}`;

/**
 * Monta os registros a gravar: a escola, um ato por nível liberado e as vagas zeradas das séries liberadas
 * (a secretaria ou a rede abre as vagas depois).
 */
export function montarEscola(f, { escolas, coordenadas, hoje }) {
  const id = proximoIdDeEscola(escolas);
  const etapas = ETAPAS.filter((t) => (f.etapas || []).includes(t.etapa));
  const escola = {
    id, nome: f.nome.trim(), inep: somenteDigitos(f.inep), municipio: f.municipio.trim(), dre: f.dre.trim(), bairro: f.bairro.trim(),
    endereco: `${f.logradouro.trim()}${String(f.numero ?? '').trim() ? `, ${String(f.numero).trim()}` : ', s/n'} — ${f.bairro.trim()} — CEP ${somenteDigitos(f.cep).replace(/^(\d{5})(\d{3})$/, '$1-$2')}`,
    telefone: somenteDigitos(f.telefone), email: String(f.email ?? '').trim(), lat: coordenadas.lat, lng: coordenadas.lng, coordenadasAproximadas: true,
    origemId: f.atoTipo === 'Divisão de escola' ? f.origemId : null, cadastradaEm: hoje
  };
  const atos = etapas.map((t) => ({
    escolaId: id, etapa: t.etapa, numero: f.atoNumero.trim(), validade: f.atoVencimento, publicacao: f.atoPublicacao, tipo: f.atoTipo,
    curso: t.etapa, origemId: escola.origemId
  }));
  const vagas = Object.fromEntries(etapas.flatMap((t) => t.series.map((s) => [s, 0])));
  return { escola, atos, vagas };
}

/**
 * Cadastro de professor.
 * @param {object} f nome, cpf, matriculaFuncional, vinculo, formacao, habilitacao[], cargaHorariaSemanal, escolaId, email, telefone
 * @param {{professores: object[], escolas: object[], componentes: string[]}} ctx
 */
export function validarProfessor(f, { professores, escolas, componentes }) {
  const e = {};
  const palavras = String(f.nome ?? '').trim().split(/\s+/).filter(Boolean);
  if (palavras.length < 2 || String(f.nome).trim().length < 8) e.nome = 'Escreva o nome completo, com nome e sobrenome.';
  if (!cpfValido(f.cpf)) e.cpf = 'CPF inválido. Confira os 11 números.';
  else if (professores.some((p) => p.cpf && somenteDigitos(p.cpf) === somenteDigitos(f.cpf))) e.cpf = 'Esse CPF já está cadastrado.';
  const mat = String(f.matriculaFuncional ?? '').trim().toUpperCase();
  if (!/^PF-\d{5}$/.test(mat)) e.matriculaFuncional = 'A matrícula funcional é PF- e 5 números, como PF-30999.';
  else if (professores.some((p) => String(p.matriculaFuncional).toUpperCase() === mat)) e.matriculaFuncional = 'Essa matrícula funcional já é de outro professor.';
  if (!VINCULOS.includes(f.vinculo)) e.vinculo = 'Escolha o vínculo do professor.';
  if (String(f.formacao ?? '').trim().length < 5) e.formacao = 'Escreva a formação, como Licenciatura em Matemática.';
  const hab = (f.habilitacao || []).filter((c) => componentes.includes(c));
  if (!hab.length) e.habilitacao = 'Marque pelo menos um componente em que o professor é habilitado.';
  const ch = Number(f.cargaHorariaSemanal);
  if (![10, 20, 30, 40].includes(ch)) e.cargaHorariaSemanal = 'Escolha a carga horária semanal: 10, 20, 30 ou 40 horas.';
  if (!escolas.some((x) => x.id === f.escolaId)) e.escolaId = 'Escolha a escola de lotação.';
  if (String(f.email ?? '').trim() && !emailValido(f.email)) e.email = 'Escreva um e-mail válido.';
  if (String(f.telefone ?? '').trim() && !telefoneValido(f.telefone)) e.telefone = 'Telefone com DDD, de 10 ou 11 números.';
  return resultado(e);
}

export function montarProfessor(f, { professores, hoje }) {
  const n = 1 + Math.max(0, ...professores.map((p) => Number(/^p(\d+)$/.exec(p.id)?.[1] || 0)));
  const hab = [...f.habilitacao];
  return {
    id: `p${n}`, nome: f.nome.trim(), concurso: `Professor de ${hab[0]}`, formacao: f.formacao.trim(), habilitacao: hab, cargaHorariaSemanal: Number(f.cargaHorariaSemanal),
    aulasEmOutrasTurmas: 0, matriculaFuncional: f.matriculaFuncional.trim().toUpperCase(), escolaId: f.escolaId, vinculo: f.vinculo,
    cpf: somenteDigitos(f.cpf), email: String(f.email ?? '').trim(), telefone: somenteDigitos(f.telefone), cadastradoEm: hoje
  };
}

/** Equipe do PROFIN: coordenação, analistas e apoio. */
export function validarMembroProfin(f, { equipe }) {
  const e = {};
  const palavras = String(f.nome ?? '').trim().split(/\s+/).filter(Boolean);
  if (palavras.length < 2 || String(f.nome).trim().length < 8) e.nome = 'Escreva o nome completo, com nome e sobrenome.';
  if (!FUNCOES_PROFIN.includes(f.funcao)) e.funcao = 'Escolha a função na equipe.';
  const mat = String(f.matricula ?? '').trim().toUpperCase();
  if (!/^PF-\d{5}$/.test(mat)) e.matricula = 'A matrícula funcional é PF- e 5 números, como PF-41007.';
  else if (equipe.some((m) => String(m.matricula).toUpperCase() === mat)) e.matricula = 'Essa matrícula já está na equipe.';
  if (!emailValido(f.email)) e.email = 'Escreva o e-mail institucional, como nome@seed.se.gov.br.';
  else if (equipe.some((m) => normalizar(m.email) === normalizar(f.email))) e.email = 'Esse e-mail já está na equipe.';
  if (String(f.telefone ?? '').trim() && !telefoneValido(f.telefone)) e.telefone = 'Telefone com DDD, de 10 ou 11 números.';
  if (!String(f.atende ?? '').trim()) e.atende = 'Diga quais escolas ou DREs a pessoa atende.';
  return resultado(e);
}

export const coordenadoresAtivos = (equipe) => equipe.filter((m) => m.funcao === 'Coordenação do PROFIN' && m.ativo !== false);
/** A equipe nunca fica sem coordenação: não dá para desativar a última pessoa nessa função. */
export function podeDesativar(equipe, id) {
  const m = equipe.find((x) => x.id === id);
  if (!m) return { ok: false, motivo: 'Pessoa não encontrada.' };
  if (m.funcao === 'Coordenação do PROFIN' && m.ativo !== false && coordenadoresAtivos(equipe).length <= 1) return { ok: false, motivo: 'A equipe precisa de pelo menos uma pessoa ativa na coordenação do PROFIN. Cadastre outra antes.' };
  return { ok: true, motivo: '' };
}
export function montarMembroProfin(f, { equipe, hoje }) {
  const n = 1 + Math.max(0, ...equipe.map((m) => Number(/^m(\d+)$/.exec(m.id)?.[1] || 0)));
  return { id: `m${n}`, nome: f.nome.trim(), funcao: f.funcao, matricula: f.matricula.trim().toUpperCase(), email: f.email.trim().toLowerCase(), telefone: somenteDigitos(f.telefone), atende: f.atende.trim(), ativo: true, cadastradoEm: hoje };
}

// ---------------- Carga horária por nível e série ----------------
export const SEMANAS_LETIVAS = 40; // 200 dias letivos
export const HORAS_MINIMAS = { 'Ensino Fundamental — Anos Iniciais': 800, 'Ensino Fundamental — Anos Finais': 800, 'Ensino Médio': 1000 };
/** Carga horária anual em horas (aulas por semana × minutos da aula ÷ 60 × semanas letivas), arredondada. */
export const cargaAnualHoras = ({ aulasSemana, minutosAula }, semanas = SEMANAS_LETIVAS) => Math.round((aulasSemana * minutosAula / 60) * semanas);
export function situacaoDaCarga(etapa, linha) {
  const horas = cargaAnualHoras(linha);
  const minimo = HORAS_MINIMAS[etapa] ?? 800;
  return { horas, minimo, ok: horas >= minimo, falta: Math.max(0, minimo - horas) };
}
export function validarCarga(linha) {
  const e = {};
  const a = Number(linha.aulasSemana), m = Number(linha.minutosAula);
  if (!Number.isInteger(a) || a < 15 || a > 40) e.aulasSemana = 'Aulas por semana: de 15 a 40.';
  if (!Number.isInteger(m) || m < 40 || m > 60) e.minutosAula = 'Duração da aula: de 40 a 60 minutos.';
  return resultado(e);
}
/** Valores iniciais: 25 aulas por semana no Fundamental e 30 no Médio, de 50 minutos. */
export function cargaPadrao() {
  return ETAPAS.flatMap((t) => t.series.map((serie) => ({ etapa: t.etapa, serie, aulasSemana: t.etapa === 'Ensino Médio' ? 30 : 25, minutosAula: 50 })));
}
