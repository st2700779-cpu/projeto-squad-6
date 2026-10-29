# Sinais de "gerado por IA" — levantamento (etapa 1)

Data: 29/09/2026 · Base do levantamento: commit `1567d4a`. As seções 1 a 7 são o levantamento original; a **seção 8** registra o que foi corrigido e o que ficou.

**Aviso de honestidade:** vários dos sinais abaixo foram **introduzidos pelo redesenho anterior** (feito por mim): as quatro cores de destaque, os cartões de indicador com faixa colorida, a entrada animada de página, os cartões de perfil. Estão marcados com **[redesenho]**. O texto e os dados que a equipe original escreveu estão, em geral, em melhor estado do que o visual, e os pontos bons estão na seção 5, para não estragar o que funciona.

Método: leitura de todo o CSS (5 arquivos), das 20 páginas JS, dos 21 arquivos de dados, das mensagens do assistente e do protótipo em arquivo único; buscas por emojis, gradientes, blur, exclamações, frases de marketing e microcopy vaga; e as capturas das telas em 360, 768 e 1440 px do redesenho. Impacto: **A** alto, **M** médio, **B** baixo.

## 1. Visual

| ID | Imp. | Onde (arquivo · tela) | Sinal | Correção proposta |
| --- | --- | --- | --- | --- |
| V1 | **A** | `layout.css`, `inicio.js` · início | Cartões de perfil idênticos: ícone em quadrado colorido + título + frase + "Entrar →", cada um com faixa colorida no topo **[redesenho]** | Trocar por lista de acesso enxuta: uma linha por perfil (nome, para quem é), sem ícone em quadrado, sem faixa colorida, alinhada à esquerda |
| V2 | **A** | `inicio.js`, `layout.css` (`.hero`) · início | Hero centralizado com monograma grande, título "Portal Acadêmico" repetindo a marca do cabeçalho e frase de abertura **[redesenho]** | Remover o hero: tela de entrada com título funcional ("Entrar no sistema"), alinhada à esquerda, colunas de perfis mais compactas |
| V3 | **A** | `familia-inicio.js` · início da família | "Acesso rápido": quatro blocos idênticos (ícone em quadrado + título + frase + botão Ouvir) | Substituir por lista de tarefas em texto (links com título e uma linha de apoio), já que o menu lateral repete essas mesmas rotas |
| V4 | **A** | `componentes.css` (`.numero`), `familia-inicio.js`, `professor-turmas.js`, `escola-inicio.js`, `rede-atos.js` · painéis iniciais | Fileira de 3 a 4 cartões de número, todos com faixa colorida na lateral e ícone no canto, **repetida igual em todas as visões** **[redesenho]** | Variar por tarefa: professor = resumo em linha única e tabela de turmas; família = boletim resumido; escola = fila de pendências como lista; rede = alerta + tabela. Onde couber número, usar linha de texto ("2 a confirmar · 3 sem turma"), sem cartão |
| V5 | **M** | `componentes.css` (`--sombra-1` em `.cartao`, `.bloco`, `.numero`, `.materias`, `.tabela-rolagem`, `.protocolo`) | Sombra em quase todo elemento (27 `box-shadow`) | Sombra só em elemento flutuante (menu gaveta, janela, aviso, painel do assistente); nos demais, só borda de 1 px |
| V6 | **M** | `componentes.css` (`.cartao-interativo:hover`, `.bloco:hover`), `layout.css` | Hover que levanta o cartão com sombra maior | Trocar por mudança discreta de cor de fundo/borda, sem sombra |
| V7 | **M** | `layout.css` (`#pagina { animation: aparecer }`) | Fade-in com deslocamento em toda tela, ao carregar **[redesenho]** | Remover a animação de entrada de página; manter só transições de estado (hover, foco, abrir/fechar) de 150 ms |
| V8 | **A** | `tema.css` (`body[data-visao]`), `layout.css` (faixa do cabeçalho, título do menu, item ativo, avatar), `componentes.css` | **Cinco cores de destaque** ao mesmo tempo: azul primário + turquesa, índigo, verde e âmbar por visão **[redesenho]** | Uma cor primária (azul) e uma de apoio (verde escuro, institucional). Cores só para status. Tirar a cor por visão; diferenciar a visão pelo nome no cabeçalho |
| V9 | **M** | `componentes.css` (`.etiqueta`, `.filtros button`, `.botao-ouvir`, `.sugestoes button`, `.seletor-estudante`) | Pílulas por toda parte (`border-radius: 999px`, 10 usos); selos coloridos em cada status | Selo de status vira texto com ponto/ícone pequeno, raio pequeno (4 px) e só nos estados que importam; filtros viram abas de texto sublinhadas ou botões retos |
| V10 | **M** | `tema.css` (`--raio-lg: 14px`, `--raio: 10px`) | Raios grandes e uniformes em cartões, campos e botões | Escala menor: 3 px em campos e botões, 6 px em painéis; círculo só em avatar |
| V11 | **M** | `estado-vazio` em `componentes.css`, `ui.js` (`vazio()`) | Estado vazio com ícone grande em círculo colorido, título e frase (molde de template) | Só texto direto e, se houver, o próximo passo em link; sem ícone grande |
| V12 | **B** | `layout.css` (`.topo::before` faixa de 4 px), `.marca-selo` "SE" | Faixa colorida no topo e monograma "SE" em quadrado azul (logotipo genérico) | Cabeçalho liso com borda inferior; identificação em texto: "Secretaria de Estado da Educação · Sergipe" e nome do sistema; sem monograma |
| V13 | **B** | `componentes.css` (`.tabela thead th`) | Cabeçalho de tabela em CAIXA ALTA com espaçamento entre letras (tique de SaaS) | Cabeçalho em caixa normal, peso 600, cor de texto suave |
| V14 | **B** | `botao` com ícone `ok` em Salvar diário, Confirmar rematrícula, Registrar chamada, Registrar parecer | Ícone de "check" decorativo em botões primários | Remover o ícone dos botões de texto claro; manter só nos que substituem o texto |
| V15 | **B** | `componentes.css` (`.aviso-rapido` com faixa lateral colorida + ícone), `.numero` com faixa lateral | Faixa colorida na lateral esquerda de aviso e de indicador (tropo de painel) | Aviso: borda inteira neutra + ícone de estado; indicador: sem faixa |
| V16 | **M** | `escola-matriculas.js`, `escola-enturmacao.js`, `escola-turmas.js`, `escola-alocacao.js` | **Cartões onde o dado é tabular:** pedido de matrícula, estudante aguardando turma, turma, componente × professor; cada um vira cartão com 3 a 5 atributos | Trocar por **tabelas** (colunas: protocolo, estudante, série, situação, ação), com contagem de registros; cartão só para o que é único (formulário de recusa) |
| V17 | **B** | `professor-diario.js` · chamada | Grade de azulejos com o nome de cada estudante para marcar falta | Tabela com uma linha por estudante e caixa "Faltou", pensada para 30 a 40 nomes; manter o registro em um clique |
| V18 | **B** | `sistema-academico-seed-prototipo.html` | Mesmos sinais V1, V4, V8, V12 no protótipo em arquivo único | Acompanhar as correções do portal (herda os estilos; ajustar marcação onde tiver) |

Não foram encontrados: gradientes de cor, texto com gradiente, blobs, fundos animados, glassmorphism, `backdrop-filter`, emojis (o único gradiente é o brilho do esqueleto de carregamento, que é funcional).

## 2. Texto

| ID | Imp. | Onde | Sinal (texto atual) | Correção proposta |
| --- | --- | --- | --- | --- |
| T1 | **A** | `familia-inicio.js` · título | "Olá! O que você quer fazer?" (saudação com exclamação; título que não diz o que a tela é) | "Carla Vitória — 1ª série A" e, abaixo, "Responsável: Rosa Maria …" (título = o que a tela mostra) |
| T2 | **M** | `familia-inicio.js` · subtítulo | "Acompanhe a vida escolar e faça os pedidos da família em poucos toques." (frase de marketing) | Remover; a tela já se explica |
| T3 | **M** | `professor-turmas.js`, `escola-inicio.js` · subtítulo | "Resumo das suas turmas neste ano letivo." e "… · resumo do que precisa de atenção hoje" (subtítulo de enchimento) | Remover ou trocar por dado útil ("Ano letivo 2026 · 3º bimestre em andamento") |
| T4 | **M** | `inicio.js` · hero | "Sistema acadêmico da Rede Estadual de Ensino de Sergipe. Escolha como você quer entrar. No protótipo, o acesso é simulado." | "Acesso simulado. Escolha o perfil." |
| T5 | **A** | vários | **Botões só com verbo, sem objeto:** "Confirmar", "Recusar", "Alocar", "Aprovar", "Devolver", "Continuar", "Voltar", "Mudar algo", "Cancelar" | Verbo + objeto: "Confirmar matrícula", "Recusar matrícula", "Alocar professor", "Aprovar turma", "Devolver turma", "Ir para a escolha da escola", "Alterar dados da rematrícula" |
| T6 | **M** | títulos de página | "Turmas", "Avisos", "Equivalências", "Alocação de professores", "Próximas datas", "Declarações", "Diário de classe" (sem turma nem bimestre), "Pedidos de matrícula" | Títulos que dizem a tela e o contexto: "Diário de classe · 1ª série A · Matemática · 2º bimestre"; "Turmas 2026 · C. E. …"; "Avisos da escola"; "Equivalência de estudos (transferências)" |
| T7 | **A** | `app.js` (`falhaDados`), `professor-diario.js`, `escola-*.js`, `familia-matricula.js` | Erros genéricos: "Não foi possível carregar estas informações agora.", "Não foi possível salvar. Tente de novo.", "Não foi possível confirmar agora." | Dizer o que aconteceu e o que fazer: "Não foi possível salvar as notas do diário. Nada foi alterado. Confira a conexão e clique em Salvar notas de novo." |
| T8 | **M** | `familia-notas.js` | Parágrafo longo de explicação sob a lista de matérias ("Toque em uma matéria… A situação é parcial…") | Frase curta de legenda: "Situação parcial: 2 de 4 bimestres lançados. Aprovação: média 6,0 e frequência de 75%." |
| T9 | **B** | `rede-atos.js` (alerta) | "3 atos vencidos ou a 120 dias do vencimento sem pedido de renovação. Inicie a renovação para a escola não ficar impedida…" (comprido) | "3 atos vencidos ou a vencer em até 120 dias, sem pedido de renovação." |
| T10 | **B** | `ui.js`, `escola-*.js` (toasts) | "Diário salvo.", "Chamada registrada." (ok), mas também "Estudante voltou para a lista de espera.", "Componente sem professor." (vago) | Frases com objeto e efeito: "Diário salvo: 8 estudantes, 1ª série A." |
| T11 | **B** | `sistema-academico-seed-prototipo.html` | "Disponível na versão completa" em relatórios; "Painel da escola" | "Relatório ainda não implementado no protótipo." |

Não foram encontrados: "Bem-vindo ao futuro…", "Transforme…", "Potencialize…", "Tudo em um só lugar", "incrível/poderoso/intuitivo", "Algo deu errado", "Clique aqui", "Saiba mais". As mensagens do assistente e a base de conhecimento (escritas pela equipe) são funcionais e diretas; a única alteração possível é de nomes, ver D1.

## 3. Dados

| ID | Imp. | Onde | Sinal | Correção proposta |
| --- | --- | --- | --- | --- |
| D1 | **A** | `data/professor.json` (diário), `estudantes.json`, `matriculas.json` | **Nomes de lista de exemplo:** o diário tem nomes em ordem alfabética perfeita pela inicial (Ana, Bruno, Carla, Davi, Emanuelly, Felipe, Gabriela, Heitor, Igor, Júlia, Kauã); sobrenomes repetidos e de "top 10" (Souza, Lima, Santos, Oliveira, Rocha, Andrade, Nunes); "Santos" três vezes na mesma família | Nomes brasileiros variados, inclusive compostos e com sobrenomes menos comuns (ex.: Ítalo Vasconcelos Dantas, Maiara Nascimento de Jesus, Wesley Cardoso Menezes, Thaís Aragão Fontes), em ordem alfabética real de diário, sem sequência de iniciais |
| D2 | **A** | `data/escolas.json` e usos (`app.js`, `familia-documentos.js`, `matricula.js`, protótipo, `professores.json`) | Escolas com nomes de natureza inventados (Rio Sergipe, Maré Alta, Coqueiral, Cajueiro dos Ventos, Serra Azul); escolas estaduais reais costumam levar nome de pessoa | "Colégio Estadual Professor …" e "Escola Estadual …" com **nomes de pessoas fictícias** (sem usar nomes de escolas reais), municípios reais do estado |
| D3 | **M** | `escolas.json` (municípios e DRE) | Só 3 municípios (Aracaju, Nossa Senhora do Socorro, Itabaiana); nomenclatura das diretorias ("DEA — Aracaju", "DRE — Agreste Central") não conferida com a SEED | Incluir mais municípios reais de Sergipe (ex.: Lagarto, São Cristóvão, Estância, Propriá, Nossa Senhora da Glória) e marcar a nomenclatura de DRE para **confirmação com a SEED** |
| D4 | **A** | `professor.json`, `estudantes.json`, `letivo.json` | **Números redondos e "arrumados":** 80 aulas dadas para todos; notas em múltiplos de 0,5 (8,5; 8,0; 7,5; 7,0; 6,0); faltas 4, 22, 9, 14, 2, 11, 16, 5 (sem estrutura) | Aulas dadas irregulares (ex.: 83 na turma da manhã, 79 na da tarde); notas com casas variadas (7,3; 6,8; 4,6; 9,1), alguns estudantes com muitas faltas e notas baixas, outros sem nota lançada |
| D5 | **M** | `turmas.json` | Capacidades e matrículas redondas: 40/35/30 lugares; 38, 24, 35 matriculados; "Sala 04 (40 lugares)" | Capacidades reais de sala (36, 38, 42), ocupações irregulares (37, 29, 41), salas com identificação de bloco |
| D6 | **M** | `vagas.json`, `atos.json` | Vagas em blocos (8, 5, 4, 2, 6, 3, 0; 15, 11, 7, 9) e validades em 31/12 ou 31/03; resolução com números sequenciais | Vagas irregulares por série e escola; datas de validade variadas (14/08/2028, 06/03/2027…), números de resolução sem padrão |
| D7 | **B** | `professores.json`, `matriculas.json` (responsáveis) | Nomes de professores e responsáveis também de lista (Ana Lúcia Menezes, Marcos Vinícius Teles, Juliana Freitas, Roberto Andrade, Sandra Oliveira) | Mesma regra de D1 |
| D8 | **B** | `avisos.json`, `calendario.json` | Datas coerentes com o calendário de 2026 (feriados corretos), mas os avisos foram "publicados" em 15/09 e 22/09 e a rematrícula começa em 03/11: revisar se a ordem faz sentido com a data de referência 29/09/2026 | Manter o calendário; ajustar datas de publicação dos avisos e acrescentar um aviso de rotina (ex.: entrega de boletins do 2º bimestre) |
| D9 | **B** | `data/historicos.json` | Notas de histórico com uma nota perfeita (Educação Física 10,0; Filosofia 9,0) e cargas horárias regulares | Notas variadas; uma matéria com carga fora do padrão para gerar complementação |

Não foram encontrados: gráficos com curvas bonitas demais ou sempre crescentes (o sistema não tem gráficos), CPF ou dado de pessoa real, datas no ano errado.

## 4. Detalhes que faltam (o que uma equipe real colocaria)

| ID | Imp. | Onde | Falta | Proposta |
| --- | --- | --- | --- | --- |
| E1 | **M** | `app.js` (cabeçalho) | Não há **ano letivo** nem **bimestre em curso** visível | Mostrar "Ano letivo 2026 · 3º bimestre" no cabeçalho (dado já existe em `letivo.json`) |
| E2 | **M** | todas as páginas | Sem **rodapé** com versão do sistema, ambiente e data de atualização dos dados | Rodapé discreto: "Portal Acadêmico v1.0 · protótipo com dados fictícios · dados atualizados em 29/09/2026" |
| E3 | **M** | tabelas | Sem **contagem de registros** ("37 estudantes", "5 pedidos") | Linha de contagem acima ou abaixo de cada tabela |
| E4 | **B** | turmas | Turma sem **código** (ex.: `2026-EM1-A-MAT`) | Código de turma nos títulos e tabelas (novo campo derivado do que já existe: ano, série, letra, turno) |
| E5 | **B** | diário | Atalhos só existem por `Enter` (sem dica visível) | Dica discreta abaixo da tabela: "Enter desce para o próximo estudante · Tab vai para o campo seguinte" |
| E6 | **B** | tabelas e listas | Sem **última atualização** por registro ou por tela | "Atualizado em 29/09/2026, 14h05" nas telas de gestão, usando o histórico de ações que já existe |

## 5. O que já está bom (não vou mexer)

- Textos das mensagens do assistente, da base de conhecimento, do fluxo de matrícula (frases curtas, sem marketing).
- Vocabulário do domínio: bimestre, diário de classe, frequência, boletim, matrícula, enturmação, habilitação.
- Estados vazios e mensagens de validação já dizem o problema (por exemplo: "Nota inválida em …: use um valor de 0 a 10."; ver T7 para os erros genéricos).
- Ícones de um só estilo, sem emoji.
- Foco visível, contraste, navegação por teclado e `prefers-reduced-motion` (só podem ficar iguais ou melhores).

## 6. Plano das etapas 2 a 7 (depois da sua aprovação)

| Etapa | O que faço | Commit |
| --- | --- | --- |
| 2 · Base visual | Uma cor primária (azul) + uma de apoio (verde escuro); neutros; cores só para status; raios de 3/6 px; sombras só em flutuantes; remover a animação de página; cabeçalho liso sem monograma; caixa normal no cabeçalho de tabela (V5–V7, V8, V10, V12, V13, V15) | `style: base visual sóbria` |
| 3 · Componentes e layout | Tabelas no lugar de cartões em matrículas, enturmação, turmas e alocação; chamada em tabela; início sem hero e sem blocos de acesso; painéis diferentes por visão; selos menores; estados vazios só em texto (V1–V4, V9, V11, V14, V16, V17) | `style: tabelas e layout por tarefa` |
| 4 · Texto | Títulos, botões (verbo + objeto), erros com causa e ação, legendas curtas (T1–T11) | `refactor: revisa textos da interface` |
| 5 · Dados | Nomes, escolas, números, datas e vagas irregulares, **mantendo os mesmos campos e chaves** (D1–D9) | `fix: dados fictícios mais críveis` |
| 6 · Detalhes de equipe | Ano letivo no cabeçalho, rodapé, contagem de registros, código de turma, dica de atalhos, data de atualização (E1–E6) | `feat: detalhes de acabamento` |
| 7 · Verificação e registro | 360, 768 e 1440 px, console, fluxos, contraste e teclado; atualizar este arquivo com "antes e depois" por tela | `docs: registra correções` |

## 7. Decisões de que preciso

1. **Cor por visão:** no redesenho anterior eu propus (e você deixou a meu critério) uma cor de destaque por visão. Agora o pedido é uma cor primária e uma de apoio. Confirmo **remover as cores por visão** e diferenciar só pelo nome no cabeçalho?
2. **Nomes das escolas:** uso nomes de pessoas **fictícias** ("Colégio Estadual Professor …"), sem reproduzir escolas reais. Existe risco de coincidir com alguma escola real; prefere que eu acrescente "(fictícia)" no nome ou aviso no rodapé (recomendo o aviso no rodapé, "todas as escolas e pessoas são fictícias")?
3. **Nomenclatura das diretorias** ("DEA", "DRE — …"): mantenho como está e sinalizo para confirmar com a SEED, ou troco por um rótulo neutro ("Diretoria Regional 03")?
4. **Código de turma (E4):** cria um campo derivado (ano-série-letra-turno). É só exibição e não muda regra de negócio nem dados. Pode?
5. **Filtros e selos sem pílula:** troco para abas e texto com ponto de cor. Isso muda a aparência de todas as telas de gestão. Confirma?
6. **Tela inicial:** remover o hero e a grade de perfis e ficar com uma lista simples de entrada, alinhada à esquerda. Confirma?

## 8. Situação depois das correções (etapa 7)

Decisões da seção 7 aplicadas com o padrão recomendado: cores por visão removidas; aviso de dados fictícios no rodapé; nomenclatura de DRE mantida e **a confirmar com a SEED**; código de turma só de exibição; filtros como abas; início como lista.

Verificação: 20 páginas do portal a 360, 768 e 1440 px sem rolagem horizontal e sem erro no console; fluxos de matrícula, diário, rematrícula, declaração e equivalência; menu, busca, diálogos e teclado; protótipo em arquivo único a 390 e 360 px; script de contraste (todas as combinações passam). Falta olhar as telas com uma pessoa: os testes automáticos não julgam se "parece de gente".

### Antes e depois por tela

| Tela | Antes | Depois | Itens |
| --- | --- | --- | --- |
| Início do portal | Hero centralizado com monograma, quatro cartões de perfil com faixa colorida | Título "Entrar no sistema" e lista de perfis alinhada à esquerda; botão "Restaurar dados de demonstração" | V1, V2, T4 |
| Cabeçalho e rodapé | Faixa colorida, monograma "SE", sem ano letivo, sem rodapé | Texto "Secretaria de Estado da Educação · Sergipe / Portal Acadêmico", "Ano letivo 2026 · 3º bimestre em curso" (a partir de 1100 px), rodapé com versão, aviso de dados fictícios e data dos dados | V12, E1, E2 |
| Família · início | "Olá! O que você quer fazer?", quatro blocos de acesso rápido, cartões de número | Título com o nome do estudante e a turma, resumo em linha, próximas datas e pedidos em tabela | V3, V4, T1, T2 |
| Família · notas | Lista de matérias com parágrafo longo | Boletim em tabela com legenda curta | T8 |
| Professor · turmas | Cartões de número e cartões de turma | Resumo em linha, tabela com código da turma e carga horária | V4, E4 |
| Professor · diário | Grade de azulejos para a chamada, título só "Diário de classe" | Uma tabela com nota e caixa "Faltou hoje" por estudante, contagem e dica de teclado, título com turma e componente | V17, T6, E3, E5 |
| Escola · início, matrículas, enturmação, turmas, alocação | Cartões por registro | Tabelas com contagem; formulário de recusa como único cartão | V16, E3 |
| Rede · atos e vagas | Cartões de indicador; texto de alerta longo | Resumo em linha, tabelas ordenadas por vencimento, contagem sob a tabela | V4, T9, E3 |
| Todas | 5 cores de destaque, raios de 10 a 14 px, sombras em quase tudo, cabeçalho de tabela em caixa alta, selos em pílula, estado vazio com ícone | Azul primário e verde de apoio, raios de 3 a 6 px, sombra só em elementos flutuantes, cabeçalho de tabela normal, selos em texto (fundo só em atenção e erro), estado vazio só com texto | V5–V11, V13–V15 |
| Botões e mensagens | "Confirmar", "Recusar", "Aprovar", "Não foi possível salvar. Tente de novo." | "Confirmar matrícula", "Recusar matrícula", "Aprovar turma"; erros dizem o que aconteceu e o que fazer | T5, T7, T10 |
| Protótipo em arquivo único | Mesmos sinais do portal, dados antigos | Mesma marcação em lista/tabela e dados gerados a partir de `data/` | V18, T11 |

### Dados

Nomes de pessoas e escolas trocados (5 escolas em 4 municípios, uma turma com 37, outra com 29 e outra com 34 estudantes, capacidades 38, 36 e 34, salas com bloco), 83 aulas dadas, notas com casas variadas e estudantes com faltas altas, atos com validades sem padrão (um vencido, um vencendo em 2026), vagas irregulares, um terceiro aviso de rotina. Chaves e estrutura dos arquivos ficaram iguais; os protocolos passam a começar em `MAT-2026-0006`. As escolas e as pessoas são fictícias e o nome de alguma pode coincidir com um real; o rodapé avisa. D1–D9 resolvidos.

### O que não foi feito

- **E6 (última atualização por tela):** não implementado; o rodapé mostra só a data de referência dos dados.
- **Cartões restantes:** `escola-equivalencias`, `familia-matricula` e `escola-turmas` ainda têm cartões para blocos únicos (resumo do estudante, plano de adaptação, formulário); não são dados tabulares.
- **Nomenclatura de DRE:** os nomes ("DRE — Grande Aracaju", "Centro-Sul", "Agreste Central") são inventados e precisam ser conferidos com a SEED.
- **Teste de percepção:** só uma pessoa da equipe pode responder se ainda parece gerado por IA; recomendo mostrar as telas de diário, matrículas e atos sem o nome do sistema.
