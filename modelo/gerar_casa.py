#!/usr/bin/env python3
"""Gera casa.obj + casa.mtl (unidade: metros, Y para cima) a partir do croqui.
Abre no Blender (File > Import > Wavefront OBJ), FreeCAD, MeshLab, etc.
Edite as medidas abaixo e rode de novo: python3 gerar_casa.py
Planta: x vai da esquerda para a direita; p vai da frente (varanda/horizonte) para os fundos.
"""
import math

# ---------------- medidas (m) ----------------
W = 12.0            # largura da casa (x)
SOCIAL = 4.5        # profundidade cozinha+sala
CORREDOR = 1.2
QUARTOS = 3.5       # profundidade dos quartos
D = SOCIAL + CORREDOR + QUARTOS
H = 2.8             # pé-direito
V = 2.5             # varanda que circula a casa
BEIRAL = 0.7
INCL = 20           # graus
EXT, INT = 0.18, 0.12
LAJE = 0.3
GOURMET_W = 5.0     # área gourmet à esquerda (saída da cozinha)

# cômodos dos fundos (x início, x fim)
X_Q1, X_BAN, X_Q2 = 3.0, 5.0, 8.0     # divisórias: quarto | banheiro | quarto | suíte
X_BANCADA = 6.0                        # muro de bancada entre cozinha e sala

verts, faces = [], {}   # faces[mat] = [(i,j,k,l)...]
def box(x0, x1, y0, y1, p0, p1, mat):
    """caixa em coordenadas de planta (x, altura, p). p cresce para os fundos -> z = -p"""
    z0, z1 = -p1, -p0
    base = len(verts) + 1
    for x in (x0, x1):
        for y in (y0, y1):
            for z in (z0, z1):
                verts.append((x, y, z))
    v = lambda ix, iy, iz: base + ix * 4 + iy * 2 + iz
    f = faces.setdefault(mat, [])
    f += [(v(0,0,0), v(0,0,1), v(0,1,1), v(0,1,0)), (v(1,0,0), v(1,1,0), v(1,1,1), v(1,0,1)),
          (v(0,0,0), v(1,0,0), v(1,0,1), v(0,0,1)), (v(0,1,0), v(0,1,1), v(1,1,1), v(1,1,0)),
          (v(0,0,0), v(0,1,0), v(1,1,0), v(1,0,0)), (v(0,0,1), v(1,0,1), v(1,1,1), v(0,1,1))]

def quad(pts, mat, both=True):
    base = len(verts) + 1
    verts.extend(pts)
    f = faces.setdefault(mat, [])
    n = len(pts)
    f.append(tuple(range(base, base + n)))
    if both: f.append(tuple(range(base + n - 1, base - 1, -1)))

Y0 = LAJE
def wall(axis, fixed, a0, a1, t, openings, mat='parede', h=H):
    """axis 'x': parede ao longo de x em p=fixed ; axis 'p': ao longo de p em x=fixed.
    openings: (ini, fim, y_base, y_topo, tipo) tipo: 'vidro' | 'vao'"""
    def seg(u0, u1, y0, y1, m):
        if u1 - u0 < 1e-6 or y1 - y0 < 1e-6: return
        if axis == 'x': box(u0, u1, Y0 + y0, Y0 + y1, fixed - t/2, fixed + t/2, m)
        else:           box(fixed - t/2, fixed + t/2, Y0 + y0, Y0 + y1, u0, u1, m)
    cur = a0
    for (o0, o1, yb, yt, kind) in sorted(openings):
        seg(cur, o0, 0, h, mat)
        seg(o0, o1, 0, yb, mat)
        seg(o0, o1, yt, h, mat)
        if kind == 'vidro':
            # vidro fino + batentes
            if axis == 'x': box(o0, o1, Y0+yb, Y0+yt, fixed-0.01, fixed+0.01, 'vidro')
            else:           box(fixed-0.01, fixed+0.01, Y0+yb, Y0+yt, o0, o1, 'vidro')
            for u in (o0, o1 - 0.05):
                seg(u, u + 0.05, yb, yt, 'esquadria')
            seg(o0, o1, yt - 0.05, yt, 'esquadria'); seg(o0, o1, yb, yb + 0.05, 'esquadria')
        cur = o1
    seg(cur, a1, 0, h, mat)

# ---------------- terreno + lajes ----------------
FX0, FX1 = -V - GOURMET_W - 0.5, W + V + 0.5
FP0, FP1 = -V - 0.5, D + V + 0.5
box(-40, 60, -0.05, 0, -40, 60, 'grama')
box(-V - GOURMET_W, W + V, 0, LAJE, -V, D + V, 'piso')          # varanda + casa + gourmet

# ---------------- paredes externas ----------------
wall('x', D, 0, W, EXT, [   # fundos: janelas dos quartos
    (0.9, 2.1, 1.0, 2.1, 'vidro'), (3.6, 4.4, 1.7, 2.1, 'vidro'),
    (5.9, 7.1, 1.0, 2.1, 'vidro'), (9.4, 10.6, 1.0, 2.1, 'vidro')], 'parede')
wall('p', 0, SOCIAL + CORREDOR, D, EXT, [], 'parede')                       # esquerda (quartos)
wall('p', 0, 0, SOCIAL, EXT, [(1.4, 2.4, 0, 2.2, 'vao')], 'parede')          # esquerda (cozinha): saída p/ área gourmet
wall('p', 0, SOCIAL, SOCIAL + CORREDOR, EXT, [], 'parede')
wall('p', W, 0, D, EXT, [(1.4, 2.6, 1.0, 2.1, 'vidro'), (SOCIAL + CORREDOR + 1.0, SOCIAL + CORREDOR + 2.2, 1.0, 2.1, 'vidro')], 'parede')
wall('x', 0, 0, W, EXT, [   # frente (para o horizonte)
    (1.2, 3.4, 1.0, 2.1, 'vidro'),                    # janela cozinha
    (4.2, 5.4, 0, 2.2, 'vidro'),                      # porta cozinha p/ varanda
    (6.8, 9.8, 0, 2.2, 'vidro'),                      # portas de correr da sala
    (10.6, 11.6, 1.0, 2.1, 'vidro')], 'parede')       # janela sala

# ---------------- paredes internas ----------------
P1, P2 = SOCIAL, SOCIAL + CORREDOR
wall('x', P1, 0, W, INT, [(5.4, 6.6, 0, 2.1, 'vao')])                       # social | corredor
wall('x', P2, 0, W, INT, [(1.05, 1.95, 0, 2.1, 'vao'), (3.55, 4.45, 0, 2.1, 'vao'),
                           (6.05, 6.95, 0, 2.1, 'vao'), (9.55, 10.45, 0, 2.1, 'vao')])
for x in (X_Q1, X_BAN, X_Q2):
    wall('p', x, P2, D, INT, [])
# muro de bancada (cozinha | sala): baixo, com tampo
box(X_BANCADA - 0.12, X_BANCADA + 0.12, Y0, Y0 + 1.0, 1.0, 3.3, 'bancada')
box(X_BANCADA - 0.20, X_BANCADA + 0.20, Y0 + 1.0, Y0 + 1.05, 0.9, 3.4, 'tampo')

# ---------------- forro + pilares + vigas ----------------
box(0, W, Y0 + H, Y0 + H + 0.1, 0, D, 'forro')
PIL = 0.25
PX0, PX1, PP0, PP1 = -V + 0.25, W + V - 0.25, -V + 0.25, D + V - 0.25
def pilares_linha(vals_u, fixed, axis):
    for u in vals_u:
        x, p = (u, fixed) if axis == 'x' else (fixed, u)
        box(x - PIL/2, x + PIL/2, LAJE, Y0 + H + 0.25, p - PIL/2, p + PIL/2, 'madeira')
def espaco(a, b, passo=2.6):
    n = max(1, round((b - a) / passo)); return [a + (b - a) * i / n for i in range(n + 1)]
pilares_linha(espaco(PX0, PX1), PP0, 'x'); pilares_linha(espaco(PX0, PX1), PP1, 'x')
pilares_linha(espaco(PP0, PP1)[1:-1], PX0, 'p'); pilares_linha(espaco(PP0, PP1)[1:-1], PX1, 'p')
yv = Y0 + H + 0.25
box(PX0 - .15, PX1 + .15, yv - 0.3, yv, PP0 - .15, PP0 + .15, 'madeira'); box(PX0 - .15, PX1 + .15, yv - 0.3, yv, PP1 - .15, PP1 + .15, 'madeira')
box(PX0 - .15, PX0 + .15, yv - 0.3, yv, PP0, PP1, 'madeira'); box(PX1 - .15, PX1 + .15, yv - 0.3, yv, PP0, PP1, 'madeira')

# ---------------- telhado de 4 águas ----------------
ang = math.radians(INCL)
rx0, rx1, rp0, rp1 = PX0 - BEIRAL - .15, PX1 + BEIRAL + .15, PP0 - BEIRAL - .15, PP1 + BEIRAL + .15
half = (rp1 - rp0) / 2
rise = math.tan(ang) * half
ye = yv
cp = (rp0 + rp1) / 2
rl0, rl1 = rx0 + half, rx1 - half     # cumeeira
P3 = lambda x, y, p: (x, y, -p)
yr = ye + rise
quad([P3(rx0, ye, rp0), P3(rx1, ye, rp0), P3(rl1, yr, cp), P3(rl0, yr, cp)], 'telha')   # frente
quad([P3(rx1, ye, rp1), P3(rx0, ye, rp1), P3(rl0, yr, cp), P3(rl1, yr, cp)], 'telha')   # fundos
quad([P3(rx0, ye, rp1), P3(rx0, ye, rp0), P3(rl0, yr, cp)], 'telha')                     # esquerda
quad([P3(rx1, ye, rp0), P3(rx1, ye, rp1), P3(rl1, yr, cp)], 'telha')                     # direita

# ---------------- área gourmet (à esquerda, coberta) ----------------
gx0 = -V - GOURMET_W
gp0, gp1 = 0.0, SOCIAL
for gx in (gx0 + 0.3, -V - 0.3):
    for gp in (gp0 + 0.3, gp1 - 0.3):
        box(gx - .12, gx + .12, LAJE, LAJE + 2.6, gp - .12, gp + .12, 'madeira')
# telhado de uma água caindo para a esquerda
quad([P3(gx0 - .5, LAJE + 2.4, gp0 - .5), P3(-V + .3, LAJE + 3.0 + 0.0, gp0 - .5),
      P3(-V + .3, LAJE + 3.0, gp1 + .5), P3(gx0 - .5, LAJE + 2.4, gp1 + .5)], 'telha')
box(gx0 + 0.3, gx0 + 2.3, LAJE, LAJE + 0.9, gp1 - 1.2, gp1 - 0.5, 'bancada')   # churrasqueira/bancada
box(gx0 + 0.4, gx0 + 2.4, LAJE + 0.9, LAJE + 0.95, gp1 - 1.3, gp1 - 0.4, 'tampo')
box(gx0 + 2.6, gx0 + 3.6, LAJE, LAJE + 0.75, 1.0, 3.0, 'madeira')                 # mesa

# ---------------- exporta ----------------
MAT = {  # nome: (R,G,B, alpha)
    'parede': (0.85, 0.80, 0.70, 1), 'piso': (0.80, 0.76, 0.66, 1), 'grama': (0.30, 0.48, 0.18, 1),
    'madeira': (0.42, 0.18, 0.10, 1), 'telha': (0.17, 0.15, 0.14, 1), 'vidro': (0.65, 0.78, 0.85, 0.35),
    'esquadria': (0.08, 0.08, 0.08, 1), 'bancada': (0.55, 0.50, 0.45, 1), 'tampo': (0.25, 0.22, 0.20, 1),
    'forro': (0.95, 0.95, 0.92, 1),
}
with open('casa.mtl', 'w') as f:
    for n, (r, g, b, a) in MAT.items():
        f.write(f'newmtl {n}\nKd {r} {g} {b}\nKa 0 0 0\nKs 0.05 0.05 0.05\nd {a}\nillum 2\n\n')
with open('casa.obj', 'w') as f:
    f.write('mtllib casa.mtl\n')
    for v in verts: f.write('v %.4f %.4f %.4f\n' % v)
    for m, fl in faces.items():
        f.write(f'o {m}\nusemtl {m}\n')
        for fc in fl: f.write('f ' + ' '.join(map(str, fc)) + '\n')
print(f'ok: {len(verts)} vértices -> casa.obj  (casa {W}x{D:.1f} m, com varanda {W+2*V}x{D+2*V:.1f} m)')
