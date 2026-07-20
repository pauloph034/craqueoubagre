# Balanceamento

Probabilidades, dificuldades, taticas e pontuacao ficam em `src/config/game-balance.ts`.

O sorteio escolhe primeiro a raridade e depois um elenco elegivel dentro dela. Categorias sem candidatos tem peso zerado e o peso restante e redistribuido na escolha ponderada.
