// Bloqueia, antes do envio, textos que parecem dados pessoais (CPF, RG, telefone, CEP, e-mail).
const PADROES = [
  /\d[\d.\-\s]{6,}\d/,              // sequências longas de números: CPF, RG, telefone, CEP
  /[\w.+-]+@[\w-]+\.[\w.]+/         // e-mail
];
export const pareceDadoPessoal = (texto) => PADROES.some((p) => p.test(texto));
