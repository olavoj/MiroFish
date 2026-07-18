# Design: Português do Brasil fixo no MiroFish

Data: 2026-07-17

## Objetivo

Disponibilizar toda a experiência do MiroFish em português do Brasil, incluindo interface, mensagens operacionais, respostas dos agentes e relatório final, sem adicionar seletor de idioma.

## Escopo

- Traduzir menus, títulos, botões, formulários, cards, estados vazios, indicadores de progresso e mensagens de erro do frontend.
- Traduzir os textos exibidos durante envio de materiais, construção do grafo, criação dos agentes, execução da simulação e geração do relatório.
- Instruir o backend e os prompts enviados ao LLM para que agentes, análises e relatórios sejam produzidos em português do Brasil.
- Preservar sem tradução nomes próprios e termos técnicos cuja tradução prejudique clareza, incluindo MiroFish, Zep, NVIDIA, Kimi, API e JSON.
- Não traduzir nomes de variáveis, endpoints, chaves de configuração ou estruturas internas.

## Abordagem

Centralizar os textos estáticos da interface em um módulo de conteúdo em português do Brasil e substituir textos literais dos componentes por referências a esse módulo. Como o produto será apenas em português, não será adicionada uma biblioteca completa de internacionalização.

No backend, acrescentar instruções explícitas e consistentes de idioma nos pontos de criação de personas, simulação, interação e relatório. As instruções devem exigir português brasileiro natural, preservando nomes próprios e conteúdo que precise permanecer literalmente igual ao material de origem.

## Fluxo

1. O usuário interage com a interface integralmente em português.
2. O frontend envia os mesmos dados e contratos de API já existentes.
3. O backend adiciona a orientação de idioma aos prompts.
4. O modelo retorna personas, interações, análises e relatório em português do Brasil.
5. O frontend apresenta o conteúdo dinâmico sem alterar sua estrutura.

## Tratamento de erros e conteúdo residual

- Traduzir mensagens de erro próprias da aplicação.
- Para erros técnicos originados em serviços externos, apresentar uma mensagem amigável em português e preservar detalhes técnicos apenas quando úteis ao diagnóstico.
- Fazer uma busca final por textos chineses e ingleses visíveis ao usuário.
- Conteúdo literal enviado pelo usuário não deve ser traduzido automaticamente.

## Compatibilidade

- Não alterar endpoints nem formatos JSON.
- Não alterar a configuração das APIs NVIDIA e Zep.
- Não modificar o fluxo funcional da simulação.
- Preservar layout, responsividade e identidade visual existentes.

## Validação

- Executar build e testes disponíveis do frontend e backend.
- Abrir todas as etapas principais da interface e verificar textos.
- Realizar uma simulação curta com material público e não confidencial.
- Confirmar que agentes, eventos e relatório final estão em português brasileiro.
- Confirmar que não há regressão nos contratos entre frontend e backend.

## Critérios de aceite

- Nenhum texto operacional visível permanece em chinês ou inglês.
- Todas as respostas geradas pelo MiroFish são solicitadas em português do Brasil.
- Nomes técnicos e próprios permanecem intactos.
- O projeto inicia normalmente com `npm run dev`.
- Uma simulação curta conclui sem erro e entrega relatório em português.
