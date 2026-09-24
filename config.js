// Configuração pública do front-end. NÃO coloque chaves de API aqui:
// a chave da IA fica apenas no proxy (pasta worker/).
window.APP_CONFIG = {
  // Endereço do proxy do assistente, por exemplo:
  // "https://assistente-squad6.SEU-USUARIO.workers.dev/api/assistente"
  // Vazio = o assistente responde só pelas perguntas frequentes (modo sem IA).
  assistenteUrl: "",

  // Simulação para testes e demonstrações, sem chamar a IA:
  // "" (desligada), "ok", "lento", "cota", "erro" ou "invalida".
  // Também pode ser ativada pela URL: ?simular=cota
  simular: ""
};
