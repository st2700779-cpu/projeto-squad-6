// Textos fixos do assistente, escritos pela equipe (não gerados pela IA).
export const MSG = {
  saudacao: 'Olá! Posso ajudar com matrícula, documentos, prazos e notas. Escreva ou toque no microfone para falar.',
  avisoDados: 'Não escreva CPF, RG ou endereço aqui. Não é preciso.',
  carregando: 'Procurando a resposta…',
  esperaMaxima: 'Se não houver resposta em 30 segundos, a consulta é interrompida.',
  fonte: 'Informação cadastrada pela rede. Em caso de dúvida, confirme na secretaria da escola.',
  semIA: 'Resposta das perguntas frequentes · sem IA',
  semResposta: 'Não encontrei essa informação. A secretaria da escola pode ajudar. Ela atende de segunda a sexta, das 7h às 17h.',
  modoSemIA: 'O assistente está em modo sem IA: as respostas vêm das perguntas frequentes.',
  erros: {
    ENTRADA_VAZIA: 'Escreva sua pergunta antes de enviar.',
    ENTRADA_LONGA: 'Sua pergunta ficou muito longa. Tente escrever de um jeito mais curto.',
    DADO_PESSOAL: 'Não precisa enviar esse tipo de informação. Sua pergunta não foi enviada. Escreva de novo sem os números.',
    SEM_CONEXAO: 'Você está sem internet ou a conexão caiu.',
    TEMPO_ESGOTADO: 'O assistente não respondeu a tempo.',
    LIMITE_COTA: 'O assistente recebeu muitas perguntas agora. Tente de novo em alguns minutos.',
    SERVICO_INDISPONIVEL: 'O assistente está fora do ar no momento. Você pode usar o portal normalmente.',
    RESPOSTA_INVALIDA: 'O assistente respondeu de um jeito que não conseguimos mostrar.',
    PAUSADO: 'O assistente está em pausa por alguns minutos. Enquanto isso, mostramos as perguntas frequentes.',
    NAO_CONFIGURADO: 'O assistente com IA não está configurado.',
    VOZ_NAO_ENTENDIDA: 'Não consegui ouvir. Tente de novo ou escreva sua pergunta.'
  },
  dica: 'Você pode tentar de novo ou ver as perguntas frequentes.'
};

// Perguntas sugeridas por perfil.
export const SUGESTOES = {
  familia: ['Quando é a rematrícula?', 'Quais documentos levar?', 'Como pedir transferência?'],
  professor: ['Qual a frequência mínima?', 'Quando são as provas do 3º bimestre?', 'Quando termina o ano letivo?'],
  escola: ['Quais documentos a família precisa?', 'Como funciona a transferência?', 'Qual o prazo para levar os documentos?'],
  rede: ['Quando é a matrícula nova?', 'O que é a matriz curricular?', 'Quando termina o ano letivo?']
};

// Ações que o assistente pode sugerir e a tela de destino de cada uma.
export const ACOES = {
  matricula: ['familia/matricula.html', 'Fazer matrícula'],
  documentos: ['familia/documentos.html', 'Ver lista completa'],
  notas: ['familia/notas.html', 'Ver notas e faltas'],
  calendario: ['familia/calendario.html', 'Ver calendário'],
  avisos: ['familia/calendario.html#avisos', 'Ver avisos'],
  // Resposta fora da base (W10): encaminha à secretaria.
  contato: ['familia/documentos.html#contato', 'Contato da escola']
};

// Perguntas de continuação mostradas depois de uma resposta (W9), pela ação sugerida.
export const SEGUIMENTOS = {
  documentos: ['Onde faço a matrícula?', 'Qual o prazo?'],
  matricula: ['Quais documentos levar?', 'Como pedir transferência?'],
  notas: ['Qual a frequência mínima?', 'Perdi a prova. E agora?'],
  calendario: ['Quais os próximos feriados?', 'Quando termina o ano letivo?'],
  avisos: ['Quando são as provas do 3º bimestre?', 'Quando é a rematrícula?']
};
