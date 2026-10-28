# Mapeamento: da ortofoto ao grafo

O app não "enxerga" a foto. Ele só conhece **pontos** e **conexões**. A foto serve de fundo para o front desenhar a rota.

## Conceitos

- **Ponto do tipo `bloco`**: destino que aparece na lista do app. Coloque na **porta de entrada** do bloco, não no centro do telhado.
- **Ponto do tipo `local`**: destino que não é bloco (Recepção, Biblioteca, Cantina, Labmaker...). Mesma regra: na porta.
- **Ponto do tipo `passagem`**: esquina, bifurcação de corredor, início e fim de escada ou rampa. O usuário não escolhe, mas a rota passa por ele.
- **Conexão**: trecho que dá para andar em linha reta entre dois pontos. Se o caminho real faz curva, quebre em dois trechos com uma `passagem` no meio.
- **`acessivel: false`**: o trecho tem escada ou degrau. A rota acessível evita.
- **`bidirecional: false`**: só dá para passar em um sentido (catraca, porta de saída).

Regra de ouro: **se a linha reta entre dois pontos atravessa um prédio, muro ou canteiro, está faltando uma passagem.**

## Convenções de nome (o front depende delas)

- **IDs em MAIÚSCULAS e sem acento**: `A`, `L`, `REC`, `BIB`, `CANT`. A API converte o que recebe para maiúsculas, então `Recepcao` nunca seria encontrado.
- **Passagens se chamam `Trecho (detalhe)`**: `Via principal (Bloco A)`, `Via principal (Recepção)`, `Estacionamento (corredor)`.
  O front agrupa passagens seguidas com o mesmo trecho num passo só: "Siga por Via principal (59 m)".
  Sem esse padrão, a lista de passos vira uma linha por esquina.

## O que já está no mapa.json (demonstração)

18 destinos e 25 passagens, com posições **aproximadas** marcadas sobre a `ortofoto_reduzida.jpg` (vertical, 2000x4001), e escala de 0,08 m/px estimada pelas vagas do estacionamento.

Faltam:
- Itens 9 a 15 da legenda (Labmaker, Administração, CAA, Sala de atendimento, Secretaria de cursos, Refeitório), Gráfica, Solda e Estacionamento exclusivo.
- Conferência **em campo**: portas reais de cada bloco, escadas (`acessivel: false`), portões que ficam fechados.
- Confirmar a escala com uma medida de trena.

## Passo a passo

1. Baixar a ortofoto do Drive (`ortofoto(rua) png.png`).
2. Reduzir:
   ```bash
   python scripts/reduzir_ortofoto.py "ortofoto(rua) png.png" --largura 2000
   ```
3. Abrir `scripts/marcador.html` no navegador (duplo clique), carregar `app/data/ortofoto_reduzida.jpg` e, para continuar o mapa existente, importar `app/data/mapa.json`.
4. **Escala**: botão "Medir escala", clicar nas duas pontas de algo com medida conhecida (fachada de um bloco medida com trena, largura de uma quadra, vaga de estacionamento, uns 5 m). Quanto maior a distância medida, menor o erro.
5. Marcar primeiro todos os **blocos**, depois as **passagens**, depois as **conexões**.
6. "Gerar mapa.json", copiar e colar em `app/data/mapa.json`.
7. Reiniciar o servidor e conferir em `/docs`.

## Divisão sugerida entre grupos

Cada grupo mapeia uma região do campus usando um prefixo de ID nas passagens (`N1, N2` norte, `S1, S2` sul...). No final, um arquivo único é montado e os pontos de fronteira são ligados. Combinar os IDs de fronteira antes de começar.

## Conferência antes de entregar

- [ ] Todo bloco tem ao menos uma conexão
- [ ] Nenhuma linha atravessa prédio
- [ ] Escadas marcadas como não acessíveis
- [ ] `pytest` todo verde (o `tests/test_mapa_real.py` confere o `mapa.json` de verdade: pontos válidos, nenhum destino isolado, rota entre todos os pares)
- [ ] Servidor sobe sem `WARNING: mapa.json: destinos sem caminho...` no terminal
- [ ] Rota de A para cada um dos outros blocos testada em `/docs`
