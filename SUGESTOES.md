# Sugestões que exigem funcionalidade nova

Durante a melhoria do protótipo, os itens abaixo apareceram como necessários ou desejáveis, mas **não foram implementados**, porque criariam telas, módulos ou dependências novas. Ficam registrados para decisão da equipe e da SEDUC/SE.

| # | Sugestão | Por que não foi feito agora | Justificativa / ganho |
| --- | --- | --- | --- |
| 1 | **Abrir o portal completo com duplo clique** (`file://`) | Exigiria empacotar `data/*.json` em arquivos `.js` gerados ou usar bundler. É mudança estrutural | O navegador bloqueia `fetch` e módulos ES em `file://`. Hoje: `iniciar.bat`, Live Server ou `python -m http.server`. O protótipo `sistema-academico-seduc-prototipo.html` abre direto e usa os mesmos dados e regras (gerados por `tools/gerar-prototipo.mjs`) |
| 2 | **Prova de recuperação** (lançamento de nota de recuperação e cálculo da média final) | Hoje só existe a *situação* "Em recuperação"; o lançamento da nota é funcionalidade nova | Fecha o ciclo aprovado/recuperação/reprovado descrito em `assets/js/dominio/notas.js` |
| 3 | **Boletim com quatro bimestres** e frequência por componente | O diário e o boletim trabalham com 2 bimestres lançados e faltas totais da turma | Aderência à legislação: frequência de 75 % é sobre o total de horas, mas o registro real é por componente |
| 4 | **Cadastro de estudante e de professor** pela secretaria | Só existem matrícula, turma, alocação e enturmação | Hoje o roster das turmas (38 matriculados na 1ª série A) é uma base fixa; o diário mostra 8 estudantes de amostra mais os enturmados na demonstração |
| 5 | **Perfil "Aluno" separado de "Família"** | O portal tem a visão Família e estudante | O estudante maior de idade pode ter acesso próprio, sem a rematrícula do responsável |
| 6 | **Login e perfis de acesso reais**, com trilha de auditoria gravada no servidor | Protótipo sem back-end | Confiabilidade e LGPD; o histórico de ações hoje fica no navegador ou em `dados-salvos/` |
| 7 | **Servidor estático com API para Linux e macOS** (equivalente ao `tools/servidor.ps1`) | `iniciar.bat` só funciona no Windows | Conveniência para quem não usa Windows. Alternativa sem código novo: `python3 -m http.server` (sem API, dados no navegador) |
| 8 | **Relatórios de verdade** (boletim consolidado, histórico escolar, Educacenso) | No protótipo B os botões avisam que a função existe só na versão completa | Rotina da secretaria; exige modelos oficiais da SEDUC |
| 9 | **Hospedar Bootstrap e a fonte Atkinson Hyperlegible no próprio repositório** | Acrescenta arquivos de terceiros ao projeto | Redes escolares costumam bloquear CDNs; sem elas o visual muda (o sistema continua funcionando) |
| 10 | **Vagas no protótipo em arquivo único** | O protótipo B não controla vagas por escola/série | O portal já controla (reserva, devolução) |
