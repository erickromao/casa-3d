import * as THREE from 'three'

// Medidas em metros. Planta: x da esquerda para a direita, p da frente (horizonte) para os fundos.
export const M = {
  W: 14.5, SOCIAL: 4.5, CORREDOR: 1.2, QUARTOS: 3.5, H: 2.8, VF: 3.5, VS: 3.0, BEIRAL: 0.7, INCL: 20,
  EXT: 0.18, INT: 0.12, LAJE: 0.3, GD: 8.5,   // varanda dos fundos = área gourmet + serviço (completa a volta da casa)
  X_BANCADA: 8.4,
}
M.D = M.SOCIAL + M.CORREDOR + M.QUARTOS

/** planta (x,p) -> mundo: x - W/2, z = p - D/2. A ENTRADA fica no fim x=W (aponta para +x, o horizonte).
 *  Quem entra olhando para -x vê os quartos à esquerda (p grande) e sala/cozinha à direita (p pequeno). */
export const mundo = (x, p) => new THREE.Vector3(x - M.W / 2, 0, p - M.D / 2)
export const rotMovel = r => Math.PI - r   // yaw do modelo no mundo a partir do yaw "da planta"
const retMundo = (x0, x1, p0, p1) => ({ x0: x0 - M.W / 2, x1: x1 - M.W / 2, z0: p0 - M.D / 2, z1: p1 - M.D / 2 })

export function construirCasa(mat, opcoes = {}) {
  const { W, SOCIAL, CORREDOR, D, H, VF, VS, BEIRAL, EXT, INT, LAJE, GD, X_BANCADA } = M
  const incl = opcoes.incl ?? M.INCL
  const grupo = new THREE.Group()
  grupo.scale.z = -1; grupo.position.set(-W / 2, 0, -D / 2)   // local = planta (z = -p); espelhado -> mundo z = p - D/2
  const teto = new THREE.Group(); grupo.add(teto)   // tudo que é cobertura, para ligar/desligar
  let alvo = grupo
  const colisores = []                         // caixas 2D em coordenadas de mundo
  const luzes = []                             // luzes noturnas
  const Y0 = LAJE

  // ---------- primitivas ----------
  function caixa(x0, x1, y0, y1, p0, p1, m, { colide = false, sombra = true } = {}) {
    const w = x1 - x0, h = y1 - y0, d = p1 - p0
    const g = new THREE.BoxGeometry(w, h, d)
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = -(p0 + p1) / 2
    const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv, tam = m.userData.tam ?? 1
    for (let i = 0; i < pos.count; i++) {   // UV em metros do mundo: texturas contínuas entre peças
      const X = pos.getX(i) + cx, Y = pos.getY(i) + cy, Z = pos.getZ(i) + cz
      const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i))
      if (ax > 0.5) uv.setXY(i, Z / tam, Y / tam)
      else if (ay > 0.5) uv.setXY(i, X / tam, Z / tam)
      else uv.setXY(i, X / tam, Y / tam)
    }
    const mesh = new THREE.Mesh(g, m)
    mesh.position.set(cx, cy, cz)
    mesh.castShadow = sombra && m !== mat.vidro; mesh.receiveShadow = true
    alvo.add(mesh)
    if (colide) colisores.push(retMundo(x0, x1, p0, p1))
    return mesh
  }

  /** polígono plano em coordenadas de planta [x, y, p]; orientado para cima ou para baixo */
  function poligono(pts, m, cima = true) {
    const v = pts.map(([x, y, p]) => new THREE.Vector3(x, y, -p))
    const n = new THREE.Vector3().crossVectors(v[1].clone().sub(v[0]), v[2].clone().sub(v[0])).normalize()
    let ordem = v.map((_, i) => i)
    if ((n.y > 0) !== cima) { ordem.reverse(); n.negate() }
    const e1 = v[1].clone().sub(v[0]).normalize(), e2 = new THREE.Vector3().crossVectors(n, e1)
    const tam = m.userData.tam ?? 1
    const posArr = [], uvArr = []
    for (const i of ordem) {
      const d = v[i].clone().sub(v[0])
      posArr.push(v[i].x, v[i].y, v[i].z); uvArr.push(d.dot(e1) / tam, d.dot(e2) / tam)
    }
    const idx = []; for (let i = 1; i < ordem.length - 1; i++) idx.push(0, i, i + 1)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2))
    g.setIndex(idx); g.computeVertexNormals()
    const mesh = new THREE.Mesh(g, m); mesh.castShadow = mesh.receiveShadow = true
    alvo.add(mesh); return mesh
  }

  /** parede com vãos. axis 'x': ao longo de x em p=fixo; 'p': ao longo de p em x=fixo.
   *  vãos: [ini, fim, yBase, yTopo, 'vidro'|'vao'] */
  function parede(axis, fixo, a0, a1, t, vaos = [], m = mat.parede) {
    const seg = (u0, u1, y0, y1, mm = m) => {
      if (u1 - u0 < 1e-6 || y1 - y0 < 1e-6) return
      const colide = y0 === 0 && mm === m
      if (axis === 'x') caixa(u0, u1, Y0 + y0, Y0 + y1, fixo - t / 2, fixo + t / 2, mm, { colide })
      else caixa(fixo - t / 2, fixo + t / 2, Y0 + y0, Y0 + y1, u0, u1, mm, { colide })
    }
    let cur = a0
    for (const [o0, o1, yb, yt, tipo] of [...vaos].sort((a, b) => a[0] - b[0])) {
      seg(cur, o0, 0, H); seg(o0, o1, 0, yb); seg(o0, o1, yt, H)
      if (tipo === 'vidro') {
        const f = 0.05
        if (axis === 'x') caixa(o0, o1, Y0 + yb, Y0 + yt, fixo - 0.01, fixo + 0.01, mat.vidro)
        else caixa(fixo - 0.01, fixo + 0.01, Y0 + yb, Y0 + yt, o0, o1, mat.vidro)
        seg(o0, o0 + f, yb, yt, mat.esquadria); seg(o1 - f, o1, yb, yt, mat.esquadria)
        seg(o0, o1, yt - f, yt, mat.esquadria); seg(o0, o1, yb, yb + f, mat.esquadria)
        if (o1 - o0 > 2) seg((o0 + o1) / 2 - f / 2, (o0 + o1) / 2 + f / 2, yb, yt, mat.esquadria)
      }
      cur = o1
    }
    seg(cur, a1, 0, H)
  }

  // ---------- laje: varanda na frente (entrada), lado da sala/cozinha e fundos (gourmet/serviço); NÃO há varanda ao lado dos quartos ----------
  const lx0 = -GD, lx1 = W + VF, lp0 = -VS, lp1 = D
  caixa(lx0, lx1, 0, LAJE, lp0, lp1, mat.piso)

  // ---------- paredes externas ----------
  parede('p', 0, 0, SOCIAL, EXT, [[1.4, 2.4, 0, 2.2, 'vao']])               // cozinha -> área gourmet
  parede('p', 0, SOCIAL, D, EXT, [[SOCIAL + CORREDOR + 1.4, SOCIAL + CORREDOR + 2.4, 1.0, 2.1, 'vidro']])
  parede('p', W, 0, D, EXT, [[1.3, 2.7, 0, 2.2, 'vidro'], [SOCIAL + CORREDOR + 1, SOCIAL + CORREDOR + 2.2, 1.0, 2.1, 'vidro']])   // entrada pela sala
  parede('x', 0, 0, W, EXT, [[1.2, 3.4, 1.0, 2.1, 'vidro'], [6.2, 7.5, 0, 2.2, 'vidro'], [9.2, 11.6, 0, 2.2, 'vidro'], [12.6, 13.7, 1.0, 2.1, 'vidro']])
  parede('x', D, 0, W, EXT, [[1.2, 3.2, 1.0, 2.1, 'vidro'], [4.8, 5.6, 1.6, 2.1, 'vidro'], [7.0, 8.4, 1.0, 2.1, 'vidro'],
    [9.9, 10.7, 1.6, 2.1, 'vidro'], [12.3, 13.6, 1.0, 2.1, 'vidro']])         // lado dos quartos: só janelas

  // ---------- paredes internas ----------
  // ao entrar (x=W), à esquerda os quartos: suíte (+banheiro dela) | quarto | banheiro | quarto ; à direita: sala | bancada | cozinha
  const P2 = SOCIAL + CORREDOR
  parede('x', P2, 0, W, INT, [[1.65, 2.55, 0, 2.1, 'vao'], [4.75, 5.65, 0, 2.1, 'vao'], [7.25, 8.15, 0, 2.1, 'vao'], [12.2, 13.1, 0, 2.1, 'vao']])
  for (const x of [4.2, 6.2, 9.2]) parede('p', x, P2, D, INT)
  parede('p', 11.4, P2, D, INT, [[P2 + 0.7, P2 + 1.6, 0, 2.1, 'vao']])    // banheiro da suíte, porta para o quarto
  const branco = mat.branco
  const banheiro = (x0, x1) => {   // vaso, pia e box
    caixa(x0 + 0.3, x0 + 0.85, Y0, Y0 + 0.4, D - 0.7, D - 0.15, branco, { colide: true }); caixa(x0 + 0.35, x0 + 0.8, Y0 + 0.4, Y0 + 0.9, D - 0.3, D - 0.15, branco)
    caixa(x1 - 0.55, x1 - 0.05, Y0 + 0.82, Y0 + 0.9, P2 + 0.3, P2 + 1.3, branco); caixa(x1 - 0.5, x1 - 0.1, Y0, Y0 + 0.82, P2 + 0.4, P2 + 1.2, mat.parede, { colide: true })
    caixa(x0 + 0.15, x1 - 0.15, Y0, Y0 + 0.05, D - 1.25, D - 0.2, branco)
  }
  banheiro(9.2, 11.4); banheiro(4.2, 6.2)
  // bancada entre sala e cozinha: encostada na parede, deixa a passagem livre
  caixa(X_BANCADA - 0.12, X_BANCADA + 0.12, Y0, Y0 + 1.0, 0, 3.0, mat.parede, { colide: true })
  caixa(X_BANCADA - 0.2, X_BANCADA + 0.2, Y0 + 1.0, Y0 + 1.05, 0, 3.1, mat.tampo, { colide: true })

  // ---------- pilares e vigas de madeira ----------
  const PIL = 0.25, PXB = lx0 + 0.25, PXF = lx1 - 0.25, PP0 = lp0 + 0.25
  const espaco = (a, b, passo = 2.6) => { const n = Math.max(1, Math.round((b - a) / passo)); return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n) }
  const yv = Y0 + H + 0.25
  const pilar = (x, p) => caixa(x - PIL / 2, x + PIL / 2, LAJE, yv, p - PIL / 2, p + PIL / 2, mat.madeira, { colide: true })
  const xs = espaco(PXB, PXF), ps = espaco(PP0, D - 0.25)
  xs.forEach(x => pilar(x, PP0))
  ps.slice(1).forEach(p => { pilar(PXB, p); pilar(PXF, p) })
  const vg = 0.15
  caixa(PXB - vg, PXF + vg, yv - 0.3, yv, PP0 - vg, PP0 + vg, mat.madeira)
  caixa(PXB - vg, PXB + vg, yv - 0.3, yv, PP0, D, mat.madeira); caixa(PXF - vg, PXF + vg, yv - 0.3, yv, PP0, D, mat.madeira)

  // luminárias penduradas
  xs.forEach((x, i) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), mat.lampada)
    b.position.set(x, Y0 + H - 0.35, -(PP0 + 0.35)); grupo.add(b)
    if (i % 2 === 0) { const l = new THREE.PointLight(0xffb060, 0, 9, 1.7); l.position.copy(b.position); grupo.add(l); luzes.push(l) }
  })
  for (const [x, p] of [[11, 2.3], [3, 2.3], [2, 7.5], [7.7, 7.5], [12.9, 7.2], [10.3, 7.5], [6.5, 5.1]]) {
    const l = new THREE.PointLight(0xffd29a, 0, 8, 1.6); l.position.set(x, Y0 + H - 0.3, -p); grupo.add(l); luzes.push(l)
  }

  // ---------- cobertura (tudo em `teto`, para ligar/desligar) ----------
  alvo = teto
  caixa(0, W, Y0 + H, Y0 + H + 0.1, 0, D, mat.parede)   // forro interno
  const ang = THREE.MathUtils.degToRad(incl)
  const rx0 = PXB - BEIRAL - 0.15, rx1 = PXF + BEIRAL + 0.15, rp0 = PP0 - BEIRAL - 0.15, rp1 = D + 0.5
  const meio = (rp1 - rp0) / 2, subida = Math.tan(ang) * meio, cp = (rp0 + rp1) / 2
  const rl0 = rx0 + meio, rl1 = rx1 - meio, yr = yv + subida
  const aguas = [
    [[rx0, yv, rp0], [rx1, yv, rp0], [rl1, yr, cp], [rl0, yr, cp]],
    [[rx1, yv, rp1], [rx0, yv, rp1], [rl0, yr, cp], [rl1, yr, cp]],
    [[rx0, yv, rp1], [rx0, yv, rp0], [rl0, yr, cp]],
    [[rx1, yv, rp0], [rx1, yv, rp1], [rl1, yr, cp]],
  ]
  for (const a of aguas) {
    poligono(a, mat.telhado, true)
    poligono(a.map(([x, y, p]) => [x, y - 0.12, p]), mat.forro, false)
  }
  const fb = 0.14
  caixa(rx0, rx1, yv - 0.14, yv + 0.1, rp0 - 0.03, rp0 + fb, mat.madeira); caixa(rx0, rx1, yv - 0.14, yv + 0.1, rp1 - fb, rp1 + 0.03, mat.madeira)
  caixa(rx0 - 0.03, rx0 + fb, yv - 0.14, yv + 0.1, rp0, rp1, mat.madeira); caixa(rx1 - fb, rx1 + 0.03, yv - 0.14, yv + 0.1, rp0, rp1, mat.madeira)

  alvo = grupo
  // ---------- fundos (x<0): mini cozinha | muro baixo | área de serviço | lavabo, tudo ao longo da parede nova (p=D) ----------
  const WP = D - EXT                                  // face interna da parede dos fundos
  caixa(-GD, 0, Y0, Y0 + H + 0.3, WP, D, mat.parede, { colide: true })
  const bancadaBase = (x0, x1) => { caixa(x0, x1, Y0, Y0 + 0.88, WP - 0.62, WP, mat.parede, { colide: true }); caixa(x0 - 0.02, x1 + 0.02, Y0 + 0.88, Y0 + 0.92, WP - 0.66, WP, mat.tampo) }
  const k0 = -GD + 0.4                                // início da mini cozinha
  // pia
  bancadaBase(k0, k0 + 1.4)
  caixa(k0 + 0.3, k0 + 1.0, Y0 + 0.915, Y0 + 0.93, WP - 0.5, WP - 0.15, mat.esquadria)             // cuba
  const tor = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.28, 8), mat.esquadria); tor.position.set(k0 + 0.65, Y0 + 1.06, -(WP - 0.1)); alvo.add(tor)
  // cooktop
  const c0 = k0 + 1.4
  bancadaBase(c0, c0 + 1.0)
  for (const [dx, dp] of [[0.25, 0.2], [0.75, 0.2], [0.25, 0.45], [0.75, 0.45]]) {
    const bq = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 20), mat.esquadria); bq.position.set(c0 + dx, Y0 + 0.935, -(WP - 0.66 + dp)); alvo.add(bq)
  }
  caixa(c0 + 0.1, c0 + 0.9, Y0 + 2.0, Y0 + 2.12, WP - 0.5, WP, mat.esquadria)                    // coifa
  // churrasqueira de alvenaria com chaminé
  const g0 = c0 + 1.0
  caixa(g0, g0 + 1.5, Y0, Y0 + 0.95, WP - 0.7, WP, mat.pedra, { colide: true })
  caixa(g0 + 0.2, g0 + 1.3, Y0 + 0.5, Y0 + 0.85, WP - 0.7 - 0.01, WP - 0.15, mat.esquadria)    // boca da churrasqueira
  caixa(g0 + 0.2, g0 + 1.3, Y0 + 0.62, Y0 + 0.64, WP - 0.69, WP - 0.15, mat.tampo)             // grelha
  caixa(g0 + 0.3, g0 + 1.2, Y0 + 0.95, Y0 + H + 0.3, WP - 0.5, WP, mat.pedra)                  // chaminé
  // muro baixo (bancada) separando a mini cozinha da área de serviço
  const MX = g0 + 1.75
  caixa(MX - 0.12, MX + 0.12, Y0, Y0 + 1.0, D - 2.7, WP, mat.pedra, { colide: true })
  caixa(MX - 0.2, MX + 0.2, Y0 + 1.0, Y0 + 1.05, D - 2.75, WP, mat.tampo)
  // área de serviço (à direita do muro): máquina de lavar e tanque encostados na parede dos fundos
  const maq = (x) => {
    caixa(x - 0.3, x + 0.3, Y0, Y0 + 0.85, WP - 0.65, WP, branco, { colide: true })
    const porta = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 20), mat.esquadria)
    porta.rotation.x = Math.PI / 2; porta.position.set(x, Y0 + 0.42, -(WP - 0.66)); alvo.add(porta)
    caixa(x - 0.27, x + 0.27, Y0 + 0.85, Y0 + 0.88, WP - 0.62, WP - 0.03, mat.esquadria)
  }
  maq(MX + 0.8)
  const tx = MX + 1.6
  caixa(tx - 0.3, tx + 0.3, Y0, Y0 + 0.78, WP - 0.55, WP, mat.parede, { colide: true })
  caixa(tx - 0.33, tx + 0.33, Y0 + 0.78, Y0 + 0.86, WP - 0.6, WP, branco)
  caixa(tx - 0.27, tx + 0.27, Y0 + 0.86, Y0 + 0.88, WP - 0.52, WP - 0.04, mat.esquadria)
  const torneira = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 8), mat.esquadria)
  torneira.position.set(tx, Y0 + 1.1, -(WP - 0.1)); alvo.add(torneira)
  // lavabo pequeno no final da área de serviço (canto junto à casa), sem chuveiro
  const LX = -1.6, LP = D - 1.7, LH = Y0 + H + 0.3
  caixa(LX - INT / 2, LX + INT / 2, Y0, LH, LP, WP, mat.parede, { colide: true })
  caixa(LX, -1.15, Y0, LH, LP - INT / 2, LP + INT / 2, mat.parede, { colide: true })           // frente do lavabo, porta em x -1.15..-0.35
  caixa(-0.35, 0, Y0, LH, LP - INT / 2, LP + INT / 2, mat.parede, { colide: true })
  caixa(-1.15, -0.35, Y0 + 2.2, LH, LP - INT / 2, LP + INT / 2, mat.parede)
  caixa(-1.4, -0.9, Y0, Y0 + 0.4, WP - 0.62, WP - 0.1, branco, { colide: true }); caixa(-1.37, -0.93, Y0 + 0.4, Y0 + 0.9, WP - 0.25, WP - 0.08, branco)   // vaso
  caixa(-0.5, -0.05, Y0 + 0.82, Y0 + 0.9, LP + 0.3, LP + 0.9, branco); caixa(-0.45, -0.1, Y0, Y0 + 0.82, LP + 0.4, LP + 0.8, mat.parede, { colide: true })   // pia

  // ---------- rede na varanda lateral (lado da sala), entre dois pilares ----------
  const hx0 = xs[3] + 0.1, hx1 = xs[4] - 0.1, hp = PP0 + 0.35
  const rg = new THREE.PlaneGeometry(hx1 - hx0, 0.9, 20, 4)
  const rpos = rg.attributes.position
  for (let i = 0; i < rpos.count; i++) {
    const u = rpos.getX(i) / ((hx1 - hx0) / 2), w = rpos.getY(i) / 0.45
    rpos.setY(i, -0.8 * (1 - u * u) + 0.1 * Math.abs(w) * (1 - u * u)); rpos.setZ(i, w * 0.45 * (1 - 0.25 * (1 - u * u)))
  }
  rg.computeVertexNormals()
  const rede = new THREE.Mesh(rg, mat.rede)
  rede.position.set((hx0 + hx1) / 2, LAJE + 1.95, -hp); rede.castShadow = true; grupo.add(rede)

  // caminho de pedras saindo da entrada (frente, +x)
  for (let i = 0; i < 8; i++) caixa(W + VF + 0.3 + i * 1.0, W + VF + 1.1 + i * 1.0, 0, 0.04, 1.5 + Math.sin(i * 1.3) * 0.15, 2.5 + Math.sin(i * 1.3) * 0.15, mat.pedra)

  const lajes = [retMundo(lx0, lx1, lp0, lp1)]
  const livre = (x, z) => {
    for (const r of lajes) if (x > r.x0 - 0.3 && x < r.x1 + 0.3 && z > r.z0 - 0.3 && z < r.z1 + 0.3) return false
    const c = mundo(W + VF, 2)   // caminho de pedras
    if (x > c.x - 0.3 && Math.abs(z - c.z) < 0.9) return false
    return true
  }
  const t = lajes.reduce((a, r) => ({ x0: Math.min(a.x0, r.x0), x1: Math.max(a.x1, r.x1), z0: Math.min(a.z0, r.z0), z1: Math.max(a.z1, r.z1) }))
  return { grupo, teto, colisores, luzes, lajes, livre, caixaTotal: t, frente: new THREE.Vector2(1, 0) }
}
