"""Genera los iconos PNG de AquaRuta sin dependencias externas.

Uso: python scripts/generate-icons.py
"""
from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / "assets" / "images"

TEAL_DARK = (7, 59, 76)
TEAL_MID = (10, 79, 99)
TEAL_ACCENT = (14, 116, 144)
WHITE = (255, 255, 255)
TRANSPARENT = (0, 0, 0, 0)


def inside_drop(x: float, y: float, scale: float = 1.0) -> bool:
    """Gota: punta superior y cuerpo circular, escalada respecto al centro."""
    x = 0.5 + (x - 0.5) / scale
    y = 0.5 + (y - 0.5) / scale
    if y < 0.16 or y > 0.835:
        return False
    if y < 0.625:
        t = (y - 0.16) / (0.625 - 0.16)
        half = 0.212 * (t ** 0.82)
        return abs(x - 0.5) <= half
    return (x - 0.5) ** 2 + (y - 0.625) ** 2 <= 0.212 ** 2


def wave_pixel(x: float, y: float, scale: float = 1.0) -> bool:
    if not inside_drop(x, y, scale):
        return False
    sx = 0.5 + (x - 0.5) / scale
    sy = 0.5 + (y - 0.5) / scale
    if not (0.34 <= sx <= 0.66):
        return False
    wave1 = 0.665 + 0.028 * math.sin((sx - 0.5) * 34.0)
    wave2 = 0.735 + 0.022 * math.sin((sx - 0.5) * 34.0 + 1.1)
    return abs(sy - wave1) < 0.017 or abs(sy - wave2) < 0.014


def sample_icon(
    x: float,
    y: float,
    with_background: bool,
    drop_scale: float = 1.0,
    with_drop: bool = True,
):
    if with_background:
        color = TEAL_DARK
        dx, dy = x - 0.5, y - 0.53
        if dx * dx + dy * dy <= 0.405 ** 2:
            color = TEAL_MID
        if with_drop and inside_drop(x, y, drop_scale):
            color = WHITE
        if with_drop and wave_pixel(x, y, drop_scale):
            color = TEAL_ACCENT
        return (*color, 255)

    if with_drop and inside_drop(x, y, drop_scale):
        if wave_pixel(x, y, drop_scale):
            return (*TEAL_ACCENT, 255)
        return (*WHITE, 255)
    return TRANSPARENT


def render(
    size: int,
    with_background: bool,
    drop_scale: float = 1.0,
    with_drop: bool = True,
):
    samples = 3
    rows = []
    for py in range(size):
        row = bytearray()
        for px in range(size):
            r = g = b = a = 0
            for sy in range(samples):
                for sx in range(samples):
                    x = (px + (sx + 0.5) / samples) / size
                    y = (py + (sy + 0.5) / samples) / size
                    cr, cg, cb, ca = sample_icon(
                        x, y, with_background, drop_scale, with_drop
                    )
                    r += cr * ca
                    g += cg * ca
                    b += cb * ca
                    a += ca
            if a == 0:
                row.extend((0, 0, 0, 0))
            else:
                row.extend((round(r / a), round(g / a), round(b / a), round(a / (samples * samples))))
        rows.append(bytes(row))
    return rows


def write_png(path: Path, size: int, rows) -> None:
    raw = b"".join(b"\x00" + row for row in rows)
    def chunk(kind: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + kind
            + data
            + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
        )

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    path.write_bytes(png)


def main() -> None:
    IMAGES.mkdir(parents=True, exist_ok=True)
    write_png(IMAGES / "icon.png", 1024, render(1024, True))
    write_png(
        IMAGES / "android-icon-foreground.png",
        1024,
        render(1024, False, drop_scale=0.72),
    )
    write_png(
        IMAGES / "android-icon-background.png",
        1024,
        render(1024, True, with_drop=False),
    )
    write_png(
        IMAGES / "android-icon-monochrome.png",
        1024,
        render(1024, False, drop_scale=0.72),
    )
    write_png(IMAGES / "splash-icon.png", 1024, render(1024, False, drop_scale=0.82))
    write_png(IMAGES / "favicon.png", 64, render(64, True))
    print("Iconos generados en", IMAGES)


if __name__ == "__main__":
    main()
