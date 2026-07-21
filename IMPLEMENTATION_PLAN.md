# Craque ou Bagre - Plano de Implementacao

1. Criar projeto Next.js com TypeScript strict, Tailwind, estado global, testes e scripts.
2. Definir modelos, schemas Zod e configuracoes de formacoes, taticas, raridades e dificuldade.
3. Montar dataset demonstrativo local validavel, com clubes-temporadas, jogadores, adversarios e conquistas.
4. Implementar motor separado da UI: RNG com seed, encaixe posicional, sorteio, rating, entrosamento, partidas, campanha e pontuacao.
5. Criar persistencia local versionada para campanha em andamento, historico e preferencias.
6. Construir rotas principais: inicio, jogar, campanha, resultado, desafio diario, historico, conquistas, como jogar, configuracoes e admin/dados.
7. Criar componentes de jogo: campo responsivo, cartas, paineis, timeline, placar, escudos genericos e carta compartilhavel.
8. Adicionar PWA, metadados, manifest, robots, sitemap e service worker simples.
9. Criar scripts de validacao/importacao/relatorios e documentacao operacional.
10. Cobrir regras centrais com Vitest e fluxo principal com Playwright.
11. Executar lint, testes e build; corrigir falhas encontradas.

Observacao operacional: este workspace nao expos Node/npm no PATH. O projeto sera estruturado para executar com `npm install`, `npm run lint`, `npm test` e `npm run build` em um ambiente Node local.
