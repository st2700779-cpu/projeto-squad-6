// Domínio da matrícula on-line no modelo do Portal da Matrícula da SEDUC/SE (análise em "Analise_Portal_Matricula_SEDUC-SE.pdf",
// seção 6), já com as melhorias que a análise sugere:
//  - consulta de vagas por oferta (escola + série + turno), com a quantidade de vagas e não só "tem / não tem";
//  - checagem de duplicidade (nome + filiação + nascimento) antes do cadastro, com os dados dos outros registros ocultos em parte;
//  - validação do cadastro básico, do responsável e do endereço, e dos termos (vacinação e uso de dados), tudo em português;
//  - lista de espera por oferta, uma inscrição ativa por estudante, com posição na fila e cancelamento.
// Funções puras, testadas em tools/testar-cadastros.mjs.
import { cpfValido, somenteDigitos, emailValido, telefoneValido } from './cadastros.js';
import { PEDIDO_ATIVO, idadeEm } from './matricula-online.js';

export const CORES_RACA = ['Amarela', 'Branca', 'Indígena', 'Parda', 'Preta', 'Não declarada'];
export const SEXOS = ['Feminino', 'Masculino'];
export const ORGAOS_RG = ['SSP', 'Polícia Civil', 'DETRAN', 'Outro'];
export const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
export const PARENTESCOS = ['Mãe', 'Pai', 'Avó ou avô', 'Tia ou tio', 'Irmã ou irmão (maior de idade)', 'Outro responsável legal'];
/** De onde o estudante vem: a primeira matrícula não precisa de guia de transferência; as outras precisam. */
export const ORIGENS = ['Primeira matrícula (nunca estudou)', 'Escola municipal', 'Escola particular', 'Escola de outro estado ou federal'];
export const tipoPelaOrigem = (origem) => (origem && origem !== ORIGENS[0] ? 'transferencia' : 'nova');
export const ESPERA_ATIVA = ['Aguardando', 'Chamado'];
const TURNOS_ORDEM = ['Manhã', 'Tarde', 'Noite', 'Integral'];

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** "Maria S**** d* J****": primeiro nome inteiro, os outros só com a inicial (para não expor dados de outras famílias). */
export function ocultarNome(nome) {
  const partes = String(nome ?? '').trim().split(/\s+/).filter(Boolean);
  return partes.map((p, i) => (i === 0 ? p : `${p[0]}${'*'.repeat(Math.max(1, Math.min(p.length - 1, 4)))}`)).join(' ');
}

/**
 * Ofertas de uma série numa cidade: uma linha por escola, com os turnos e as vagas de cada turno.
 * vagasDetalhe: resultado de calcularVagas ({ [escolaId]: { [serie]: { porTurno, vagas, bloqueada } } }).
 * As vagas de um turno são as lugares livres das turmas daquele turno, sem passar do total de vagas da série (os pedidos
 * aguardando confirmação já seguram vaga na série).
 * @returns {Array<{escola, tipo: string, turnos: Array<{turno: string, vagas: number}>, vagas: number}>}
 */
export function ofertasDaSerie({ escolas, vagasDetalhe, cidade, serie }) {
  const linhas = [];
  for (const e of escolas.filter((x) => x.municipio === cidade)) {
    const c = vagasDetalhe?.[e.id]?.[serie];
    if (!c || c.bloqueada || !Object.keys(c.porTurno || {}).length) continue; // sem turma dessa série ou sem autorização: não oferta
    const turnos = TURNOS_ORDEM.filter((t) => c.porTurno[t] !== undefined).map((t) => ({ turno: t, vagas: Math.max(0, Math.min(c.porTurno[t], c.vagas)) }));
    const integral = turnos.some((t) => t.turno === 'Integral');
    linhas.push({ escola: e, tipo: integral && turnos.length === 1 ? 'Tempo integral' : integral ? 'Tempo parcial e integral' : 'Tempo parcial', turnos, vagas: c.vagas });
  }
  return linhas.sort((a, b) => (b.vagas > 0) - (a.vagas > 0) || a.escola.nome.localeCompare(b.escola.nome, 'pt-BR'));
}

/** Cidades com pelo menos uma oferta na lista de séries. */
export const cidadesComOferta = (escolas, vagasDetalhe, series) => [...new Set(escolas.filter((e) => series.some((s) => vagasDetalhe?.[e.id]?.[s] && !vagasDetalhe[e.id][s].bloqueada)).map((e) => e.municipio))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

/**
 * Checagem de duplicidade (etapa "Primeiro acesso"): estudantes da rede e pedidos ativos com o mesmo nome e a mesma data de
 * nascimento. A filiação, quando confere, sobe o registro na lista. Os dados voltam já ocultos em parte.
 */
export function buscarDuplicados({ nome, filiacao, nascimento }, { estudantes = [], pedidos = [], escolas = [] }) {
  const n = norm(nome), f = norm(filiacao);
  if (!n || !nascimento) return [];
  const daRede = estudantes.filter((e) => norm(e.nome) === n && e.nascimento === nascimento).map((e) => ({
    origem: 'rede', codigo: e.codigoAluno || e.matricula || e.id, nome: ocultarNome(e.nome), filiacao: ocultarNome(e.responsavel), nascimento: e.nascimento,
    escola: escolas.find((x) => x.id === e.escolaId)?.nome || '', serie: e.serie || '', confere: Boolean(f) && norm(e.responsavel) === f
  }));
  const pedidosAtivos = pedidos.filter((p) => PEDIDO_ATIVO.includes(p.situacao) && norm(p.estudante) === n && p.nascimento === nascimento).map((p) => ({
    origem: 'pedido', codigo: p.protocolo, nome: ocultarNome(p.estudante), filiacao: ocultarNome(p.filiacao1 || p.responsavel), nascimento: p.nascimento,
    escola: escolas.find((x) => x.id === p.escolaId)?.nome || '', serie: p.serie || '', confere: Boolean(f) && norm(p.filiacao1 || p.responsavel) === f
  }));
  return [...daRede, ...pedidosAtivos].sort((a, b) => b.confere - a.confere);
}

// Nome sem abreviação: pelo menos nome e sobrenome, sem "M." ou "S." no meio.
const temAbreviacao = (s) => /(^|\s)[A-Za-zÀ-ú]\.?(\s|$)/.test(` ${s} `.replace(/\s+(de|da|do|das|dos|e)\s+/gi, ' ')) || /\./.test(s);
function erroDeNome(v, rotulo) {
  const s = String(v ?? '').trim();
  if (!s) return `Informe ${rotulo}.`;
  if (s.length > 100) return `${rotulo[0].toUpperCase()}${rotulo.slice(1)}: no máximo 100 letras.`;
  if (s.split(/\s+/).length < 2) return `Escreva ${rotulo} completo, com sobrenome.`;
  if (temAbreviacao(s)) return `Escreva ${rotulo} sem abreviações.`;
  return '';
}
const dataValida = (iso) => /^\d{4}-\d{2}-\d{2}$/.test(String(iso ?? '')) && !Number.isNaN(Date.parse(`${iso}T12:00:00`));

/** RG: de 5 a 10 caracteres, só números e, no último, X. Aceita com ou sem pontos e traço. */
export const rgValido = (v) => /^\d{4,9}[\dX]$/.test(String(v ?? '').toUpperCase().replace(/[.\-\s]/g, ''));

/** Etapa "Primeiro acesso": nome, filiação e nascimento. Devolve { campo: mensagem } (vazio quando está tudo certo). */
export function validarPrimeiroAcesso(f, { hoje }) {
  const e = {};
  const n = erroDeNome(f.nome, 'o nome do estudante'); if (n) e.nome = n;
  const m = erroDeNome(f.filiacao, 'o nome da mãe ou do pai'); if (m) e.filiacao = m;
  if (!f.nascimento) e.nascimento = 'Informe a data de nascimento.';
  else if (!dataValida(f.nascimento)) e.nascimento = 'Escreva a data como dd/mm/aaaa, por exemplo 15/03/2012.';
  else if (f.nascimento > hoje) e.nascimento = 'A data de nascimento não pode ser no futuro.';
  else if (idadeEm(f.nascimento, hoje) < 4) e.nascimento = 'Confira a data: a rede estadual atende a partir do Ensino Fundamental.';
  return e;
}

/** Etapa "Cadastro básico". pedidos: para não ter dois pedidos ativos com o mesmo CPF. */
export function validarCadastroBasico(f, { hoje, pedidos = [] }) {
  const e = {};
  const n = erroDeNome(f.nome, 'o nome do estudante'); if (n) e.nome = n;
  const m = erroDeNome(f.filiacao1, 'o nome da mãe ou do responsável legal'); if (m) e.filiacao1 = m;
  if (f.filiacao2 && erroDeNome(f.filiacao2, 'o segundo nome da filiação')) e.filiacao2 = erroDeNome(f.filiacao2, 'o segundo nome da filiação');
  if (!f.nascimento || !dataValida(f.nascimento) || f.nascimento > hoje) e.nascimento = 'Informe uma data de nascimento válida (dd/mm/aaaa).';
  if (!SEXOS.includes(f.sexo)) e.sexo = 'Escolha o sexo do estudante.';
  const cpf = somenteDigitos(f.cpf);
  if (!cpf) e.cpf = 'Informe o CPF do estudante. Sem CPF, a família pode tirar o documento de graça na Receita Federal ou nos Correios.';
  else if (!cpfValido(cpf)) e.cpf = 'CPF inválido. Confira os 11 números.';
  else {
    const outro = pedidos.find((p) => p.cpf && somenteDigitos(p.cpf) === cpf && PEDIDO_ATIVO.includes(p.situacao));
    if (outro) e.cpf = `Já existe um pedido de matrícula para este CPF (protocolo ${outro.protocolo}). Acompanhe esse pedido em vez de fazer outro.`;
  }
  if (f.nis && somenteDigitos(f.nis).length !== 11) e.nis = 'O NIS tem 11 números. Deixe em branco se não tiver.';
  if (f.sus && somenteDigitos(f.sus).length !== 15) e.sus = 'O Cartão SUS tem 15 números. Deixe em branco se não tiver.';
  if (!CORES_RACA.includes(f.corRaca)) e.corRaca = 'Escolha a cor ou raça. Se preferir, escolha "Não declarada".';
  if (!['Sim', 'Não'].includes(f.bolsaFamilia)) e.bolsaFamilia = 'Diga se a família recebe o Bolsa Família.';
  if (!ORIGENS.includes(f.origem)) e.origem = 'Diga onde o estudante estudou por último.';
  if (f.rg && !rgValido(f.rg)) e.rg = 'RG inválido: de 5 a 10 números (o último pode ser X), como 1.234.567-8.';
  if (f.rgEmissao && (!dataValida(f.rgEmissao) || f.rgEmissao > hoje)) e.rgEmissao = 'A data de emissão não pode ser no futuro.';
  const email = String(f.email ?? '').trim();
  if (!email) e.email = 'Informe um e-mail. É por ele que a escola avisa sobre o pedido e a lista de espera.';
  else if (!emailValido(email)) e.email = 'E-mail inválido. Confira, por exemplo nome@email.com (até 80 letras, sem espaço).';
  return e;
}

/** Etapa "Responsável e endereço": o responsável é obrigatório para menores de 18 anos. */
export function validarResponsavelEndereco(f, { nascimento, hoje }) {
  const e = {};
  const menor = (idadeEm(nascimento, hoje) ?? 0) < 18;
  const temResp = menor || f.respNome || f.respCpf;
  if (temResp) {
    const n = erroDeNome(f.respNome, 'o nome do responsável'); if (n) e.respNome = n;
    const c = somenteDigitos(f.respCpf);
    if (!c) e.respCpf = 'Informe o CPF do responsável.'; else if (!cpfValido(c)) e.respCpf = 'CPF do responsável inválido. Confira os 11 números.';
    if (!PARENTESCOS.includes(f.parentesco)) e.parentesco = 'Escolha o parentesco do responsável.';
    // O responsável legal tem de ser maior de idade: a idade sai da data de nascimento, conferida na hora.
    if (!f.respNascimento) e.respNascimento = 'Informe a data de nascimento do responsável.';
    else if (!dataValida(f.respNascimento) || f.respNascimento > hoje) e.respNascimento = 'Data de nascimento do responsável inválida (dd/mm/aaaa).';
    else if (idadeEm(f.respNascimento, hoje) < 18) e.respNascimento = `O responsável tem ${idadeEm(f.respNascimento, hoje)} anos. O responsável legal precisa ter 18 anos ou mais: chame outro responsável (avó, avô, tutor...).`;
    else if (idadeEm(f.respNascimento, hoje) > 120) e.respNascimento = 'Confira a data de nascimento do responsável.';
    else if (nascimento && f.respNascimento >= nascimento) e.respNascimento = 'O responsável precisa ser mais velho que o estudante.';
  }
  if (!telefoneValido(f.telefone)) e.telefone = 'Escreva um telefone com DDD válido, por exemplo (79) 99999-9999 (celular) ou (79) 3222-1234 (fixo).';
  if (f.cep && somenteDigitos(f.cep).length !== 8) e.cep = 'O CEP tem 8 números. Deixe em branco se não souber.';
  if (!String(f.logradouro ?? '').trim()) e.logradouro = 'Informe a rua ou avenida.';
  if (!String(f.numero ?? '').trim()) e.numero = 'Informe o número. Se não houver, escreva S/N.';
  if (!String(f.bairro ?? '').trim()) e.bairro = 'Escolha o bairro.';
  if (!String(f.municipio ?? '').trim()) e.municipio = 'Escolha o município.';
  return e;
}

/** Etapa "Termos": a vacinação precisa de resposta (Autorizo ou Não autorizo); o uso de dados precisa do "Li e concordo". */
export function validarTermos(f) {
  const e = {};
  if (!['Autorizo', 'Não autorizo'].includes(f.vacinacao)) e.vacinacao = 'Responda o termo de vacinação: Autorizo ou Não autorizo.';
  if (!f.usoDeDados) e.usoDeDados = 'Para enviar o pedido, marque "Li e concordo" no termo de uso de dados.';
  return e;
}

/** 00000-000 enquanto a pessoa digita. */
export const mascaraCep = (t) => somenteDigitos(t).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');
/** 000.00000.00-0 (NIS) e 000 0000 0000 0000 (SUS): só números, com espaços para ler melhor. */
export const mascaraNis = (t) => somenteDigitos(t).slice(0, 11).replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{5})(\d)/, '$1.$2.$3').replace(/\.(\d{2})(\d)$/, '.$1-$2');
export const mascaraSus = (t) => somenteDigitos(t).slice(0, 15).replace(/(\d{3})(\d{0,4})(\d{0,4})(\d{0,4})/, (_, a, b, c, d) => [a, b, c, d].filter(Boolean).join(' '));

/** Posição na fila da oferta (escola + série + turno): 1 = o próximo a ser chamado. */
export function posicaoNaEspera(lista, id) {
  const eu = lista.find((x) => x.id === id);
  if (!eu || !ESPERA_ATIVA.includes(eu.situacao ?? 'Aguardando') || !eu.escolaId) return null;
  const fila = lista.filter((x) => x.escolaId === eu.escolaId && x.serie === eu.serie && x.turno === eu.turno && ESPERA_ATIVA.includes(x.situacao ?? 'Aguardando'))
    .sort((a, b) => String(a.desde).localeCompare(String(b.desde)) || String(a.id).localeCompare(String(b.id)));
  return fila.findIndex((x) => x.id === id) + 1;
}

/** Uma inscrição ativa por estudante (pelo CPF): devolve a inscrição que já existe ou null. */
export const esperaAtivaDoCpf = (lista, cpf) => lista.find((x) => x.cpf && somenteDigitos(x.cpf) === somenteDigitos(cpf) && ESPERA_ATIVA.includes(x.situacao ?? 'Aguardando')) || null;

/** Consultar a inscrição na lista de espera: protocolo ESP-… e data de nascimento (os dois juntos, como no acompanhamento). */
export function consultarEspera({ protocolo, nascimento }, lista) {
  const prot = String(protocolo ?? '').trim().toUpperCase();
  const x = lista.find((i) => String(i.id).toUpperCase() === prot && i.nascimento);
  if (!x || x.nascimento !== nascimento) return { ok: false, erro: 'Não encontramos inscrição com esse protocolo e essa data de nascimento. Confira os dois e tente de novo.' };
  return { ok: true, inscricao: x, posicao: posicaoNaEspera(lista, x.id) };
}

/** Cancela a inscrição (a família pode cancelar quando quiser). Não altera a lista recebida. */
export const cancelarEspera = (lista, id, { hoje }) => lista.map((x) => (x.id === id ? { ...x, situacao: 'Cancelada', canceladaEm: hoje } : x));
