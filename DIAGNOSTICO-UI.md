# Diagnóstico visual (UI/UX) — Fase 0

Data: 29/09/2026 · Base: branch `claude/friendly-goodall-9bwbbq` (estado após o PR #1). Nenhum arquivo do sistema foi alterado; este documento é o único produto da fase.

## 0. Como foi feito e o que vale saber antes

- As **20 páginas do portal** e as **3 telas do protótipo em arquivo único** foram capturadas em **360 px e 1280 px** (Chromium). Vi de perto: início, família (início, notas, matrícula), professor (diário), escola (início, turmas, matrículas), rede (atos) e o protótipo (secretaria). As demais telas usam os mesmos componentes e foram avaliadas pelas capturas gerais, pela estrutura do código e por medições automáticas (alvos de toque, rolagem horizontal, contraste).
- **768 e 1024 px ainda não foram capturados**; entram na verificação de cada fase, junto com 360 e 1440.
- No ambiente de teste a fonte do Google Fonts não carrega; as capturas usam a fonte de reserva do sistema. Tipografia é avaliada pelo CSS, não pela captura.
- **Correspondência com o pedido:** "Aluno" = **Família e estudante**; "Secretaria" = **Escola** (secretaria, coordenação e direção). O portal tem ainda a visão **Rede (SEDUC e DRE)**, que entra no mesmo tratamento.
- Escala de impacto: **A** alto, **M** médio, **B** baixo.

## 1. Problemas que se repetem em todas as telas

### 1.1 Identidade e credibilidade institucional

| ID | Imp. | Problema |
| --- | --- | --- |
| G1 | **A** | **Visual monocromático de "wireframe"**: preto, cinza e branco, com bordas grossas (2 px) e cantos muito arredondados (18 a 22 px). A única cor de marca é o azul do botão do assistente. Passa a impressão de esboço, não de sistema oficial |
| G2 | **A** | **Cabeçalho sem identidade**: só o texto "Portal Acadêmico". Não há nome do órgão (SEDUC/SE, Governo de Sergipe), nenhum símbolo/logotipo, nem o **usuário logado** (nome, perfil, escola). O perfil só aparece como texto ao lado ("· Escola") em telas largas |
| G3 | **A** | **Sem diferenciação entre as visões**: Família, Professor, Escola e Rede têm exatamente a mesma aparência; o usuário não sabe "onde está" além do texto do cabeçalho |
| G4 | **M** | Tom de tela inicial e telas de família muito "aplicativo infantil" (blocos gigantes com ícone preto); as visões de gestão (Escola, Rede) herdam isso e ficam pouco densas e pouco profissionais |
| G5 | **B** | Faixa amarela "Protótipo de demonstração" solta no fim da página de família, com estilo diferente do resto |

### 1.2 Estrutura, navegação e hierarquia

| ID | Imp. | Problema |
| --- | --- | --- |
| N1 | **A** | **Sem breadcrumb** e sem área de título de página padronizada: cada tela começa com um `h1` solto, com espaçamentos diferentes (Diário: título e seletor de turma colados no cartão; Turmas: título e seletor de papel sem separação) |
| N2 | **A** | **Menu lateral não colapsa** no desktop e, no celular, vira uma fileira de abas rolável que corta itens (ex.: "Entu…", "Vagas po…"), sem indicar que há mais. Não é gaveta |
| N3 | **M** | O traço vertical do menu lateral **termina no meio da página** (altura fixa `100vh − 66 px`), o que parece defeito de layout em telas altas |
| N4 | **M** | **Painéis iniciais sem hierarquia**: Escola tem 4 números, mas sem ícone, sem comparação nem link visível; "1 autorizações vencidas" (plural incorreto); Rede e Professor não têm painel, começam direto em tabela/lista |
| N5 | **M** | Início do portal ("Quem está usando?"): metade da tela vazia; os 4 perfis parecem botões iguais, sem descrição do que cada perfil faz além de uma linha |
| N6 | **B** | Nomes de perfil incoerentes entre telas ("Família e estudante" / "Família"; "Rede (SEDUC e DRE)" / "Rede (SEDUC)") |

### 1.3 Componentes

| ID | Imp. | Problema |
| --- | --- | --- |
| C1 | **A** | **Botão flutuante "Tirar dúvida" cobre conteúdo**: na matrícula em 360 px cobre o botão **Continuar**; no diário cobre a coluna de presença e faltas; em cartões cobre texto. Ocorre em quase todas as telas |
| C2 | **A** | **Tabelas sem tratamento**: sem cabeçalho fixo, sem zebra ou hover de linha, colunas de largura ruim (em Atos, a coluna "Escola" quebra em 4 a 5 linhas mesmo em 1280 px e o botão "Iniciar renovação" fica desproporcional), números não alinhados à direita. No celular a tabela de Atos vira rolagem horizontal com colunas cortadas |
| C3 | **M** | **Botões**: só duas variantes reais (preto cheio e contorno) e perigo; sem variante "texto"; hover apenas escurece (`brightness`); tamanhos variam (36 px em "Reiniciar demonstração", 48, 58 px) |
| C4 | **M** | **Selos de status**: já levam texto (bom), mas sem ícone; "Aguardando confirmação" (tracejado) e "Vence em 63 dias" têm o mesmo visual para significados diferentes; sem selo de "ativo/inativo" |
| C5 | **M** | Cartões: borda de 2 px cinza em tudo; cartão de conteúdo, cartão de ação e cartão de destaque diferem só por espessura; não há cabeçalho/ações padronizados |
| C6 | **M** | Cartão de chamada do diário: nomes longos quebram em 3 linhas e os cartões ficam de alturas diferentes |
| C7 | **M** | Formulários: rótulos visíveis (bom), mas erros aparecem em local fixo abaixo do formulário e não do campo; sem agrupamento em `fieldset` visível; campo de data mostra `mm/dd/yyyy` em navegador em inglês |
| C8 | **B** | Ícones: um só estilo (traço), mas só 30 ícones e nenhum para status; alguns botões só de ícone (Ouvir) sem rótulo visível |

### 1.4 Tipografia, cor e espaçamento

| ID | Imp. | Problema |
| --- | --- | --- |
| T1 | **M** | **Escala tipográfica sem sistema**: 20 tamanhos diferentes em CSS (`.88`, `.9`, `.92`, `.95`, `1.02`, `1.05`, `1.08`, `1.1`, `1.12`, `1.15` rem…). Títulos `h1` de 1,75 rem a 2,6 rem conforme a tela |
| T2 | **M** | Fonte Atkinson Hyperlegible: excelente legibilidade, mas com aparência pouco "institucional" e negrito muito pesado nos títulos |
| T3 | **M** | Cores fora dos tokens no CSS (`#111`, `#fff`, `#444`, `#bbb` na folha da declaração); tokens sem escala (não há tons 50 a 900, nem sucesso/alerta/erro/informação com fundo, borda e texto definidos como conjunto) |
| T4 | **B** | Espaçamento: a escala de 6 valores criada no PR #1 resolveu os `style=""`, mas os componentes ainda usam valores soltos (`.7rem`, `.9rem`, `1.1rem`) |
| T5 | **B** | Só 6 `box-shadow` e 2 `transition` no CSS inteiro: interface "chapada", sem profundidade nem feedback de movimento |

### 1.5 Estados e feedback

| ID | Imp. | Problema |
| --- | --- | --- |
| E1 | **M** | Carregamento = texto "Carregando…" com indicador; **sem skeleton**, e o layout "pula" quando o conteúdo chega |
| E2 | **M** | Estados vazios existem em várias listas (ícone + texto, bom), mas sem ilustração e com aparência de caixa tracejada pouco convidativa |
| E3 | **M** | Toast: caixa preta ao centro-baixo, sem ícone de sucesso/erro/aviso e sem botão de fechar |
| E4 | **B** | Ações de gravação (Salvar diário, Confirmar) não mostram estado "salvando" no botão |

### 1.6 Responsividade

| ID | Imp. | Problema |
| --- | --- | --- |
| R1 | **A** | Tabelas largas (Atos, Vagas, Equivalências, Matrizes) rolam na horizontal com colunas cortadas, sem sombra indicando que há mais; poderiam virar cartões |
| R2 | **M** | Alvos de toque menores que 44 px (medido em 360 px): botão "Reiniciar demonstração" (216×36), link "voltar" da declaração (38×44), links soltos em Documentos (42×19) e Enturmação (65×19), `summary` "Criar nova turma" (286×24) |
| R3 | **M** | No desktop, as telas de família ficam numa coluna de 620 px centralizada com grandes áreas vazias dos lados; as demais usam 1180 px. Inconsistência de largura |
| R4 | **B** | Não há rolagem horizontal da página em nenhuma tela de 360 a 1280 px (verificado) |

### 1.7 Acessibilidade (o que ainda falta)

O sistema já tem: link para pular, um `h1` por página, foco visível, `prefers-reduced-motion`, escala de letra, alto contraste, contraste de 4,5:1 nos tokens (verificado no PR #1) e diálogos com foco preso.

| ID | Imp. | Problema |
| --- | --- | --- |
| A1 | **M** | O botão flutuante do assistente (C1) prejudica também usuários de zoom e de teclado: cobre controles focados |
| A2 | **M** | O foco é um contorno azul de 3 px igual em todos os elementos, sem distinção em fundos escuros dos botões pretos (contraste do anel contra o botão preto: baixo) |
| A3 | **B** | Selo "Aguardando confirmação" e "Vence em 63 dias" dependem do tracejado para se diferenciar (o texto ajuda, mas o ícone não existe) |
| A4 | **B** | Painel do menu lateral no celular: itens fora da tela não são anunciados como "mais itens" |

## 2. Diagnóstico por tela

Legenda: **A/M/B** = impacto. "Comum" = vale o que está na seção 1.

### Início do portal (`index.html`)
- **M** Metade inferior vazia; cartões de perfil iguais entre si; sem marca do órgão.
- **B** Botão "Reiniciar demonstração" pequeno (36 px) e sem destaque como ação de manutenção.

### Visão Família e estudante (Aluno)
| Tela | Problemas |
| --- | --- |
| Início (`familia/index`) | **A** Sem indicadores: o que a família mais quer ver (frequência, situação, próxima data) não aparece; só blocos de navegação. **M** Cartão do estudante repete o seletor logo acima (Carla aparece duas vezes). **M** Coluna estreita no desktop. **B** Faixa amarela solta |
| Matrícula (`familia/matricula`) | **A** Botão flutuante cobre "Continuar" em 360 px. **M** Erro não fica junto do campo. **M** Campo de data no formato do navegador. **B** Barra de progresso sem rótulo dos passos |
| Notas e faltas | **M** Cartão de frequência com botão "Resumo" quebrando para baixo do título em 360 px. **M** Parágrafo explicativo longo no fim, escondido atrás do botão flutuante. **M** Lista de matérias sem alinhamento tabular claro |
| Documentos | **M** Lista de documentos com o mesmo peso visual de botões de ação. **B** Links de 19 px de altura |
| Declaração | **M** Folha para imprimir com cores fixas (`#111`), fora dos tokens (intencional para impressão, mas deve virar token de "papel"). **B** Link voltar de 38 px |
| Calendário e avisos | **M** Datas em cartões iguais aos avisos; sem agrupamento por mês; sem destaque para o que é próximo |

### Visão Professor
| Tela | Problemas |
| --- | --- |
| Minhas turmas | **M** Cartão do professor com muito texto; carga horária em barra sem valor destacado. **M** Tabela sem cabeçalho fixo nem zebra |
| Diário de classe | **A** Seletor de turma encostado no cartão da chamada (sem respiro). **A** Botão flutuante cobre presença e faltas. **M** Cartões da chamada de alturas diferentes. **M** Não mostra situação por estudante (aprovado, recuperação, reprovado) na tabela; só a % de presença. **M** Campos de nota e faltas sem unidade nem legenda visível no desktop |
| Avisos | Comum |

### Visão Escola (Secretaria, coordenação e direção)
| Tela | Problemas |
| --- | --- |
| Início | **A** Painel com 4 números sem ícone, sem link evidente, "1 autorizações". **M** Bloco de autorizações e histórico com hierarquia fraca |
| Matrículas | **M** Cartões de pedido longos e repetitivos (uma linha de metadados cinza difícil de ler); muitos pedidos viram lista enorme; sem tabela compacta para volume. **M** Filtros como pílulas grandes ocupando duas linhas em 360 px |
| Enturmação | **M** Cartões com seletor de turma e botão lado a lado sem alinhamento; ocupação das turmas em barras sem rótulo numérico destacado. **B** Link de 19 px |
| Turmas | **M** Seletor "Você está como" (Coordenação/Direção) parece navegação e não um modo; `summary` "Criar nova turma" de 24 px. **M** Cartões de turma sem botão de ação alinhado à direita |
| Alocação | **M** Muitos cartões iguais (um por componente) e "Quadro de professores" com barras de carga sem valor no campo visível |
| Equivalências | **M** Tabela com resultados só em selo; sem legenda das cores |
| Avisos | Comum |

### Visão Rede (SEDUC e DRE)
| Tela | Problemas |
| --- | --- |
| Atos autorizativos | **A** Coluna "Escola" estreita (quebra em 4 a 5 linhas); botão "Iniciar renovação" grande; alerta vermelho ocupa 4 linhas em 360 px. **M** Números do topo sem ícone |
| Vagas por escola | **M** Tabela larga; sem destaque para escolas sem vaga |
| Matrizes curriculares | **M** Duas tabelas grandes sem cabeçalho fixo; sem indicação da versão em vigor |

### Protótipo em arquivo único (`sistema-academico-seduc-prototipo.html`)
- **A** Cabeçalho e conteúdo limitados a 620 px em qualquer tela: no desktop parece um celular no meio da tela.
- **M** Painel da escola com 4 cartões em 3+1; relatórios com botões que só avisam "disponível na versão completa".
- **M** Mesmos problemas de identidade (G1 a G3) e de componentes do portal.

## 3. Resumo por impacto

**Alto (8):** G1 visual monocromático · G2 cabeçalho sem identidade/usuário · G3 visões indistinguíveis · N1 sem breadcrumb/título de página · N2 menu sem colapso/gaveta · C1 botão flutuante cobre conteúdo · C2 tabelas sem tratamento · R1 tabelas largas no celular.

**Médio (24):** G4, N3, N4, N5, C3 a C7, T1 a T3, E1 a E3, R2, R3, A1, A2 e os itens por tela marcados **M**.

**Baixo (10):** G5, N6, C8, T4, T5, E4, R4, A3, A4 e itens marcados **B**.

## 4. Como pretendo resolver (para sua aprovação)

Tudo em CSS e nas classes dos templates, sem telas, funções ou regras novas.

1. **Fase 1, design system:** tokens novos em `tema.css` (paleta institucional em azul de governo com verde de apoio; neutros; sucesso, alerta, erro e informação como conjuntos fundo/borda/texto; escala tipográfica; escala de 4 px; raios menores; sombras; transições). Cor de destaque por visão: **Família** teal, **Professor** índigo, **Escola** verde, **Rede** âmbar escuro. Tema escuro redefinindo só os tokens (o botão manual de modo escuro e o alto contraste continuam, porque já são fluxos existentes).
2. **Fase 2, componentes:** botões (primário, secundário, perigo, texto), cartões com cabeçalho/corpo/ações, tabelas (zebra, hover, cabeçalho fixo, números à direita, cartões no celular), selos com ícone, formulários com erro junto do campo, toast com ícone e fechar.
3. **Fase 3, layout:** cabeçalho com marca da SEDUC/SE e usuário simulado; menu lateral recolhível no desktop e gaveta no celular; título de página com breadcrumb; painéis de indicadores no topo de cada visão; larguras consistentes.
4. **Fase 4, experiência:** skeleton no carregamento; estado "salvando" nos botões; microinterações de 150 a 250 ms; botão do assistente que não cobre conteúdo (recuado e recolhível); atalhos onde já existe a tarefa (chamada e notas no diário; resumo do boletim).
5. **Fases 5 e 6:** verificação em 360, 768, 1024 e 1440 px; alvos de toque de 44 px; foco com anel duplo que funciona sobre fundos claros e escuros; contraste medido por script.

## 5. Decisões de que preciso

1. **Fonte:** manter **Atkinson Hyperlegible** (feita para legibilidade e boa para baixa visão, coerente com o requisito de acessibilidade do projeto) ou trocar por **Inter** (mais neutra e comum em sistemas públicos)? Recomendo **Inter para títulos e texto e manter opção de alto contraste**; se preferir priorizar acessibilidade, ficar com Atkinson.
2. **Identidade:** posso usar apenas **texto e um monograma simples** ("SEDUC/SE") como marca, sem brasão nem logotipo oficial (não tenho o arquivo e não devo reproduzi-lo). Se você tiver o logotipo autorizado, coloque em `assets/` e uso.
3. **Cores por visão:** aprova a proposta (Família teal, Professor índigo, Escola verde, Rede âmbar) ou prefere outra combinação?
4. **Usuário no cabeçalho:** o sistema não tem login; vou mostrar **usuário simulado** por visão (ex.: "Ana Lúcia Menezes · Professora", "Rosa Maria Santos · Responsável", "Secretaria · C. E. Rio Sergipe"), usando nomes que já existem nos dados. Está de acordo?
5. **Onde commitar:** o PR #1 (melhorias de código) ainda está aberto. Posso continuar **na mesma branch** (o PR passa a incluir também o redesenho) ou prefere que eu **espere o merge do PR #1** e faça o redesenho em outro PR? Recomendo esperar o merge, para revisão em partes; se não puder esperar, uso a mesma branch.
6. **Botão flutuante do assistente:** mantenho a função, mas mudo **posição e tamanho** (recolhido em círculo com ícone, sem texto, no canto, e sem cobrir botões de ação). Está de acordo?
