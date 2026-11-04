"""Gera um PNG para impressão por bloco (QR + nome embaixo), na pasta qrcodes/.

Uso:
    python scripts/gerar_qrcodes.py
    python scripts/gerar_qrcodes.py --frontend https://mapa-senai.exemplo.com
"""
import argparse
import sys
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

from app.config import get_settings  # noqa: E402
from app.services.grafo import Grafo, carregar_mapa  # noqa: E402
from app.services.qrcode_service import gerar_png, url_do_bloco  # noqa: E402


def fonte(tamanho: int) -> ImageFont.ImageFont:
    for nome in ("arialbd.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(nome, tamanho)
        except OSError:
            continue
    return ImageFont.load_default()


def main() -> None:
    cfg = get_settings()
    ap = argparse.ArgumentParser()
    ap.add_argument("--frontend", default=cfg.frontend_url)
    args = ap.parse_args()

    saida = RAIZ / "qrcodes"
    saida.mkdir(exist_ok=True)
    grafo = Grafo(carregar_mapa(cfg.mapa_path))

    for bloco in grafo.blocos():
        url = url_do_bloco(args.frontend, bloco.id)
        qr = Image.open(BytesIO(gerar_png(url, tamanho_modulo=20)))
        cartaz = Image.new("RGB", (qr.width, qr.height + 160), "white")
        cartaz.paste(qr, (0, 0))
        d = ImageDraw.Draw(cartaz)
        d.text((qr.width / 2, qr.height + 20), f"Você está no {bloco.nome}", fill="black",
               font=fonte(48), anchor="mt")
        d.text((qr.width / 2, qr.height + 90), "Escaneie para traçar sua rota", fill="black",
               font=fonte(32), anchor="mt")
        arq = saida / f"qrcode-bloco-{bloco.id}.png"
        cartaz.save(arq)
        print(f"{arq.name}  ->  {url}")


if __name__ == "__main__":
    main()
