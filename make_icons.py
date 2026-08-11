"""Generate app icons from the Munster Target Shooting Club crest.
Source: uploaded club logo (transparent background, circular badge)."""
from PIL import Image

SRC = "/root/.claude/uploads/9c179a62-bacf-561c-8ee1-ab2f115ca4ba/bb48e35a-MTSCLOGOTransparent_Background__Jeff_Mccann.png"

def fit_square(img, size):
    """Resize with aspect preserved onto a transparent size x size canvas."""
    img = img.copy()
    img.thumbnail((size, size), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    x = (size - img.width) // 2
    y = (size - img.height) // 2
    canvas.paste(img, (x, y), img)
    return canvas

def make_maskable(img, size, bg=(21, 27, 41, 255)):
    """Maskable icons need important content inside the inner ~80% safe
    zone, with the background filled edge-to-edge (no transparency),
    since Android may crop/mask the outer ring into a circle/squircle."""
    canvas = Image.new("RGBA", (size, size), bg)
    inner = int(size * 0.78)
    scaled = img.copy()
    scaled.thumbnail((inner, inner), Image.LANCZOS)
    x = (size - scaled.width) // 2
    y = (size - scaled.height) // 2
    canvas.paste(scaled, (x, y), scaled)
    return canvas

src = Image.open(SRC).convert("RGBA")

fit_square(src, 192).save("icon-192.png")
fit_square(src, 512).save("icon-512.png")
make_maskable(src, 512).save("icon-512-maskable.png")
print("icons written from club logo")
