"""Gera ícones do app, telas de abertura e imagens da Play Store."""
import pathlib
from PIL import Image, ImageDraw, ImageFont
root = pathlib.Path(__file__).resolve().parent.parent
res = root / 'android/app/src/main/res'
BLUE = (44, 63, 181); BLUE_D = (31, 45, 140); WHITE = (255, 255, 255); RED = (227, 73, 72); LINE = (190, 198, 238)
SS = 4  # supersampling

def notebook(size, scale=1.0):
    """Desenha a caderneta (página branca, margem vermelha, linhas) centrada numa tela transparente."""
    S = size * SS
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    w, h = S * 0.40 * scale, S * 0.50 * scale
    x0, y0 = (S - w) / 2 + S * 0.01 * scale, (S - h) / 2
    r = S * 0.045 * scale
    # sombra/lombada
    d.rounded_rectangle([x0 - S * 0.035 * scale, y0 + S * 0.015 * scale, x0 + w - S * 0.035 * scale, y0 + h + S * 0.015 * scale], r, fill=BLUE_D)
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], r, fill=WHITE)
    # margem vermelha
    mx = x0 + w * 0.22
    d.rectangle([mx, y0, mx + S * 0.008 * scale, y0 + h], fill=RED)
    # linhas: três de anotação e uma de total
    lw = S * 0.016 * scale
    for i, frac in enumerate((0.62, 0.48, 0.70)):
        y = y0 + h * (0.28 + i * 0.17)
        d.rounded_rectangle([mx + w * 0.10, y, mx + w * 0.10 + w * frac * 0.72, y + lw], lw / 2, fill=LINE)
    y = y0 + h * 0.80
    d.rounded_rectangle([mx + w * 0.10, y, x0 + w * 0.86, y + lw * 1.7], lw, fill=BLUE)
    return im.resize((size, size), Image.LANCZOS)

def flat(size, shape):
    S = size * SS
    bg = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(bg)
    if shape == 'circle': d.ellipse([0, 0, S - 1, S - 1], fill=BLUE)
    elif shape == 'square': d.rectangle([0, 0, S, S], fill=BLUE)
    else: d.rounded_rectangle([0, 0, S - 1, S - 1], S * 0.22, fill=BLUE)
    bg = bg.resize((size, size), Image.LANCZOS)
    bg.alpha_composite(notebook(size, 1.15))
    return bg

dens = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for k, f in dens.items():
    d = res / f'mipmap-{k}'
    flat(int(48 * f), 'rounded').save(d / 'ic_launcher.png')
    flat(int(48 * f), 'circle').save(d / 'ic_launcher_round.png')
    notebook(int(108 * f), 0.72).save(d / 'ic_launcher_foreground.png')
(res / 'values/ic_launcher_background.xml').write_text('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#2C3FB5</color>\n</resources>\n')
for p in res.glob('drawable*/splash.png'):
    w, h = Image.open(p).size
    im = Image.new('RGBA', (w, h), BLUE + (255,))
    s = int(min(w, h) * 0.42)
    im.alpha_composite(notebook(s, 1.15), ((w - s) // 2, (h - s) // 2))
    im.convert('RGB').save(p)
# Play Store
flat(512, 'square').convert('RGB').save(root / 'store/icone-512.png')
fg = Image.new('RGB', (1024, 500), BLUE)
fg.paste(notebook(380, 1.2), (40, 60), notebook(380, 1.2))
font_path = str(root / 'node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2')
try:
    from fontTools.ttLib import TTFont
    ttf = root / 'store/.archivo.ttf'
    t = TTFont(font_path); t.flavor = None; t.save(ttf)
    big = ImageFont.truetype(str(ttf), 92); big.set_variation_by_axes([780, 118])
    small = ImageFont.truetype(str(ttf), 30); small.set_variation_by_axes([500, 100])
    ttf.unlink()
except Exception as e:
    print('fonte padrão', e); big = ImageFont.load_default(92); small = ImageFont.load_default(36)
dr = ImageDraw.Draw(fg)
dr.text((430, 150), 'Caderneta', font=big, fill=WHITE)
dr.text((434, 272), 'Seu dinheiro, mês a mês.', font=small, fill=(220, 226, 255))
dr.text((434, 316), 'Contas, cartões, orçamento e metas.', font=small, fill=(220, 226, 255))
fg.save(root / 'store/grafico-destaque-1024x500.png')
print('ok')
