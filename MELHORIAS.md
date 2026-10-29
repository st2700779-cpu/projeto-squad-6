# Melhorias do Portal Acadêmico — Squad 6

Documento de gestão do projeto. Resume o que foi melhorado, por que, o que ficou de fora e como executar. O estado anterior está em [`AUDITORIA.md`](AUDITORIA.md); ideias que exigiriam funcionalidade nova estão em [`SUGESTOES.md`](SUGESTOES.md).

**Princípios seguidos:** só HTML, CSS e JavaScript puro (o Bootstrap por CDN, que o projeto já usava, foi mantido); nenhuma tela, módulo ou dependência nova; todos os fluxos existentes continuam funcionando.

## 1. Resumo por fase (antes × depois)

### Fase 0 · Auditoria
- **Antes:** ninguém tinha o mapa do que existia. O pedido descrevia um protótipo simples (Aluno, Professor, Secretaria), mas o repositório continha o portal completo (4 visões), um protótipo em arquivo único e um protótipo antigo abandonado.
- **Depois:** mapa de arquivos, telas e fluxos, 30 problemas classificados por severidade e categoria e plano de melhorias ordenado por impacto ÷ esforço (`AUDITORIA.md`).

### Fase 1 · Arquitetura e qualidade de código
| Antes | Depois |
| --- | --- |
| `script.js` e `style.css` na raiz: código morto, com variáveis globais, `onclick` inline e `alert()` | Removidos (continuam no histórico do Git) |
| Todas as regras de negócio em um único `regras.js` | `assets/js/dominio/` com `matricula.js`, `notas.js`, `turmas.js` e `equivalencias.js`; `regras.js` reexporta tudo, então nenhuma página precisou mudar de import |
| Erro 404 de `/api/saude` no console de toda página em hospedagem estática | A sonda lê o cabeçalho `X-Portal-Api` de `config.js` (que sempre existe): console limpo |
| Poucos comentários de função | JSDoc nas funções principais de `dados`, `ui`, `estado`, `app` e nos domínios |
| Portal já tinha camada de dados, `localStorage` e "Reiniciar demonstração" | Mantido (já atendia ao pedido) |

### Fase 2 · Integração entre as visões
| Antes | Depois |
| --- | --- |
| Dois cadastros de turma sem ligação (`professor.json` com `t1…t6` e `turmas.json` com `tt1…tt5`) | **Uma turma só** (`turmas.json`). "Minhas turmas" do professor nasce da alocação feita pela escola; o estudante enturmado pela secretaria entra no diário com notas em branco |
| `aulasDadas` repetido em estudantes e professor | Fonte única: `data/letivo.json` |
| Dados do professor duplicados (`professor.json` × `professores.json`) | `professor.json` guarda só o usuário simulado e o diário; o cadastro do professor vem de `professores.json` |
| Sem regra explícita de situação | `notas.js`: média (1 casa decimal) ≥ 6 aprova, de 4 a 5,9 recuperação, abaixo de 4 reprova, frequência abaixo de 75 % reprova. Uma função (`situacao`) usada por família, diário e protótipo |
| "Indo bem / Precisa de atenção" na família | Aprovado / Em recuperação / Reprovado / Sem notas, sempre com texto (não só cor) |
| "Unidade", "trimestre" misturados | **Bimestre** em telas, calendário, avisos e base do assistente |
| Protótipo em arquivo único com outra aluna, outra escola, "1.284 estudantes" fixo e outra regra de frequência | Mesmos dados e mesma regra do portal, gerados por `node tools/gerar-prototipo.mjs`. Notas e chamada do professor aparecem para a família; confirmações da escola ficam salvas no navegador; "Reiniciar demonstração" restaura os dados |

Fluxo verificado em navegador: professor lança nota e chamada → boletim da família muda na hora; secretaria confirma matrícula e enturma → estudante aparece no diário do professor e em "Minhas turmas"; alocação da escola altera a carga horária do professor.

### Fase 3 · Design system e UI
- **Antes:** ~100 atributos `style=""` dentro dos templates, com espaçamentos e tamanhos diferentes para a mesma coisa.
- **Depois:** escala de espaçamento e de texto como variáveis CSS (`--esp-1…6`, `--texto-pequeno`, `--texto-medio`) e classes (`esp-t-N`, `esp-b-N`, `texto-pequeno`, …). Só ficaram inline as larguras das barras de progresso, que são valores calculados. Os tokens de cor, raio e toque já existiam em `tema.css`.
- Estado vazio e "Carregando…" com anúncio para leitor de tela e indicador; vazio novo em avisos, calendário e turmas.
- Confirmação antes de ações destrutivas: já existia; agora usa janela nativa (Fase 5).

### Fase 4 · Formulários e validações
- **Matrícula:** máscara de telefone `(79) 99999-9999`, data de nascimento sem futuro, validação ao sair de cada campo, mensagem que reserva altura (o botão não pula) e foco automático no primeiro campo com erro.
- **Diário:** validação enquanto digita (nota de 0 a 10, faltas inteiras até o total de aulas), nota normalizada para `8,5`, foco no primeiro erro ao salvar; nota em branco só é aceita para quem ainda não tem nota lançada. A mensagem fica abaixo do botão Salvar (antes de mover para lá, o clique no botão se perdia quando o erro aparecia).
- Não há campo de CPF em nenhuma tela, então não foi criada máscara de CPF.

### Fase 5 · Acessibilidade
| Antes | Depois |
| --- | --- |
| Janelas de confirmação sem trap de foco; Tab saía para a página | `<dialog>` nativo: foco preso, resto da página inativo, Esc fecha e devolve o foco |
| Janela de justificativa fechava ao clicar fora e perdia o texto | Só fecha por Cancelar ou Esc |
| Região de aviso criada junto com o texto (leitores podiam não anunciar) | Região `status` existe desde o carregamento |
| `role="list"` e `role="listitem"` em `div` e `details` | `ul` e `li` |
| Selo "info" com contraste 2,9:1 no modo escuro | 4,5:1 ou mais |
- Contraste conferido por cálculo em 4 combinações (claro, escuro, alto contraste claro e escuro), 19 pares de tokens: todos cumprem 4,5:1 (texto) ou 3:1 (bordas).
- Já existiam e foram mantidos: link "Pular para o conteúdo", um `h1` por página, tabelas com `caption` e `th scope`, todos os campos com rótulo, foco visível, `prefers-reduced-motion`, escala de letra, leitura em voz alta.

### Fase 6 · Responsividade e desempenho
- Varredura das 20 páginas do portal a 360, 390 e 1280 px: sem rolagem horizontal, sem erros ou avisos no console, um `h1` por página. A rolagem horizontal suspeita na auditoria era efeito da CDN bloqueada no ambiente de teste (com o Bootstrap carregado, não ocorre).
- Debounce de 200 ms nas três buscas.
- Scripts já eram módulos (`type="module"`, adiados por natureza); os dois scripts do `<head>` (`config.js` e `tema-inicial.js`) são pequenos e ficam síncronos de propósito, para o tema escuro não piscar.
- Menu do celular: mantidas as abas roláveis dos wireframes (W16).

## 2. Decisões técnicas e justificativas
1. **Portal como base.** É o produto completo; o protótipo em arquivo único passou a ser uma "versão sem servidor" do mesmo sistema.
2. **Regras em módulos por domínio, com `regras.js` como fachada.** Cumpre a separação por domínio pedida sem tocar nos imports das 20 páginas.
3. **Protótipo gerado, não copiado à mão.** `tools/gerar-prototipo.mjs` (Node opcional, sem dependências) injeta os dados e o código de `notas.js` no arquivo único. Assim as duas versões não divergem e o arquivo continua abrindo por duplo clique (módulos ES não carregam em `file://`).
4. **Situação com regras explícitas.** Faixa de recuperação de 4,0 a 5,9 confirmada pela equipe; ajustar é mudar as constantes no topo de `notas.js`.
5. **`<dialog>` nativo** em vez de trap de foco escrito à mão: menos código e comportamento padrão dos navegadores.
6. **Espaçamentos normalizados** para uma escala de 6 valores: alguns espaços mudaram em até 0,1 rem, o que é intencional (padronização).
7. **Sonda de API por cabeçalho**, não por rota inexistente, para não gerar erro no console.

## 3. Limitações conhecidas
- O portal completo **não abre com duplo clique** (`file://`): precisa de servidor (`iniciar.bat`, Live Server ou `python3 -m http.server`). Só o protótipo em arquivo único abre direto.
- Bootstrap e a fonte Atkinson Hyperlegible vêm de CDN. Sem internet, o sistema funciona, mas o visual muda.
- O diário mostra 8 estudantes de amostra na 1ª série A (a escola diz 38 matriculados) mais os que forem enturmados. Só a Matemática do estudante vem do diário; as demais matérias vêm do cadastro. As faltas do diário valem como frequência geral.
- A situação é **parcial** (2 bimestres lançados de 4). Não há lançamento de nota de recuperação.
- `iniciar.bat` e o servidor com API só funcionam no Windows.
- O protótipo em arquivo único não controla vagas.
- O assistente de IA (chat, voz, proxy) não foi alterado; suas janelas próprias não foram revisadas quanto ao trap de foco.
- As varreduras foram feitas em Chromium; não foi testado em Safari e Firefox nem com leitor de tela real.

## 4. Como executar
| Objetivo | Como |
| --- | --- |
| Portal completo, com API e dados salvos em disco (Windows) | Dois cliques em `iniciar.bat` |
| Portal em qualquer sistema | `python3 -m http.server 5500` na pasta e abrir `http://localhost:5500` (dados no navegador) |
| Portal no VS Code | Extensão Live Server, botão direito em `index.html` |
| Protótipo sem servidor | Duplo clique em `sistema-academico-seed-prototipo.html` |
| Restaurar os dados de demonstração | Botão "Reiniciar demonstração" na tela inicial (portal e protótipo) |
| Atualizar o protótipo depois de mudar `data/` ou `notas.js` | `node tools/gerar-prototipo.mjs` |

Documentação de regras de negócio, API local e assistente de IA: `README.md`.
