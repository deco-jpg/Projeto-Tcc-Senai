"""Reduz a ortofoto original (100+ MB) para um tamanho que o celular aguenta.

Uso:
    python scripts/reduzir_ortofoto.py "ortofoto(rua) png.png" --largura 2000

Saída: app/data/ortofoto_reduzida.png + os valores para colar no bloco "imagem" do mapa.json.
O metros_por_pixel da ORIGINAL precisa vir de quem gerou a ortofoto (GSD do voo)
ou ser medido: distância real conhecida (ex.: fachada de um bloco, em metros) / pixels.
"""
import argparse
from pathlib import Path

from PIL import Image

Image.MAX_IMAGE_PIXELS = None  # a ortofoto passa do limite de segurança padrão do Pillow

DESTINO = Path(__file__).resolve().parent.parent / "app" / "data" / "ortofoto_reduzida.png"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("origem", type=Path)
    ap.add_argument("--largura", type=int, default=2000, help="largura final em pixels")
    ap.add_argument("--mpp-original", type=float, help="metros por pixel da imagem original")
    args = ap.parse_args()

    with Image.open(args.origem) as img:
        w, h = img.size
        fator = args.largura / w
        nova = img.convert("RGB").resize((args.largura, round(h * fator)), Image.LANCZOS)
        nova.save(DESTINO, optimize=True)

    print(f"Original: {w} x {h}  ->  Reduzida: {nova.width} x {nova.height}")
    print(f"Salvo em {DESTINO}\n")
    print('"imagem": {')
    print('  "arquivo": "ortofoto_reduzida.png",')
    print(f'  "largura": {nova.width},')
    print(f'  "altura": {nova.height},')
    if args.mpp_original:
        print(f'  "metros_por_pixel": {round(args.mpp_original / fator, 4)}')
    else:
        print('  "metros_por_pixel": ???   <- medir (ver docs/mapeamento.md)')
    print("}")


if __name__ == "__main__":
    main()
