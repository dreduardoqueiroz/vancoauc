# VancoAUC beira-leito

Calculadora clínica para ajuste de **vancomicina por AUC24** na **UTI Adulto do Hospital Promater**.
É uma ferramenta de apoio à decisão usada à beira do leito: um erro de cálculo aqui pode virar
uma dose errada em um paciente real.

## Estrutura

- `index.html` — o app inteiro (HTML, CSS e JavaScript num só arquivo, sem build e sem dependências
  em tempo de execução além das fontes do Google Fonts).
  - `VE` — motor farmacocinético (modelo monocompartimental, infusão de ordem zero, superposição):
    Cockcroft-Gault, CL/V populacionais (Matzke 1984), dose de ataque, regimes, ajuste por pico e vale.
  - `renderT1`…`renderT4` — as quatro abas: 1 · Início, 2 · Pico e vale, 3 · Infusão contínua, 4 · Hemodiálise.
  - `ciFit` — ajuste da infusão contínua pelo nível medido.
- `tests/` — testes automáticos de regressão (Node `node:test` + Playwright/Chromium).

## Regras obrigatórias

1. **Todo texto em português (Brasil).** Isso inclui a interface, mensagens de erro e alerta, o resumo
   para o prontuário, comentários novos no código, nomes de testes, mensagens de commit e
   documentação. Use vírgula decimal e separador de milhar com ponto na interface (`toLocaleString('pt-BR')`).
2. **Nenhuma alteração pode mudar os resultados dos cálculos sem aviso explícito.** Isso vale para
   dose de ataque, manutenção, intervalo, tempo de infusão, AUC, pico/vale previstos, condutas
   sugeridas, faixas de corte, tetos, arredondamentos e o texto do resumo para o prontuário.
   - Mudanças de layout, estilo, acessibilidade ou refatoração **devem manter os resultados idênticos**.
   - Se uma mudança altera (ou pode alterar) qualquer resultado — inclusive por efeito colateral,
     como trocar a ordem de arredondamento —, **pare e avise o usuário antes**, dizendo o que muda,
     de quanto e em quais situações. Só prossiga com aprovação explícita.
   - Nunca atualize os valores esperados em `tests/` para "fazer o teste passar" sem essa aprovação.
     Quando aprovada, atualize os valores e registre o motivo na mensagem de commit.
3. **Não invente referências, fórmulas ou parâmetros.** Constantes clínicas (Matzke, 25 mg/kg,
   teto de 3.000 mg/dose e 4.500 mg/dia, faixas do POP etc.) vêm do POP da unidade; não altere sem
   indicação do usuário.
4. O app não salva nem envia dados de pacientes. Não adicione armazenamento, analytics ou chamadas de rede.

## Testes

```sh
npm install   # uma vez (instala o Playwright)
npm test
```

Os testes abrem o `index.html` num Chromium sem interface, com relógio fixo (10/03/2026 10:10) e fuso
`America/Sao_Paulo`, e conferem, com o **exemplo que já vem preenchido** no app (homem, 58 anos, 72 kg,
170 cm, creatinina 1,1 mg/dL, AUC-alvo 480):

- os valores exibidos e o resumo para o prontuário de cada aba (ataque, manutenção, AUC, condutas, aprazamento);
- os valores numéricos brutos do motor `VE` e de `ciFit`, com tolerância pequena, para pegar mudanças
  que o arredondamento da tela esconderia.

Rode `npm test` **antes e depois de qualquer alteração** em `index.html`. Se o Chromium do Playwright não
estiver instalado, use `npx playwright install chromium` ou aponte `PW_CHROMIUM_PATH` para um Chromium existente.

Limitação: os testes cobrem só o cenário do exemplo. Mudanças em ramos que o exemplo não percorre
(por exemplo, obesidade, ClCr < 25, LRA, intervalo de 72 h na hemodiálise) não são detectadas por eles.
