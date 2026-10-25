import * as THREE from 'three'

// Relevo: plano sob a casa e leve declive/ondulação ao redor (como no lote da foto)
let Z = { x0: -10, x1: 10, z0: -10, z1: 10 }          // retângulo plano sob a casa (mundo)
export const definirZona = z => { Z = z }
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
export function alturaTerreno(x, z) {
  const dx = Math.max(0, Z.x0 - 3 - x, x - Z.x1 - 3), dz = Math.max(0, Z.z0 - 3 - z, z - Z.z1 - 3)
  const d = Math.hypot(dx, dz)
  const k = smooth(0, 14, d)
  const onda = Math.sin(x * 0.045 + 1) * Math.cos(z * 0.037) * 1.8 + Math.sin(x * 0.11 + z * 0.09) * 0.25
  const declive = -x * 0.05                       // cai em direção ao horizonte (frente = +x)
  return k * (onda + declive) + d * 0.02 * k
}

export function criarTerreno(matChao) {
  const T = 600, seg = 220
  const g = new THREE.PlaneGeometry(T, T, seg, seg).rotateX(-Math.PI / 2)
  const pos = g.attributes.position, cores = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i)
    pos.setY(i, alturaTerreno(x, z))
    const n = 0.8 + 0.2 * Math.sin(x * 0.21) * Math.cos(z * 0.17) + 0.12 * Math.sin(x * 0.043 + z * 0.05)
    cores.set([n * 0.95, n, n * 0.85], i * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(cores, 3))
  g.computeVertexNormals()
  const uv = g.attributes.uv, tam = matChao.userData.tam
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / tam, pos.getZ(i) / tam)
  const m = matChao.clone(); m.vertexColors = true; m.userData = matChao.userData
  m.map = matChao.map; m.normalMap = matChao.normalMap; m.roughnessMap = matChao.roughnessMap; m.aoMap = matChao.aoMap
  const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true
  return mesh
}

/** capim 3D: lâminas instanciadas balançando ao vento */
export function criarGrama(livre, maxLaminas = 90000, raio = 55) {
  // lâmina com 3 segmentos
  const w = 0.03, h = 0.4
  const v = [-w, 0, 0, w, 0, 0, -w * 0.7, h * 0.4, 0, w * 0.7, h * 0.4, 0, -w * 0.35, h * 0.75, 0, w * 0.35, h * 0.75, 0, 0, h, 0]
  const cor = []; for (let i = 0; i < 7; i++) { const t = v[i * 3 + 1] / h; cor.push(0.10 + 0.35 * t, 0.22 + 0.45 * t, 0.05 + 0.1 * t) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3))
  g.setIndex([0, 1, 3, 0, 3, 2, 2, 3, 5, 2, 5, 4, 4, 5, 6])
  g.computeVertexNormals()
  const uTime = { value: 0 }
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.8 })
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = uTime
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 iw = instanceMatrix * vec4(0.,0.,0.,1.);
      float hh = position.y / ${h.toFixed(2)};
      transformed.x += (sin(uTime*1.7 + iw.x*0.6 + iw.z*0.4) * 0.6 + sin(uTime*3.1 + iw.x*1.3) * 0.15) * hh*hh * 0.28;
      transformed.z += cos(uTime*1.3 + iw.z*0.5) * hh*hh * 0.14;`)
  }
  const mesh = new THREE.InstancedMesh(g, mat, maxLaminas)
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color()
  let n = 0
  while (n < maxLaminas) {
    const r = raio * Math.pow(Math.random(), 0.75), a = Math.random() * Math.PI * 2
    const x = Math.cos(a) * r, z = Math.sin(a) * r
    if (!livre(x, z)) continue
    const y = alturaTerreno(x, z)
    e.set((Math.random() - 0.5) * 0.35, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.35)
    q.setFromEuler(e); p.set(x, y, z)
    const k = 0.6 + Math.random() * 0.5; s.set(k, k * (0.7 + Math.random() * 0.8), k)
    m4.compose(p, q, s); mesh.setMatrixAt(n, m4)
    c.setHSL(0.24 + Math.random() * 0.07, 0.45, 0.35 + Math.random() * 0.18); mesh.setColorAt(n, c)
    n++
  }
  mesh.frustumCulled = false; mesh.receiveShadow = true
  mesh.userData.uTime = uTime
  return mesh
}
