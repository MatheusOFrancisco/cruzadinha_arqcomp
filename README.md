# BYTE//CROSS — Cruzadinha de Arquitetura Computacional

Jogo de palavras cruzadas desenvolvido para praticar termos de Arquitetura Computacional diretamente no navegador.

## Tecnologias

- HTML5: estrutura semântica da página e dos controles.
- CSS3: layout responsivo e identidade visual arcade.
- JavaScript puro: geração da grade, seleção de palavras, preenchimento, conferência e pontuação.
- GitHub Pages: publicação como site estático.

Não há backend, banco de dados, cadastro ou dependências de servidor. O nickname é apenas uma identificação visual local.

## Como jogar

1. Abra o site publicado.
2. Digite um nickname (opcional).
3. Escolha uma pista horizontal ou vertical.
4. Digite as letras diretamente nas casas do tabuleiro. Os cruzamentos compartilham a mesma casa.
5. Clique em **Conferir** para verificar as palavras completas.
6. Use **Reiniciar** para limpar as letras sem trocar a grade.
7. Use **Nova partida** para gerar outra combinação aleatória de 12 palavras.

## Palavras e pistas

A cada partida, o jogo seleciona 12 dos 16 termos da atividade e tenta montar uma grade conectada. As respostas usam letras maiúsculas, sem acentos e sem espaços.

| Termo | Pista provisória |
|---|---|
| CPU | Executa instruções e coordena operações fundamentais do computador. |
| ULA | Realiza cálculos aritméticos e operações lógicas dentro do processador. |
| UC | Orienta a ordem das etapas para que cada comando seja realizado corretamente. |
| REGISTRADORES | Pequenas áreas internas que guardam temporariamente valores usados pelo processador. |
| RAM | Armazenamento temporário utilizado por aplicativos enquanto estão em execução. |
| ROM | Guarda instruções permanentes, preservadas mesmo quando falta energia. |
| EEPROM | Componente não volátil cujos conteúdos podem ser apagados e regravados eletricamente. |
| FLASH | Tecnologia não volátil que permite apagar e gravar informações em blocos. |
| CACHE | Mantém cópias de informações frequentes para reduzir o tempo de acesso. |
| MEMORIADEMASSA | Guarda arquivos por longos períodos, mesmo após o desligamento do equipamento. |
| DMA | Permite que periféricos transfiram informações sem depender continuamente do processador. |
| ADDRESSBUS | Conjunto de linhas que indica a localização usada numa operação. |
| DATABUS | Canal que transporta valores entre componentes durante o funcionamento do sistema. |
| MICROCONTROLADOR | Circuito integrado que reúne processamento, armazenamento e interfaces para tarefas específicas. |
| DUALCORE | Arquitetura de processador que possui duas unidades de execução. |
| QUADCORE | Arquitetura de processador que possui quatro unidades de execução. |

> **Importante:** as pistas acima são provisórias e foram elaboradas com conhecimentos gerais. O e-book indicado na atividade não foi disponibilizado; portanto, ainda não é possível confirmar que cada definição corresponde exatamente ao material da disciplina. Revise as pistas com o e-book antes da entrega, se conseguir acesso a ele. As pistas também devem ser conferidas quanto à regra de não revelar a resposta ou parte dela.

## Estrutura de arquivos

```text
arqcomp-cruzadinha/
├── index.html
├── style.css
├── script.js
└── README.md
```

## Publicação no GitHub Pages

1. Crie um repositório público chamado `arqcomp-cruzadinha`.
2. Envie os arquivos para a branch `main`, mantendo `index.html` na raiz.
3. Abra **Settings → Pages**.
4. Em **Source**, selecione **Deploy from a branch**.
5. Selecione a branch `main` e a pasta `/(root)` e salve.
6. Aguarde a publicação e teste o link em uma janela anônima.

O endereço seguirá o formato `https://SEU-USUARIO.github.io/arqcomp-cruzadinha/`.

## Testes recomendados

- Gerar várias partidas e confirmar que todas exibem 12 palavras conectadas.
- Preencher palavras horizontais, verticais e cruzamentos.
- Conferir palavras corretas, incorretas e incompletas.
- Reiniciar e confirmar que a grade e as pistas permanecem iguais.
- Testar navegação por teclado e telas estreitas.
- Verificar o console do navegador em busca de erros.

## Versionamento

A atividade solicita pelo menos 6 commits distribuídos em pelo menos 2 dias diferentes. Faça commits reais ao longo do desenvolvimento, por exemplo:

```text
feat: cria estrutura inicial da cruzadinha
style: define identidade visual arcade
feat: adiciona banco de palavras e pistas
feat: implementa geração aleatória do tabuleiro
feat: adiciona preenchimento e navegação pelas casas
feat: implementa conferência e contador de acertos
fix: corrige comportamento de reiniciar a partida
docs: documenta o jogo e a publicação
```

Não crie commits artificiais apenas para atingir a quantidade mínima.
