"""Gera www/index.html (app offline) a partir dos fontes em src/."""
import pathlib, re, shutil
root = pathlib.Path(__file__).resolve().parent.parent
src = root / 'src'
www = root / 'www'
www.mkdir(exist_ok=True)
fonts = www / 'fonts'
fonts.mkdir(exist_ok=True)
nm = root / 'node_modules'
shutil.copy(nm / '@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2', fonts / 'archivo.woff2')
for w in (400, 500, 600, 700):
    shutil.copy(nm / f'@fontsource/public-sans/files/public-sans-latin-{w}-normal.woff2', fonts / f'public-sans-{w}.woff2')
shell = (src / 'shell.html').read_text()
shell = re.sub(r'<link rel="(preconnect|stylesheet)"[^>]*>\n?', '', shell)
title = re.search(r'<title>.*?</title>\n?', shell).group(0)
shell = shell.replace(title, '')
engine = (src / 'engine.js').read_text()
app = "(function(){\n'use strict';\n" + '\n'.join((src / f).read_text() for f in ('app1.js', 'app2.js', 'app3.js')) + "\n})();\n"
shell = shell.replace('/*ENGINE*/', engine).replace('/*APP*/', app)
faces = """<style>
@font-face { font-family: "Archivo"; src: url(fonts/archivo.woff2) format("woff2"); font-weight: 100 900; font-stretch: 62% 125%; font-display: swap; }
""" + ''.join(f'@font-face {{ font-family: "Public Sans"; src: url(fonts/public-sans-{w}.woff2) format("woff2"); font-weight: {w}; font-display: swap; }}\n' for w in (400, 500, 600, 700)) + """:root { color-scheme: light; padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }
body { margin: 0; overscroll-behavior-y: none; -webkit-tap-highlight-color: transparent; }
img { max-width: 100%; }
[hidden] { display: none !important; }
button, .nav-btn, .tab, .chip, .label, .eyebrow { -webkit-user-select: none; user-select: none; }
</style>
"""
doc = ('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
       '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
       '<meta name="theme-color" content="#eef1f4" media="(prefers-color-scheme: light)">'
       '<meta name="theme-color" content="#0e1117" media="(prefers-color-scheme: dark)">'
       + title + faces + '</head><body>\n' + shell + '\n</body></html>\n')
(www / 'index.html').write_text(doc)
print('www/index.html', len(doc), 'bytes')
