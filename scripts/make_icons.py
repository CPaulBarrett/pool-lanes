"""Draw the app icons (pool water with lane ropes) into site/icons/.

Only needs re-running if you change the design:  python3 scripts/make_icons.py
Requires Pillow (pip install pillow), which the website itself does not need.

Android crops icons into circles, squircles, etc. ("maskable" icons), so the
background fills the whole square and the important part stays inside the
middle 80% "safe zone".
"""

from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "site" / "icons"
WATER_TOP = (52, 132, 222)
WATER_BOTTOM = (24, 84, 176)
ROPE_COLOURS = [(255, 255, 255), (242, 209, 107)]  # white and yellow floats
SIZE = 1024  # draw large, then shrink for smooth edges


def draw_master() -> Image.Image:
    image = Image.new("RGB", (SIZE, SIZE))
    draw = ImageDraw.Draw(image)

    # Water: a vertical gradient from lighter to darker blue.
    for y in range(SIZE):
        t = y / (SIZE - 1)
        colour = tuple(round(a + (b - a) * t) for a, b in zip(WATER_TOP, WATER_BOTTOM))
        draw.line([(0, y), (SIZE, y)], fill=colour)

    # Three lane ropes made of alternating floats, inside the safe zone.
    margin = SIZE * 0.18
    float_w, float_h, gap = SIZE * 0.085, SIZE * 0.07, SIZE * 0.022
    for row in range(3):
        y = SIZE * (0.32 + row * 0.18)
        x, i = margin, 0
        while x + float_w <= SIZE - margin + 1:
            draw.rounded_rectangle(
                [x, y - float_h / 2, x + float_w, y + float_h / 2],
                radius=float_h / 2,
                fill=ROPE_COLOURS[i % 2],
            )
            x += float_w + gap
            i += 1
    return image


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    master = draw_master()
    for name, size in [("icon-512.png", 512), ("icon-192.png", 192),
                       ("apple-touch-icon.png", 180), ("favicon-32.png", 32)]:
        master.resize((size, size), Image.LANCZOS).save(OUT / name, optimize=True)
        print("wrote", OUT / name)


if __name__ == "__main__":
    main()
