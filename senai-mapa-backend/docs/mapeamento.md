# Mapeamento: da ortofoto ao grafo

O app não "enxerga" a foto. Ele só conhece **pontos** e **conexões**. A foto serve de fundo para o front desenhar a rota.

## Conceitos

- **Ponto do tipo `bloco`**: destino que aparece na lista do app. Coloque na **porta de entrada** do bloco, não no centro do telhado.
- **Ponto do tipo `passagem`**: esquina, bifurcação de corredor, início e fim de escada ou rampa. O usuário não escolhe, mas a rota passa por ele.
- **Conexão**: trecho que dá para andar em linha reta entre dois pontos. Se o caminho real faz curva, quebre em dois trechos com uma `passagem` no meio.
- **`acessivel: false`**: o trecho tem escada ou degrau. A rota acessível evita.
- **`bidirecional: false`**: só dá para passar em um sentido (catraca, porta de saída).

Regra de ouro: **se a linha reta entre dois pontos atravessa um prédio, muro ou canteiro, está faltando uma passagem.**

## Passo a passo

1. Baixar a ortofoto do Drive (`ortofoto(rua) png.png`).
2. Reduzir:
   ```bash
   python scripts/reduzir_ortofoto.py "ortofoto(rua) png.png" --largura 2000
   ```
3. Abrir `scripts/marcador.html` no navegador (duplo clique) e carregar `app/data/ortofoto_reduzida.png`.
4. **Escala**: botão "Medir escala", clicar nas duas pontas de algo com medida conhecida (fachada de um bloco medida com trena, largura de uma quadra, vaga de estacionamento ≈ 5 m). Quanto maior a distância medida, menor o erro.
5. Marcar primeiro todos os **blocos**, depois as **passagens**, depois as **conexões**.
6. "Gerar mapa.json", copiar e colar em `app/data/mapa.json`.
7. Reiniciar o servidor e conferir em `/docs`.

## Divisão sugerida entre grupos

Cada grupo mapeia uma região do campus usando um prefixo de ID nas passagens (`N1, N2` norte, `S1, S2` sul...). No final, um arquivo único é montado e os pontos de fronteira são ligados. Combinar os IDs de fronteira antes de começar.

## Conferência antes de entregar

- [ ] Todo bloco tem ao menos uma conexão
- [ ] Nenhuma linha atravessa prédio
- [ ] Escadas marcadas como não acessíveis
- [ ] `pytest` todo verde
- [ ] Rota de A para cada um dos outros blocos testada em `/docs`
