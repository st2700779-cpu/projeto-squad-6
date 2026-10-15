# Checklist de prototipação por perfil: o que o portal tem

Conferência do portal contra o documento **"Checklist de Prototipação por Perfil — Portal Acadêmico — SEED/SE"** (sem IA e sem automação: o diferencial é visual, de interação e de acessibilidade).

Legenda: **Já existia** (feito antes desta conferência) · **Acrescentado** (feito nesta rodada) · **Fase 2** (não feito, com o motivo).

Data de referência da demonstração: **07/10/2026** (`dataReferencia` em `data/letivo.json`). É o "hoje" da agenda, dos prazos e do horário do dia. Tudo é fictício.

## Como testar cada perfil

Contas de demonstração (também aparecem na tela de login):

| Perfil | Acesso | Senha |
| --- | --- | --- |
| Aluno, ensino médio (1ª série A) | `202610317` | `aluno2026` |
| Aluno, anos finais (7º ano B) | `202610842` | `aluno2026` |
| Aluno, anos iniciais (3º ano A) | `202610955` | `aluno2026` |
| Responsável (3 filhos) | `RESP-20417` | `resp2026` |
| Professor | `PF-30412` | `prof2026` |
| Coordenação pedagógica | `coord.osvaldo` | `coord2026` |
| Direção | `dir.osvaldo` | `diretor2026` |
| Secretaria | `secretaria.osvaldo` | `secretaria2026` |
| Rede (SEED e DRE) | `seed.tecnico` | `rede2026` |
| PROFIN | `profin.seed` | `profin2026` |

## Aluno

| Item do checklist | Situação | Onde |
| --- | --- | --- |
| Notas por disciplina e bimestre | Já existia; ganhou o semáforo da nota | `aluno/notas.html` |
| Faltas e frequência atualizadas | Já existia; virou o painel proativo (abaixo) | `aluno/frequencia.html` |
| Horário de aulas da semana | **Acrescentado**: um quadro por dia, com hoje em destaque | `aluno/horario.html` |
| Calendário escolar (provas, feriados, eventos) | Já existia | `aluno/calendario.html` |
| Comunicados da escola | Já existia; agora inclui os comunicados enviados por professores e direção | `aluno/calendario.html#avisos` |
| Dados cadastrais, sem editar dado sensível | **Acrescentado**: só leitura, com "Pedir correção" que cai na fila da secretaria | `aluno/cadastro.html` |
| Diferencial 1: anos iniciais (lúdico, cartões grandes, pouco texto, mascote) | **Acrescentado**: mascote, seis cartões grandes com ícone e palavra, letra maior, botões de 56 px | início do aluno do 3º ano |
| Diferencial 1: anos finais (colorido e organizado, barra de frequência, selos) | **Acrescentado**: barra de frequência com margem, seis selos estáticos, próximas provas | início do aluno do 7º ano |
| Diferencial 1: ensino médio (sóbrio, painel denso) | **Acrescentado**: painel por matéria com semáforo e "preciso tirar" | início do aluno da 1ª série |
| Modo alto contraste | Já existia (botão Exibição) | cabeçalho |
| Fonte ajustável em todas as telas | Já existia (A− e A+) | cabeçalho |
| Ícone e palavra sempre juntos | **Acrescentado**: "Menu", "Exibição", "Como usar" e "Tirar dúvida" passaram a ter a palavra; cartões, botões e atalhos têm ícone e texto | todas as telas |
| Diferencial 2: anel/barra de frequência que muda de cor, com número e texto | **Acrescentado**: o anel e a barra levam o número no centro e a palavra ao lado (Boa, Atenção, Abaixo do mínimo) | `aluno/frequencia.html` |
| Diferencial 2: margem de segurança, em linguagem neutra | **Acrescentado**: "Ainda é possível faltar a 7 aulas…", sem metáfora de jogo | `aluno/frequencia.html` |
| Diferencial 2: botão "Simular falta hoje" | **Acrescentado**: recalcula na hora, só no navegador; faltar um dia perde as aulas do dia | `aluno/frequencia.html` |
| Diferencial 3: calculadora "Quanto preciso tirar" | **Acrescentado**: quatro bimestres, meta editável, mostra a nota por bimestre que falta | `aluno/rotina.html` |
| Diferencial 3: agenda única por urgência | **Acrescentado**: provas, trabalhos e entregas agrupados em Atrasado, Hoje, Amanhã, Esta semana e Mais adiante; marcar como feito | `aluno/rotina.html` |
| Diferencial 4: modo "Dia de Prova" | **Acrescentado**: tela limpa com sala, conteúdo e avisos do dia; Esc sai | `aluno/rotina.html?foco=…` |
| Diferencial 5: quiz por unidade, com banco por disciplina e bimestre | **Acrescentado**: 11 bancos (1ª série EM, 7º ano e 3º ano), 4 a 5 perguntas cada | `aluno/quiz.html`, `data/quiz.json` |
| Quiz: uma pergunta por vez, próxima e anterior | **Acrescentado** | `aluno/quiz.html` |
| Quiz: retorno imediato certo/errado, sem backend | **Acrescentado**: símbolo, palavra e explicação | `aluno/quiz.html` |
| Quiz: resultado com acertos × total, por unidade | **Acrescentado** | `aluno/quiz.html` |
| Quiz: perguntas em arquivo estático (JSON) | **Acrescentado** | `data/quiz.json` |
| Quiz: histórico de tentativas só no navegador | **Acrescentado** | `aluno/quiz.html` |
| Se sobrar tempo: badges de conquista | **Acrescentado**: 6 selos (nota 10, presença, média, nota que subiu, quiz) | início dos anos finais |
| Se sobrar tempo: streak visual por entrega no prazo | **Fase 2.** Não existe no sistema o registro de "entrega no prazo" feito pelo professor; sem esse dado o streak seria inventado | n/a |
| Se sobrar tempo: simulador de grade com arrastar e soltar | **Fase 2.** A coordenação já troca aulas na grade por seletores, com bloqueio de choque | `coordenador/horarios.html` |
| Se sobrar tempo: widgets reordenáveis por arrastar | **Fase 2** | n/a |

## Responsável

| Item | Situação | Onde |
| --- | --- | --- |
| Boletim e frequência dos filhos | **Acrescentado** (a tela do aluno serve também ao responsável) | `responsavel/boletim.html` |
| Alternar entre filhos | **Acrescentado**: seletor no alto de todas as telas | todas |
| Calendário escolar e comunicados | **Acrescentado** | `responsavel/calendario.html` |
| Avisos de reunião de pais | **Acrescentado**: evento no calendário, aviso destinado aos responsáveis e selo "Reunião de pais" | `responsavel/calendario.html` |
| Status da matrícula e da documentação | **Acrescentado**: matrícula ativa, rematrícula, documentos com prazo em cor e pedidos à secretaria | `responsavel/matricula.html` |
| Semáforo de nota e frequência | **Acrescentado**: cor, símbolo e palavra | início e boletim |
| Modo simplificado (nota, falta e próximo evento) | **Acrescentado**: chave que fica guardada no aparelho | início, boletim, calendário, matrícula |
| Painel de prioridade "o que precisa da sua atenção" | **Acrescentado**: frequência, notas, documentos e próximas datas, do mais grave ao menos grave | `responsavel/index.html` |
| Leitura em voz alta dos avisos | **Acrescentado** nos avisos, no resumo e nas prioridades (função nativa do navegador) | início, calendário |
| Frase curta e direta | Revisado nas telas novas | todas |
| Botões grandes para toque | **Acrescentado**: 52 px de altura mínima no perfil | todas |

## Professor

| Item | Situação | Onde |
| --- | --- | --- |
| Diário de classe (nota e falta) | Já existia (inclui diário offline) | `professor/diario.html` |
| Ver turmas e horários | Turmas já existiam; **horário acrescentado** | `professor/horario.html` |
| Subir material e plano de aula | **Acrescentado**. No protótipo só o nome e o tamanho do arquivo ficam registrados | `professor/materiais.html` |
| Enviar comunicado para turma e responsáveis | **Acrescentado**: para a turma ou só para os responsáveis; aparece para o aluno e o responsável | `professor/comunicados.html` |
| Mapa de calor da turma | **Acrescentado**: ordem por quem precisa de atenção; cor, símbolo e palavra em cada célula | `professor/mapa.html` |
| Lançamento rápido por teclado | Já existia (Tab e Enter); **ganhou** Shift+Enter e setas | diário |
| Trocador rápido de turma fixo no topo | **Acrescentado**: barra que acompanha a rolagem | diário e mapa |
| Chips de observação rápida | **Acrescentado**: seis chips num painel junto do campo; Alt+1 a Alt+6 também inserem | diário |
| Painel "hoje" | **Acrescentado**: aulas do dia, atividades para corrigir e próximo prazo de lançamento | `professor/index.html` |
| Visual denso e profissional | **Acrescentado**: espaçamento menor nas tabelas do professor | perfil |

## Direção

| Item | Situação | Onde |
| --- | --- | --- |
| Visão consolidada (estudantes, turmas, professores) | **Acrescentado** | `diretor/index.html` |
| Status de atos autorizativos | **Acrescentado** (a secretaria e a rede já tinham) | `diretor/atos.html` |
| Comunicados institucionais | **Acrescentado**: a direção avisa uma turma, os responsáveis dela ou a escola toda | `diretor/comunicados.html` |
| Dashboard com gráficos simples | **Acrescentado**: barras de frequência e de média por turma, com valor escrito | `diretor/index.html` |
| Mapa de calor por turma e série | **Acrescentado**: turmas × matérias, com filtro de série | `diretor/mapa.html` |
| Adimplência da prestação de contas (PROFIN) | **Acrescentado**: situação da escola e das quatro categorias, com o aviso do repasse | `diretor/index.html` |
| Modo "tela de reunião" | **Acrescentado**: resumo grande, modo projetor e impressão | `diretor/reuniao.html` |

## Coordenação

| Item | Situação | Onde |
| --- | --- | --- |
| Turmas e desempenho agregado | **Acrescentado** | `coordenador/index.html` |
| Gestão de horários | **Acrescentado**: troca de matéria por aula, com bloqueio de choque de professor e conferência com a matriz | `coordenador/horarios.html` |
| Acompanhamento pedagógico geral | **Acrescentado**: estudantes em recuperação ou abaixo da frequência, por turma | `coordenador/index.html` |
| Comparativo lado a lado | **Acrescentado**: até 3 turmas | `coordenador/comparativo.html` |
| Marcador de atenção, sem cálculo automático | **Acrescentado**: o ícone só aparece quando a coordenação marca, com motivo, nome e data | `coordenador/index.html` |
| Modo "reunião pedagógica" | **Acrescentado**: comparativo para imprimir, projetar ou baixar em CSV | `coordenador/reuniao.html` |

## Secretaria

| Item | Situação | Onde |
| --- | --- | --- |
| Matrícula e emissão de declarações | Já existia | `escola/matriculas.html`, `aluno/declaracao.html` |
| Cadastro de alunos | Já existia | `escola/estudantes.html` |
| Acompanhamento de atos autorizativos | Já existia | `escola/index.html` |
| Emissão com prévia visual antes de confirmar | Já existia (a folha aparece antes do "Emitir e imprimir"); **ganhou** o atalho "Ver prévia e emitir" na central de solicitações | `aluno/declaracao.html` |
| Indicadores de prazo com cor | **Acrescentado**: matrículas, solicitações e documentos pendentes, com cor, símbolo e palavra | `escola/index.html` |
| Central de solicitações | **Acrescentado**: fila por prazo, etapas pendente, em andamento, pronta e entregue; os pedidos chegam do aluno e do responsável | `escola/solicitacoes.html` |
| Busca à prova de confusão: código do aluno × código da matrícula | **Acrescentado**: resultados com os dois códigos lado a lado e rotulados; o sistema diz qual dos dois foi digitado | `escola/estudantes.html` |

## PROFIN

| Item | Situação | Onde |
| --- | --- | --- |
| Painel por escola e por categoria (Custeio, Capital, Merenda, Emenda Parlamentar) | **Acrescentado** | `profin/index.html` |
| Anotação de contexto, não só de documento | **Acrescentado**: por escola ou por categoria, com autor e data | `profin/index.html` |
| Rascunho de relatório consolidado | **Acrescentado**: texto por modelo fixo (sem IA), editável, com copiar, baixar e imprimir | `profin/relatorio.html` |

## Nota da SEED (cadastros e prestação de contas)

A SEED enviou uma lista curta de pendências. A sigla correta é **SEED**, não SEDUC: foi trocada em todas as telas, nos dados, no assistente e nos documentos. Cada item abaixo foi pensado do ponto de vista de quem usa a tela (equipe da rede, secretaria, direção e PROFIN).

| Item da nota | O que foi feito | Onde |
| --- | --- | --- |
| Criar o GitHub | Já existia | repositório |
| Dividir telas (principalmente a parte financeira) | O financeiro saiu da "Visão da escola" e virou a tela **Prestação de contas** da direção. O PROFIN ficou com 4 telas: Painel por escola, Análise das declarações, Relatório consolidado e Equipe. A rede ganhou Escolas e Equipe do PROFIN | `diretor/prestacao.html`, `profin/analise.html`, `profin/equipe.html`, `rede/escolas.html`, `rede/equipe-profin.html` |
| Cadastro de escola: ato autorizativo (inclusive divisão de escola), município, endereço, botão de inserir escola, data de vencimento, nível que libera as séries | Botão **Cadastrar escola**: nome, INEP, município, DRE, endereço com CEP, telefone e e-mail; tipo do ato (criação, **divisão de escola** com escola de origem, autorização, reconhecimento, renovação), número, publicação e **vencimento**; **nível de ensino** (Anos Iniciais, Anos Finais, Médio) com a prévia das séries liberadas. Gera um ato por nível e abre as vagas em zero para a rede abrir depois (botão Vagas) | `rede/escolas.html` |
| Carga horária de cada nível (série) | Tabela editável por série: aulas por semana × minutos da aula × 40 semanas = horas por ano, com o mínimo de 800 h (Fundamental) e 1.000 h (Médio) e aviso se ficar abaixo | `rede/matrizes.html` |
| Botão para cadastrar professor | Botão **Cadastrar professor** na secretaria (a escola dela) e na rede (qualquer escola): nome, CPF validado, matrícula funcional, vínculo, formação, habilitações, carga semanal. Entra na lista e no mapa de professores habilitados | `escola/professores.html`, `rede/professores.html` |
| Cadastro de coordenação do PROFIN | Equipe do PROFIN (coordenação, analistas e apoio): cadastro, e-mail institucional, escolas ou DREs que atende, desativar e reativar. A equipe nunca fica sem coordenação | `profin/equipe.html`, `rede/equipe-profin.html` |
| Declaração dos gastos | A direção declara os gastos de cada categoria de recurso: mês, vários gastos com data, fornecedor, nota fiscal, natureza e comprovante (PDF, JPG ou PNG até 5 MB). Recusa valor acima do saldo, data futura e nota repetida. Salva rascunho e envia ao PROFIN | `diretor/prestacao.html` |
| Retorno do PROFIN da análise dos gastos | Fila por antiguidade, conferência item a item (glosa com motivo) e retorno assinado por alguém da equipe: **aprovada**, **aprovada com ressalvas** ou **devolvida para correção**, com parecer. A escola vê o retorno, corrige e reenvia. O valor aprovado entra no executado e a prestação devolvida volta a contar como pendente | `profin/analise.html`, `diretor/prestacao.html` |

Pontos que a nota não dizia e foram acrescentados por serem o básico de cada área: abrir e editar as **vagas** por série (antes ninguém podia), histórico de cada declaração, cadastro de escola recém-criada sem quebrar os painéis (sem repasse até o PROFIN lançar) e a seção de declarações no relatório consolidado do PROFIN.

## Leitura por perfil (melhorias essenciais)

Feitas depois de ler o sistema como cada usuário (detalhes em `ANALISE-POR-PERFIL.md`).

| Perfil | Item | Onde |
| --- | --- | --- |
| Todos | Alterar senha, esqueci minha senha, sessão encerrada em 30 min sem uso, "hoje" único da demonstração | `configuracoes.html`, `login.html` |
| Responsável | Justificar falta com período, motivo, anexo e andamento; imprimir boletim | `responsavel/justificar.html` |
| Aluno | Imprimir boletim | `aluno/notas.html` |
| Secretaria | Decidir justificativas (aceitar ou recusar com explicação) | `escola/justificativas.html` |
| Professor | Registro de aula (conteúdo, tarefa, nº de aulas) | `professor/registro-aula.html` |
| Coordenação | Consulta dos registros de aula por turma | `coordenador/registros-aula.html` |
| Rede | Editar escola, registrar ato renovado, editar e desligar professor | `rede/escolas.html`, `rede/professores.html` |
| PROFIN | Lançar repasse | `profin/index.html` |

## Regras visuais transversais

| Regra | Situação |
| --- | --- |
| Contraste mínimo AA em todo texto | `tools/verificar-contraste.mjs` confere os quatro temas e agora inclui os pares novos (semáforo, selos, cartões por faixa). Todos passam. |
| Fonte mínima legível | O menor tamanho do portal é 14 px (`--texto-xs`); era 13 px |
| Nada importante só por cor | Semáforo, mapa de calor, barras e prazos sempre levam símbolo e palavra |
| Navegação por toque em telas pequenas | Botões de pelo menos 44 px; tabelas viram cartões; varredura em 360, 768 e 1440 px |
| Estados vazios e de erro com mensagem simples | Todas as telas novas usam o estado vazio padrão e o aviso de falha com "Tentar de novo" |

## Limites desta versão

- **Dados fictícios.** O que o checklist chama de "documentos anteriores" do PROFIN não estava disponível: as categorias vêm do checklist, os valores e prazos foram inventados para o protótipo.
- **Diário.** Só a Matemática do 1º e do 2º bimestre vem do diário da professora. As demais matérias e as turmas sem diário usam o consolidado de `data/desempenho.json`.
- **Faltas.** A unidade é a aula, como no resto do portal. "Faltar um dia" perde as aulas do dia no horário da turma.
- **Mapa de calor com três níveis** (verde, amarelo, vermelho), de propósito: cada nível tem símbolo e palavra. Um degradê contínuo não teria texto.
- **Arquivos do professor.** O protótipo não guarda o conteúdo do arquivo.
- **Streak, arrastar e soltar e widgets reordenáveis** ficam para a fase 2.
- **Não testado:** leitor de tela real (NVDA, VoiceOver), aparelhos físicos e Safari. A verificação foi feita em Chromium (Playwright), em 360, 768 e 1440 px, e no verificador de contraste.
- **Visual por faixa etária:** vem da série do estudante. O seletor "Ver visual de" no início do aluno existe só para comparar os três desenhos.
