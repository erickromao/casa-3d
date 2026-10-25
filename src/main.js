import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import GUI from 'lil-gui'
import { criarPessoas } from './pessoas.js'
import { criarMateriais } from './materiais.js'
import { construirCasa, mundo, rotMovel, M } from './casa.js'
import { criarToque, ehMobile } from './toque.js'
import { criarTerreno, criarGrama, alturaTerreno, definirZona } from './terreno.js'

// ---------- renderer / cena ----------
// mostra erros na tela (útil no celular, onde não há console)
const logErro = m => {
  let el = document.getElementById('erros')
  if (!el) { el = document.createElement('pre'); el.id = 'erros'; el.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;max-height:40%;overflow:auto;margin:0;padding:8px;background:#400c;color:#fff;font:11px monospace;z-index:9;white-space:pre-wrap'; document.body.appendChild(el) }
  el.textContent += m + '\n'
}
const ce = console.error; console.error = (...a) => { ce(...a); logErro('console: ' + a.join(' ').slice(0, 400)) }
addEventListener('error', e => logErro('ERRO: ' + e.message))
addEventListener('unhandledrejection', e => logErro('ERRO: ' + (e.reason?.message || e.reason)))
// perfil leve no celular (sombras menores, menos grama, sem antialias nativo)
const PERF = ehMobile ? { sombra: 2048, pr: 1.5, grama: 20000, aa: false } : { sombra: 4096, pr: 1.75, grama: 90000, aa: true }
const renderer = new THREE.WebGLRenderer({ antialias: PERF.aa, powerPreference: 'high-performance', preserveDrawingBuffer: !ehMobile })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, PERF.pr))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.05, 1500)
camera.rotation.order = 'YXZ'

const gl = renderer.getContext()
console.log('GPU', gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS), 'units;', gl.getParameter(gl.MAX_TEXTURE_SIZE), 'px')
renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); logErro('WebGL perdeu o contexto (memória da GPU)') })
const mat = criarMateriais()
const maxAniso = renderer.capabilities.getMaxAnisotropy()
for (const m of Object.values(mat)) for (const k of ['map', 'normalMap', 'roughnessMap', 'aoMap']) if (m[k]) m[k].anisotropy = maxAniso

const sol = new THREE.DirectionalLight(0xfff1d8, 3)
sol.castShadow = true
sol.shadow.mapSize.set(PERF.sombra, PERF.sombra)
Object.assign(sol.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 200 })
sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.03
scene.add(sol, sol.target)
const lua = new THREE.DirectionalLight(0x6f8cff, 0)
scene.add(lua)

// ---------- mundo ----------
const casa = construirCasa(mat); scene.add(casa.grupo)
definirZona(casa.caixaTotal)
const terreno = criarTerreno(mat.chao); scene.add(terreno)
const grama = criarGrama(casa.livre, PERF.grama, ehMobile ? 40 : 55); scene.add(grama)
const colisores = [...casa.colisores]

// ---------- móveis e objetos (Poly Haven, CC0) ----------
const gltf = new GLTFLoader()
async function colocar(id, x, p, rotY = 0, { escala = 1, colide = true, y = M.LAJE } = {}) {
  const g = await gltf.loadAsync(`${import.meta.env.BASE_URL}assets/models/${id}/${id}.gltf`)
  const o = g.scene; o.scale.setScalar(escala)
  const pos = mundo(x, p); o.position.set(pos.x, y, pos.z); o.rotation.y = rotMovel(rotY)
  o.traverse(c => { if (c.isMesh) { c.castShadow = c.receiveShadow = true; c.material.envMapIntensity = 0.9 } })
  scene.add(o)
  if (colide) {
    o.updateMatrixWorld(true)
    const b = new THREE.Box3().setFromObject(o)
    if (b.max.y - b.min.y > 0.3) colisores.push({ x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z })
  }
  return o
}
const L = Math.PI / 2
const D = M.D
const MOVEIS = [
  // sala (perto da entrada) e cozinha (fundo), lado direito de quem entra
  ['sofa_02', 10.8, 4.0, 0], ['coffee_table_round_01', 10.8, 2.6, 0], ['mid_century_lounge_chair', 8.0, 3.4, L],
  ['electric_stove', 1.6, 4.2, 0], ['drawer_cabinet', 5.2, 4.2, 0],
  ['dining_table', 3.6, 2.2, 0], ['dining_chair_02', 3.6, 1.35, Math.PI], ['dining_chair_02', 3.6, 3.05, 0],
  ['dining_chair_02', 2.75, 2.2, L], ['dining_chair_02', 4.45, 2.2, -L],
  // quartos, lado esquerdo de quem entra: suíte (1º), quarto, banheiro, quarto
  ['vintage_day_bed', 12.95, 8.2, 0], ['drawer_cabinet', 14.2, 6.4, -L], ['vintage_day_bed', 7.7, 8.2, 0], ['vintage_day_bed', 2.1, 8.2, 0],
  // varanda (frente e lado da sala)
  ['painted_wooden_bench', 3.0, -2.6, 0], ['mid_century_lounge_chair', 10.5, -2.4, Math.PI], ['mid_century_lounge_chair', 12.2, -2.4, Math.PI],
  ['potted_plant_02', 0.5, -0.6, 0], ['potted_plant_02', 14.0, -0.6, 0], ['planter_box_01', 7.0, -3.0, 0],
  ['outdoor_table_chair_set_01', 16.3, 6.0, 0],
  // área gourmet (fundos, junto da cozinha)
  ['wooden_picnic_table', -4.5, 2.0, 0], ['outdoor_table_chair_set_01', -7.5, 4.0, 0],
]
MOVEIS.forEach(([id, x, p, r]) => colocar(id, x, p, r).catch(e => console.warn('modelo falhou', id, e.message)))

const pessoas = criarPessoas(scene)

// árvores simples ao redor do lote
const tronco = new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 1 })
const folha = new THREE.MeshStandardMaterial({ color: 0x2f5a25, roughness: 0.95, flatShading: true })
function arvore(x, z, s = 1) {
  const a = new THREE.Group(), y = alturaTerreno(x, z)
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * s, 0.3 * s, 3.2 * s, 7), tronco); t.position.y = 1.6 * s
  a.add(t)
  for (let i = 0; i < 5; i++) {
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry((1.6 + Math.random() * 0.8) * s, 1), folha)
    c.position.set((Math.random() - 0.5) * 2 * s, (3.6 + Math.random() * 1.8) * s, (Math.random() - 0.5) * 2 * s)
    c.castShadow = true; a.add(c)
  }
  t.castShadow = true; a.position.set(x, y, z); scene.add(a)
  colisores.push({ x0: x - 0.4, x1: x + 0.4, z0: z - 0.4, z1: z + 0.4 })
}
;[[-20, 14, 1.3], [24, 10, 1.1], [-26, -16, 1.5], [22, -22, 1.2], [-10, -30, 1.4], [34, -8, 1.3], [-34, 6, 1.2], [8, 34, 1.4], [-40, 28, 1.5], [44, 30, 1.3]]
  .forEach(([x, z, s]) => arvore(x, z, s))

// ---------- céu / período do dia ----------
const hdrLoader = new RGBELoader()
const pmrem = new THREE.PMREMGenerator(renderer)
const cacheHdr = {}
async function carregarHdr(nome) {
  if (!cacheHdr[nome]) {
    const t = await hdrLoader.loadAsync(`${import.meta.env.BASE_URL}assets/hdri/${nome}.hdr`)
    t.mapping = THREE.EquirectangularReflectionMapping
    // direção do sol = pixel mais brilhante
    const d = t.image.data, w = t.image.width, h = t.image.height, stride = d.length / (w * h)
    let best = 0, bi = 0
    for (let i = 0; i < w * h; i++) { const l = d[i * stride] + d[i * stride + 1] + d[i * stride + 2]; if (l > best) { best = l; bi = i } }
    const u = (bi % w) / w, v = Math.floor(bi / w) / h
    const phi = (u - 0.5) * Math.PI * 2, el = Math.abs((0.5 - v) * Math.PI)
    cacheHdr[nome] = { tex: t, env: pmrem.fromEquirectangular(t).texture, dir: new THREE.Vector3(Math.cos(phi) * Math.cos(el), Math.sin(el), Math.sin(phi) * Math.cos(el)) }
  }
  return cacheHdr[nome]
}
const PERIODOS = {
  manha:       { hdr: 'hilly_terrain_01_puresky', sol: 0xfff0d8, intSol: 3.0, env: 1.0, fundo: 1.0, nevoa: 0xb9cfe3, exp: 0.9, noite: 0 },
  tarde:       { hdr: 'hilly_terrain_01_puresky', sol: 0xfff6e8, intSol: 3.4, env: 1.1, fundo: 1.0, nevoa: 0xbcd3e8, exp: 0.85, noite: 0, elev: 55 },
  entardecer:  { hdr: 'evening_road_01_puresky',  sol: 0xffb070, intSol: 3.0, env: 1.0, fundo: 1.0, nevoa: 0xd9a77a, exp: 0.95, noite: 0.35 },
  noite:       { hdr: 'hilly_terrain_01_puresky', sol: 0x000000, intSol: 0.0, env: 0.06, fundo: 0.04, nevoa: 0x0a1020, exp: 1.2, noite: 1 },
}
const E = { periodo: 'entardecer', rotacaoCeu: 0, grama: PERF.grama, nevoa: 0.0035 }
async function aplicarPeriodo() {
  const pr = PERIODOS[E.periodo], h = await carregarHdr(pr.hdr)
  const rot = THREE.MathUtils.degToRad(E.rotacaoCeu)
  scene.background = h.tex; scene.environment = h.env
  scene.backgroundRotation.set(0, rot, 0); scene.environmentRotation.set(0, rot, 0)
  scene.backgroundIntensity = pr.fundo; scene.environmentIntensity = pr.env
  renderer.toneMappingExposure = pr.exp
  const dir = h.dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), rot)
  if (pr.elev) { const a = THREE.MathUtils.degToRad(pr.elev); const hz = new THREE.Vector3(dir.x, 0, dir.z).normalize(); dir.copy(hz.multiplyScalar(Math.cos(a))).setY(Math.sin(a)) }
  sol.position.copy(dir.clone().multiplyScalar(90)); sol.color.set(pr.sol); sol.intensity = pr.intSol
  lua.position.set(-30, 60, 30); lua.intensity = pr.noite === 1 ? 0.5 : 0
  scene.fog = new THREE.FogExp2(pr.nevoa, E.nevoa)
  casa.luzes.forEach((l, i) => (l.intensity = pr.noite * (i < 6 ? 14 : 10)))
  mat.lampada.color.set(pr.noite > 0.2 ? 0xffe3b0 : 0xb8a888)
}

// ---------- controles ----------
const orbit = new OrbitControls(camera, renderer.domElement)
orbit.maxPolarAngle = Math.PI / 2 - 0.02
const jogador = { x: 0, z: 0, yaw: 0, pitch: 0, olhos: 1.65, y: 2 }
const inicio = mundo(M.W + 14, 2); jogador.x = inicio.x; jogador.z = inicio.z; jogador.yaw = Math.PI / 2   // na frente da entrada, olhando para -x
let modo = 'andar'
const teclas = {}
function setModo(m) {
  modo = m; orbit.enabled = m === 'orbita'
  document.body.classList.toggle('voando', m === 'voar')
  document.getElementById('help').style.display = ehMobile ? 'none' : 'block'
  if (m === 'andar' || m === 'voar') { camera.position.set(jogador.x, jogador.y, jogador.z) }
}
addEventListener('keydown', e => { teclas[e.code] = true; if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault() })
addEventListener('keyup', e => (teclas[e.code] = false))
let arrastando = false
renderer.domElement.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch') return arrastando = true; renderer.domElement.setPointerCapture(e.pointerId) })
renderer.domElement.addEventListener('pointerup', () => (arrastando = false))
renderer.domElement.addEventListener('pointermove', e => {
  if (e.pointerType === 'touch' || modo === 'orbita' || !arrastando) return
  jogador.yaw -= e.movementX * 0.0035
  jogador.pitch = THREE.MathUtils.clamp(jogador.pitch - e.movementY * 0.0035, -1.3, 1.3)
})
const toque = criarToque((dx, dy) => {
  if (modo === 'orbita') return
  jogador.yaw -= dx * 0.005
  jogador.pitch = THREE.MathUtils.clamp(jogador.pitch - dy * 0.005, -1.3, 1.3)
}, () => modo === 'andar' || modo === 'voar')
let subir = 0   // botões ▲▼ (celular) no modo voar
const R = 0.3
function resolverColisao(x, z) {
  for (let it = 0; it < 3; it++) for (const c of colisores) {
    const cx = THREE.MathUtils.clamp(x, c.x0, c.x1), cz = THREE.MathUtils.clamp(z, c.z0, c.z1)
    const dx = x - cx, dz = z - cz, d2 = dx * dx + dz * dz
    if (d2 < R * R) {
      if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (R - d) / d; x += dx * k; z += dz * k }
      else { x += R } // dentro da caixa: empurra
    }
  }
  return [x, z]
}
const naLaje = (x, z) => casa.lajes.some(r => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1)
function atualizarAndar(dt) {
  const vel = (teclas.ShiftLeft || teclas.ShiftRight || toque.correr ? 5 : 2.2) * dt
  const giro = 1.9 * dt
  if (teclas.ArrowLeft) jogador.yaw += giro
  if (teclas.ArrowRight) jogador.yaw -= giro
  let f = 0, s = 0
  if (teclas.KeyW || teclas.ArrowUp) f += 1
  if (teclas.KeyS || teclas.ArrowDown) f -= 1
  if (teclas.KeyD) s += 1
  if (teclas.KeyA) s -= 1
  f += toque.f; s += toque.s
  f = Math.max(-1, Math.min(1, f)); s = Math.max(-1, Math.min(1, s))
  const sin = Math.sin(jogador.yaw), cos = Math.cos(jogador.yaw)
  if (modo === 'voar') {   // voo livre: anda na direção do olhar, sem colisão
    const v = (teclas.ShiftLeft || teclas.ShiftRight || toque.correr ? 14 : 6) * dt, cp = Math.cos(jogador.pitch), sp = Math.sin(jogador.pitch)
    let sub = (teclas.Space ? 1 : 0) - (teclas.KeyC ? 1 : 0) + subir
    jogador.x += (-sin * cp * f + cos * s) * v; jogador.z += (-cos * cp * f - sin * s) * v
    jogador.y += (sp * f + sub) * v
    jogador.x = THREE.MathUtils.clamp(jogador.x, -150, 150); jogador.z = THREE.MathUtils.clamp(jogador.z, -150, 150)
    jogador.y = Math.max(jogador.y, alturaTerreno(jogador.x, jogador.z) + 0.6)
    camera.position.set(jogador.x, jogador.y, jogador.z); camera.rotation.set(jogador.pitch, jogador.yaw, 0)
    return
  }
  let nx = jogador.x + (-sin * f + cos * s) * vel, nz = jogador.z + (-cos * f - sin * s) * vel
  ;[nx, nz] = resolverColisao(nx, nz)
  const lim = 80; nx = THREE.MathUtils.clamp(nx, -lim, lim); nz = THREE.MathUtils.clamp(nz, -lim, lim)
  jogador.x = nx; jogador.z = nz
  const chao = naLaje(nx, nz) ? M.LAJE : alturaTerreno(nx, nz)
  jogador.y += (chao + jogador.olhos - jogador.y) * Math.min(1, dt * 10)
  camera.position.set(jogador.x, jogador.y, jogador.z)
  camera.rotation.set(jogador.pitch, jogador.yaw, 0)
}

// botões subir/descer do modo voar (celular)
for (const [txt, v, id] of [['▲', 1, 'subir'], ['▼', -1, 'descer']]) {
  const b = document.createElement('button'); b.id = id; b.className = 'vooBtn'; b.textContent = txt
  const on = e => { subir = v; e.preventDefault() }, off = () => { subir = 0 }
  b.addEventListener('touchstart', on, { passive: false }); b.addEventListener('touchend', off); b.addEventListener('touchcancel', off)
  b.addEventListener('mousedown', on); b.addEventListener('mouseup', off)
  document.body.appendChild(b)
}
// ---------- interface ----------
const barra = document.getElementById('bar')
if (ehMobile) {
  barra.classList.add('mob')
  const mb = document.createElement('button'); mb.id = 'menuBtn'; mb.textContent = '☰'
  mb.onclick = () => barra.classList.toggle('aberta'); document.body.appendChild(mb)
  barra.addEventListener('click', e => { if (e.target.tagName === 'BUTTON') barra.classList.remove('aberta') })
}
const btn = (txt, fn) => { const b = document.createElement('button'); b.textContent = txt; b.onclick = fn; barra.appendChild(b) }
btn('Caminhar', () => { if (modo === 'voar') jogador.y = alturaTerreno(jogador.x, jogador.z) + jogador.olhos; setModo('andar'); setTeto(true) })
btn('Voar', () => { if (modo !== 'voar') { jogador.y = Math.max(jogador.y, 12); jogador.pitch = -0.35 } setModo('voar'); setTeto(false) })
btn('Vista aérea', () => { setModo('orbita'); setTeto(false); camera.position.set(22, 30, 16); orbit.target.set(0, 0, 0); orbit.update() })
btn('Teto: liga/desliga', () => setTeto(!casa.teto.visible))
btn('Frente da casa', () => { setModo('orbita'); setTeto(true); camera.position.set(24, 3, 0); orbit.target.set(0, 1.8, 0); orbit.update() })
for (const [k, n] of [['manha', 'Manhã'], ['tarde', 'Tarde'], ['entardecer', 'Entardecer'], ['noite', 'Noite']]) btn(n, () => { E.periodo = k; aplicarPeriodo() })
if (!ehMobile) btn('Foto (PNG)', () => {
  renderer.render(scene, camera)
  const a = document.createElement('a'); a.href = renderer.domElement.toDataURL('image/png'); a.download = 'casa.png'; a.click()
})
const E2 = { teto: true }
function setTeto(v) { casa.teto.visible = v; E2.teto = v; tetoCtl?.updateDisplay() }
let tetoCtl
const gui = new GUI({ title: 'Ajustes', width: 260 }); if (ehMobile) gui.close(); else gui.open()
tetoCtl = gui.add(E2, 'teto').name('mostrar teto').onChange(v => (casa.teto.visible = v))
gui.add(E, 'rotacaoCeu', 0, 360, 1).name('girar céu/montanhas').onChange(aplicarPeriodo)
gui.add(E, 'grama', 0, PERF.grama, 1000).name('quantidade de grama').onChange(v => (grama.count = v))
gui.add(E, 'nevoa', 0, 0.012, 0.0005).name('névoa').onChange(aplicarPeriodo)
gui.addColor({ c: '#ffffff' }, 'c').name('cor da parede').onChange(v => mat.parede.color.set(v))
gui.addColor({ c: '#ffffff' }, 'c').name('cor do telhado').onChange(v => mat.telhado.color.set(v))
// ?periodo=noite&modo=orbita para links diretos
const q = new URLSearchParams(location.search)
if (PERIODOS[q.get('periodo')]) E.periodo = q.get('periodo')
if (q.get('rot')) E.rotacaoCeu = +q.get('rot')

addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight) })
const relogio = new THREE.Clock()
function loop() {
  const dt = Math.min(relogio.getDelta(), 0.1)
  grama.userData.uTime.value += dt; pessoas.update(relogio.elapsedTime, dt)
  if (modo === 'andar') atualizarAndar(dt); else orbit.update()
  try { renderer.render(scene, camera) } catch (e) { logErro('render: ' + e.message) }
  requestAnimationFrame(loop)
}
window.__cena = { setTeto, camera, jogador, setModo, E, aplicarPeriodo, scene, orbit }   // para depuração
// o céu pode falhar em alguns celulares: mostra o erro, usa luz de reserva e desenha a casa mesmo assim
aplicarPeriodo().catch(e => {
  logErro('Céu falhou: ' + (e?.message || e))
  scene.background = new THREE.Color(0x9ec5e8); scene.add(new THREE.HemisphereLight(0xffffff, 0x556644, 2.2))
}).then(() => { document.getElementById('help').style.display = ehMobile ? 'none' : 'block'; setModo('andar'); loop() })
