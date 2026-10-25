import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import GUI from 'lil-gui'

// ---------- parâmetros editáveis (medidas em metros) ----------
const P = {
  largura: 14,        // eixo X total
  profundidade: 9,    // eixo Z total (inclui varanda)
  varanda: 3,         // profundidade da varanda frontal
  peDireito: 2.8,
  pilares: 6,
  inclinacao: 20,     // graus
  beiral: 0.8,
  quartos: 2,         // divisórias internas
  janelas: 2,
  corParede: '#d9cdb8',
  corMadeira: '#6b2f1a',
  corTelha: '#2b2623',
  corPiso: '#d8cdb5',
  hora: 17.5,
  fotoFundo: true,
  rede: true,
}

// ---------- cena ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 600)
camera.position.set(14, 5, 18)

const orbit = new OrbitControls(camera, renderer.domElement)
orbit.target.set(0, 1.5, 0)
orbit.maxPolarAngle = Math.PI / 2 - 0.02
const walk = new PointerLockControls(camera, renderer.domElement)

const hemi = new THREE.HemisphereLight(0xbcd4ff, 0x4a5a2a, 0.6)
const sun = new THREE.DirectionalLight(0xffe2b0, 2.5)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 120 })
scene.add(hemi, sun)

// ---------- terreno ----------
function grassTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512
  const g = c.getContext('2d')
  g.fillStyle = '#4c7a2e'; g.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `hsl(${85 + Math.random() * 35},${40 + Math.random() * 25}%,${22 + Math.random() * 22}%)`
    g.fillRect(Math.random() * 512, Math.random() * 512, 2, 5)
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(40, 40); t.colorSpace = THREE.SRGBColorSpace
  return t
}
const terrainGeo = new THREE.PlaneGeometry(300, 300, 150, 150).rotateX(-Math.PI / 2)
{
  const pos = terrainGeo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i)
    const d = Math.max(0, Math.hypot(x, z) - 22)         // plataforma plana sob a casa
    const h = d * 0.06 + Math.sin(x * 0.05) * Math.cos(z * 0.04) * 1.2 * Math.min(1, d / 15)
    pos.setY(i, h)
  }
  terrainGeo.computeVertexNormals()
}
const terrain = new THREE.Mesh(terrainGeo, new THREE.MeshStandardMaterial({ map: grassTexture(), roughness: 1 }))
terrain.receiveShadow = true
scene.add(terrain)

// foto do terreno como pano de fundo (horizonte da foto ~65% da altura)
const backdropMat = new THREE.MeshBasicMaterial({ fog: false, side: THREE.DoubleSide })
new THREE.TextureLoader().load('/terreno.png', t => { t.colorSpace = THREE.SRGBColorSpace; backdropMat.map = t; backdropMat.needsUpdate = true })
const BH = 220, BW = BH * 1170 / 1229
const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(BW * 1.6, BH), backdropMat)
backdrop.position.set(0, BH * 0.15, -140)
scene.add(backdrop)

// ---------- casa ----------
const house = new THREE.Group(); scene.add(house)
const furniture = new THREE.Group(); scene.add(furniture)
const lamps = []

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o })
function box(w, h, d, m, x, y, z, parent) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
  b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; parent.add(b); return b
}
function clear(g) {
  g.traverse(o => { o.geometry?.dispose?.() })
  g.clear()
}

function build() {
  clear(house); lamps.length = 0
  const { largura: W, profundidade: D, varanda: V, peDireito: H, beiral, corParede, corMadeira, corTelha, corPiso } = P
  const t = 0.2
  const mWall = mat(corParede), mWood = mat(corMadeira, { roughness: 0.6 }), mRoof = mat(corTelha, { roughness: 0.7 })
  const mFloor = mat(corPiso, { roughness: 0.35 }), mGlass = mat('#a8c8d8', { transparent: true, opacity: 0.35, roughness: 0.1 })
  const mFrame = mat('#1a1a1a')

  const zFront = D / 2, zWallFront = D / 2 - V, zBack = -D / 2
  // laje / piso
  box(W + 0.6, 0.3, D + 0.6, mFloor, 0, 0.15, 0, house)
  const y0 = 0.3

  // paredes externas do bloco fechado
  const blockD = D - V
  const zc = (zBack + zWallFront) / 2
  box(W, H, t, mWall, 0, y0 + H / 2, zBack + t / 2, house)                 // fundos
  box(t, H, blockD, mWall, -W / 2 + t / 2, y0 + H / 2, zc, house)          // esquerda
  box(t, H, blockD, mWall, W / 2 - t / 2, y0 + H / 2, zc, house)           // direita

  // parede da frente com porta de vidro + janelas
  const openings = [{ c: -W / 2 + W * 0.28, w: 1.8, y: 0, h: 2.2, kind: 'door' }]
  for (let i = 0; i < P.janelas; i++) {
    openings.push({ c: -W / 2 + W * (0.52 + 0.4 * (i + 0.5) / Math.max(P.janelas, 1)), w: 1.4, y: 1.0, h: 1.1, kind: 'win' })
  }
  openings.sort((a, b) => a.c - b.c)
  let cur = -W / 2
  const zf = zWallFront - t / 2
  for (const o of openings) {
    const a = o.c - o.w / 2, b = o.c + o.w / 2
    if (a > cur) box(a - cur, H, t, mWall, (cur + a) / 2, y0 + H / 2, zf, house)
    if (o.y > 0) box(o.w, o.y, t, mWall, o.c, y0 + o.y / 2, zf, house)
    if (o.y + o.h < H) box(o.w, H - o.y - o.h, t, mWall, o.c, y0 + o.y + o.h + (H - o.y - o.h) / 2, zf, house)
    box(o.w, o.h, 0.04, mGlass, o.c, y0 + o.y + o.h / 2, zf, house)
    // moldura
    box(o.w + 0.1, 0.06, 0.1, mFrame, o.c, y0 + o.y + o.h, zf, house)
    box(0.06, o.h, 0.1, mFrame, a, y0 + o.y + o.h / 2, zf, house)
    box(0.06, o.h, 0.1, mFrame, b, y0 + o.y + o.h / 2, zf, house)
    cur = b
  }
  if (cur < W / 2) box(W / 2 - cur, H, t, mWall, (cur + W / 2) / 2, y0 + H / 2, zf, house)

  // divisórias internas (quartos)
  for (let i = 1; i <= P.quartos; i++) {
    const x = -W / 2 + (W * i) / (P.quartos + 1)
    box(0.12, H, blockD * 0.6, mWall, x, y0 + H / 2, zBack + blockD * 0.3, house)
  }

  // pilares de madeira na borda da varanda
  for (let i = 0; i < P.pilares; i++) {
    const x = P.pilares === 1 ? 0 : -W / 2 + 0.3 + (W - 0.6) * i / (P.pilares - 1)
    box(0.28, H + 0.1, 0.28, mWood, x, y0 + (H + 0.1) / 2, zFront - 0.2, house)
    const lamp = new THREE.PointLight(0xffb45a, 0, 9, 1.6)
    lamp.position.set(x, y0 + H - 0.4, zFront - 0.7)
    if (i % 2 === 0) { house.add(lamp); lamps.push(lamp) }
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }))
    bulb.position.copy(new THREE.Vector3(x, y0 + H - 0.4, zFront - 0.45)); if (i % 2 === 0) house.add(bulb)
  }
  // viga frontal
  box(W + 0.2, 0.25, 0.3, mWood, 0, y0 + H + 0.1, zFront - 0.2, house)

  // telhado de duas águas (cumeeira ao longo de X)
  const ang = THREE.MathUtils.degToRad(P.inclinacao)
  const halfD = D / 2 + beiral
  const slope = halfD / Math.cos(ang), rise = Math.tan(ang) * halfD
  const roofL = W + beiral * 2
  const yEave = y0 + H + 0.25
  for (const s of [-1, 1]) {
    const r = box(roofL, 0.14, slope, mRoof, 0, yEave + rise / 2 + 0.07, s * halfD / 2, house)
    r.rotation.x = s * ang
  }
  // oitões (triângulo) nas empenas
  const tri = new THREE.Shape([new THREE.Vector2(-D / 2, 0), new THREE.Vector2(D / 2, 0), new THREE.Vector2(0, Math.tan(ang) * D / 2)])
  for (const s of [-1, 1]) {
    const g = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.1, bevelEnabled: false }), mWall)
    g.rotation.y = Math.PI / 2; g.position.set(s * (W / 2 - 0.05) + (s > 0 ? 0.1 : 0), yEave, 0); g.castShadow = true
    house.add(g)
  }

  // rede na varanda
  if (P.rede) {
    const rede = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.8, 16, 1, true, 0, Math.PI), mat('#f3ecd8', { side: THREE.DoubleSide }))
    rede.rotation.z = Math.PI / 2; rede.rotation.x = Math.PI
    rede.position.set(-W / 2 + 2.2, y0 + 1.2, zFront - V / 2 - 0.2); rede.rotation.set(0, Math.PI / 2, 0)
    rede.scale.set(1, 1, 1); house.add(rede)
  }
  // caminho de pedras
  const mStone = mat('#9a9a90')
  for (let i = 0; i < 8; i++) box(1, 0.05, 0.7, mStone, -W / 2 + W * 0.28 + Math.sin(i) * 0.2, 0.03, zFront + 1.5 + i * 1.0, house)
  terrain.position.y = 0
  updateSky()
}

// ---------- hora do dia ----------
const skyDay = new THREE.Color('#87b5e8'), skySunset = new THREE.Color('#e8a56a'), skyNight = new THREE.Color('#0b1430')
function updateSky() {
  const h = P.hora
  const a = ((h - 6) / 12) * Math.PI            // 6h nasce, 18h se põe
  const el = Math.sin(a)
  sun.position.set(Math.cos(a) * 60, Math.max(el, -0.1) * 60 + 2, -20)
  const day = THREE.MathUtils.clamp(el * 2.5, 0, 1)
  sun.intensity = 2.6 * day
  hemi.intensity = 0.12 + 0.6 * day
  const warm = 1 - Math.min(1, Math.abs(el) * 3)
  const sky = skyNight.clone().lerp(skyDay, day).lerp(skySunset, warm * 0.8 * (el > -0.15 ? 1 : 0))
  scene.background = sky
  scene.fog = new THREE.Fog(sky, 80, 260)
  backdropMat.color.setScalar(0.18 + 0.82 * day).lerp(new THREE.Color(1, 0.85, 0.7), warm * 0.25)
  backdrop.visible = P.fotoFundo
  const night = 1 - day
  lamps.forEach(l => (l.intensity = night * 18))
  renderer.toneMappingExposure = 1
}

// ---------- móveis ----------
const CATALOGO = {
  cama:  { s: [1.6, 0.5, 2.0], c: '#b5a28a' },
  sofá:  { s: [2.0, 0.8, 0.9], c: '#7a5c48' },
  mesa:  { s: [1.6, 0.75, 0.9], c: '#8b5a2b' },
  cadeira: { s: [0.5, 0.9, 0.5], c: '#222222' },
  armário: { s: [1.2, 2.0, 0.5], c: '#6b4a2f' },
  fogão: { s: [0.6, 0.9, 0.6], c: '#cfcfcf' },
}
function addMovel(nome, x = 0, z = 0) {
  const d = CATALOGO[nome]
  const m = new THREE.Mesh(new THREE.BoxGeometry(...d.s), mat(d.c))
  m.position.set(x, 0.3 + d.s[1] / 2, z); m.castShadow = m.receiveShadow = true
  m.userData.nome = nome; furniture.add(m); selecionar(m)
}
let sel = null
function selecionar(m) {
  if (sel) sel.material.emissive?.set(0x000000)
  sel = m; if (sel) sel.material.emissive?.set(0x333300)
}
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.3)
let drag = false
const setNdc = e => ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
renderer.domElement.addEventListener('pointerdown', e => {
  if (walk.isLocked) return
  setNdc(e); ray.setFromCamera(ndc, camera)
  const hit = ray.intersectObjects(furniture.children)[0]
  if (hit) { selecionar(hit.object); drag = true; orbit.enabled = false } else selecionar(null)
})
addEventListener('pointermove', e => {
  if (!drag || !sel) return
  setNdc(e); ray.setFromCamera(ndc, camera)
  const p = new THREE.Vector3(); if (ray.ray.intersectPlane(plane, p)) { sel.position.x = p.x; sel.position.z = p.z }
})
addEventListener('pointerup', () => { drag = false; orbit.enabled = !walk.isLocked })
addEventListener('keydown', e => {
  keys[e.code] = true
  if (!sel) return
  if (e.code === 'KeyR') sel.rotation.y += Math.PI / 4
  if (e.code === 'Delete') { furniture.remove(sel); sel = null }
})
addEventListener('keyup', e => (keys[e.code] = false))
const keys = {}

// ---------- UI ----------
const gui = new GUI({ title: 'Casa' })
const rebuild = () => build()
const f1 = gui.addFolder('Dimensões')
f1.add(P, 'largura', 8, 24, 0.5).onChange(rebuild)
f1.add(P, 'profundidade', 6, 16, 0.5).onChange(rebuild)
f1.add(P, 'varanda', 1.5, 6, 0.5).onChange(rebuild)
f1.add(P, 'peDireito', 2.4, 4, 0.1).onChange(rebuild)
const f2 = gui.addFolder('Estrutura')
f2.add(P, 'pilares', 2, 12, 1).onChange(rebuild)
f2.add(P, 'inclinacao', 8, 40, 1).onChange(rebuild)
f2.add(P, 'beiral', 0, 2, 0.1).onChange(rebuild)
f2.add(P, 'quartos', 0, 5, 1).onChange(rebuild)
f2.add(P, 'janelas', 0, 4, 1).onChange(rebuild)
f2.add(P, 'rede').onChange(rebuild)
const f3 = gui.addFolder('Cores')
for (const k of ['corParede', 'corMadeira', 'corTelha', 'corPiso']) f3.addColor(P, k).onChange(rebuild)
const f4 = gui.addFolder('Ambiente')
f4.add(P, 'hora', 0, 24, 0.25).onChange(updateSky)
f4.add(P, 'fotoFundo').name('foto do terreno').onChange(updateSky)

const bar = document.getElementById('bar')
function btn(txt, fn) { const b = document.createElement('button'); b.textContent = txt; b.onclick = fn; bar.appendChild(b) }
btn('Caminhar', () => { camera.position.set(0, 1.7, P.profundidade / 2 + 4); camera.lookAt(0, 1.7, 0); walk.lock() })
btn('Vista aérea', () => { camera.position.set(0, 25, 18); orbit.target.set(0, 0, 0); orbit.update() })
btn('Vista da frente', () => { camera.position.set(0, 2.2, P.profundidade / 2 + 14); orbit.target.set(0, 1.8, 0); orbit.update() })
for (const n of Object.keys(CATALOGO)) btn('+ ' + n, () => addMovel(n, 0, 0))
btn('Foto (PNG)', () => {
  renderer.render(scene, camera)
  const a = document.createElement('a'); a.href = renderer.domElement.toDataURL('image/png'); a.download = 'casa.png'; a.click()
})
btn('Exportar GLB', () => {
  const g = new THREE.Group(); g.add(house.clone(), furniture.clone())
  new GLTFExporter().parse(g, buf => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf])); a.download = 'casa.glb'; a.click()
  }, console.error, { binary: true })
})
walk.addEventListener('lock', () => (orbit.enabled = false))
walk.addEventListener('unlock', () => (orbit.enabled = true))

// ---------- loop ----------
const clock = new THREE.Clock()
function loop() {
  const dt = clock.getDelta()
  if (walk.isLocked) {
    const v = (keys.ShiftLeft ? 6 : 3) * dt
    if (keys.KeyW) walk.moveForward(v)
    if (keys.KeyS) walk.moveForward(-v)
    if (keys.KeyD) walk.moveRight(v)
    if (keys.KeyA) walk.moveRight(-v)
    camera.position.y = 1.7
  } else orbit.update()
  renderer.render(scene, camera)
  requestAnimationFrame(loop)
}
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight) })
build(); loop()
