"""Geração dos QR codes que serão colados em cada bloco."""
from io import BytesIO
from urllib.parse import urlencode

import qrcode
from qrcode.constants import ERROR_CORRECT_M


def url_do_bloco(frontend_url: str, bloco_id: str) -> str:
    """O QR aponta para o FRONT, já dizendo onde a pessoa está."""
    return f"{frontend_url.rstrip('/')}/?{urlencode({'origem': bloco_id})}"


def gerar_png(conteudo: str, tamanho_modulo: int = 10) -> bytes:
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_M, box_size=tamanho_modulo, border=4)
    qr.add_data(conteudo)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
