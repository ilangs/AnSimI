"""
Regenerate app icons so the character is fully visible on both iOS and Android.

Issue: The Android launcher applies a circular/squircle mask to adaptive icons,
clipping the outer ~33% of the foreground. The previous adaptive-icon.png had
the character filling the entire frame, so the hat, hand, and stop sign were
cut off.

Fix:
- Crop the source character (with white background) to its tight bounding box.
- For the Android adaptive icon foreground: place the character at ~62% of the
  1024px canvas, centered, on a transparent background. This keeps the entire
  character inside Android's safe zone (the inner ~66% circle).
- For iOS / generic icons: place the character at ~88% of the canvas on a
  white background (small margin so corners aren't clipped by iOS rounding).
- Regenerate icon-1024, icon-512, icon-192 at their nominal pixel sizes.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "apps" / "mobile" / "assets"
SRC = ROOT / "images" / "icon-1024.png"  # 560x560 character on white

WHITE = (255, 255, 255, 255)


def load_character_rgba() -> Image.Image:
    """Load source, isolate the character on transparent background."""
    img = Image.open(SRC).convert("RGBA")
    px = img.load()
    w, h = img.size
    # Treat near-white as background -> transparent
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r > 240 and g > 240 and b > 240:
                px[x, y] = (255, 255, 255, 0)
    # Tight crop to non-transparent bounds
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def fit_character(canvas_size: int, char: Image.Image, scale: float, bg: tuple) -> Image.Image:
    """Place the character centered at the given scale of canvas_size."""
    canvas = Image.new("RGBA", (canvas_size, canvas_size), bg)
    target = int(canvas_size * scale)
    cw, ch = char.size
    ratio = min(target / cw, target / ch)
    new_w, new_h = int(cw * ratio), int(ch * ratio)
    resized = char.resize((new_w, new_h), Image.LANCZOS)
    x = (canvas_size - new_w) // 2
    y = (canvas_size - new_h) // 2
    canvas.alpha_composite(resized, (x, y))
    return canvas


def main():
    char = load_character_rgba()
    print(f"Source character bbox size: {char.size}")

    # Android adaptive icon foreground: keep within safe zone (~66% circle).
    # Use 62% scale on a transparent canvas; backgroundColor #FFFFFF in app.config.
    adaptive = fit_character(1024, char, 0.62, (255, 255, 255, 0))
    adaptive.save(ROOT / "adaptive-icon.png", optimize=True)
    print("Wrote adaptive-icon.png (1024x1024)")

    # iOS / generic icon: white background, small margin so iOS rounding doesn't clip.
    for size in (1024, 512, 192):
        out = fit_character(size, char, 0.88, WHITE)
        out.convert("RGB").save(ROOT / "images" / f"icon-{size}.png", optimize=True)
        print(f"Wrote images/icon-{size}.png ({size}x{size})")

    # Top-level icon.png (used as Expo default) — match iOS character icon.
    icon = fit_character(1024, char, 0.88, WHITE)
    icon.convert("RGB").save(ROOT / "icon.png", optimize=True)
    print("Wrote icon.png (1024x1024)")

    # Notification icon: monochrome silhouette is ideal but keep colored 1024 for now.
    notif = fit_character(1024, char, 0.78, (255, 255, 255, 0))
    notif.save(ROOT / "notification-icon.png", optimize=True)
    print("Wrote notification-icon.png (1024x1024)")


if __name__ == "__main__":
    main()
