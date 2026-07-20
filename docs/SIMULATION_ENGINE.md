# Motor de Simulacao

O motor fica em `src/game-engine`. Ele calcula setores do time, entrosamento, modificadores taticos e forca do adversario. Os gols sao gerados por distribuicao de Poisson com limites de gols esperados, evitando placares absurdos frequentes.

Mata-matas empatados sao resolvidos por prorrogacao narrativa ou penaltis, garantindo que a partida termine.
