import * as THREE from 'three'
import { mundo, M } from './casa.js'

// Pessoas feitas de formas simples articuladas (sem arquivos externos).
const matPele = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 })
const cap = (r, comp, mat) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, comp - 2 * r), 4, 10), mat); m.castShadow = true; return m }

function criarPessoa({ pele = 0xd9a77e, camisa = 0x3a6ea5, calca = 0x2b2b35, cabelo = 0x2a1c12, escala = 1 }) {
  const mP = matPele(pele), mC = new THREE.MeshStandardMaterial({ color: camisa, roughness: 0.85 }), mL = new THREE.MeshStandardMaterial({ color: calca, roughness: 0.9 })
  const mH = new THREE.MeshStandardMaterial({ color: cabelo, roughness: 1 })
  const raiz = new THREE.Group(); raiz.scale.setScalar(escala)
  const pelvis = new THREE.Group(); raiz.add(pelvis)
  const quadril = cap(0.14, 0.3, mL); quadril.rotation.z = Math.PI / 2; quadril.scale.set(1, 1, 0.8); pelvis.add(quadril)
  const tronco = new THREE.Group(); tronco.position.y = 0.05; pelvis.add(tronco)
  const peito = cap(0.16, 0.6, mC); peito.position.y = 0.3; peito.scale.set(1.15, 1, 0.75); tronco.add(peito)
  const cabeca = new THREE.Group(); cabeca.position.y = 0.67; tronco.add(cabeca)
  const crânio = new THREE.Mesh(new THREE.SphereGeometry(0.105, 18, 14), mP); crânio.position.y = 0.1; crânio.scale.set(0.95, 1.1, 1); crânio.castShadow = true; cabeca.add(crânio)
  const pescoco = cap(0.045, 0.12, mP); pescoco.position.y = -0.0; cabeca.add(pescoco)
  const cab = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), mH); cab.position.set(0, 0.115, -0.012); cab.scale.set(1, 1.05, 1.05); cabeca.add(cab)
  const braco = lado => {
    const ombro = new THREE.Group(); ombro.position.set(lado * 0.22, 0.52, 0); tronco.add(ombro)
    const sup = cap(0.05, 0.3, mC); sup.position.y = -0.15; ombro.add(sup)
    const cotovelo = new THREE.Group(); cotovelo.position.y = -0.3; ombro.add(cotovelo)
    const ant = cap(0.04, 0.28, mP); ant.position.y = -0.14; cotovelo.add(ant)
    const mao = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), mP); mao.position.y = -0.3; mao.castShadow = true; cotovelo.add(mao)
    return { ombro, cotovelo }
  }
  const perna = lado => {
    const coxa = new THREE.Group(); coxa.position.set(lado * 0.09, -0.02, 0); pelvis.add(coxa)
    const m1 = cap(0.075, 0.44, mL); m1.position.y = -0.22; coxa.add(m1)
    const joelho = new THREE.Group(); joelho.position.y = -0.44; coxa.add(joelho)
    const m2 = cap(0.06, 0.44, mL); m2.position.y = -0.22; joelho.add(m2)
    const pe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.24), new THREE.MeshStandardMaterial({ color: 0x1a1a1a })); pe.position.set(0, -0.46, 0.05); pe.castShadow = true; joelho.add(pe)
    return { coxa, joelho }
  }
  const J = { pelvis, tronco, cabeca, bE: braco(-1), bD: braco(1), pE: perna(-1), pD: perna(1) }
  return { raiz, J, fase: 0 }
}

// poses (ângulos em radianos; x positivo no ombro/coxa = para trás)
function poseAndar(p, ph, vel = 1) {
  const J = p.J, s = Math.sin(ph), c = Math.cos(ph)
  J.pelvis.position.y = 0.9 + Math.abs(s) * 0.025
  J.pE.coxa.rotation.x = s * 0.55; J.pD.coxa.rotation.x = -s * 0.55
  J.pE.joelho.rotation.x = Math.max(0, -c) * 0.9; J.pD.joelho.rotation.x = Math.max(0, c) * 0.9
  J.bE.ombro.rotation.x = -s * 0.45; J.bD.ombro.rotation.x = s * 0.45
  J.bE.cotovelo.rotation.x = -0.25 - Math.max(0, s) * 0.3; J.bD.cotovelo.rotation.x = -0.25 - Math.max(0, -s) * 0.3
  J.tronco.rotation.x = 0.05; J.cabeca.rotation.set(0, 0, 0); J.pelvis.rotation.y = s * 0.08
}
function poseParado(p, t) {
  const J = p.J
  J.pelvis.position.y = 0.9; J.pelvis.rotation.y = 0
  for (const l of [J.pE, J.pD]) { l.coxa.rotation.x = 0; l.joelho.rotation.x = 0 }
  J.bE.ombro.rotation.set(0, 0, 0.05); J.bD.ombro.rotation.set(0, 0, -0.05)
  J.bE.cotovelo.rotation.x = -0.15; J.bD.cotovelo.rotation.x = -0.15
  J.tronco.rotation.x = Math.sin(t * 1.3) * 0.01; J.cabeca.rotation.y = Math.sin(t * 0.7) * 0.2
}
function poseSentado(p, t, { comer = false, recostar = false, fase = 0 }) {
  const J = p.J
  J.pelvis.position.y = 0.5
  for (const l of [J.pE, J.pD]) { l.coxa.rotation.x = -Math.PI / 2 + 0.02; l.joelho.rotation.x = Math.PI / 2 - 0.05 }
  J.pE.coxa.rotation.z = 0.04; J.pD.coxa.rotation.z = -0.04
  J.tronco.rotation.x = recostar ? -0.12 : 0.14
  if (comer) {
    const ciclo = (Math.sin(t * 1.6 + fase) + 1) / 2           // 0 = mão no prato, 1 = mão na boca
    J.bD.ombro.rotation.x = -0.55 - ciclo * 0.5; J.bD.cotovelo.rotation.x = -1.1 - ciclo * 1.0
    J.bE.ombro.rotation.x = -0.5; J.bE.cotovelo.rotation.x = -1.0
    J.cabeca.rotation.x = 0.1 + ciclo * 0.05 - 0.05; J.cabeca.rotation.y = Math.sin(t * 0.5 + fase) * 0.25
  } else {
    J.bE.ombro.rotation.x = -0.35; J.bD.ombro.rotation.x = -0.35
    J.bE.cotovelo.rotation.x = -1.0; J.bD.cotovelo.rotation.x = -1.0
    J.cabeca.rotation.x = 0; J.cabeca.rotation.y = Math.sin(t * 0.4 + fase) * 0.4
  }
}

export function criarPessoas(scene, colisoresFn) {
  const Y0 = M.LAJE, lista = []
  const sentada = (nome, x, p, ry, opts, look) => {
    const pe = criarPessoa(look); const w = mundo(x, p)
    pe.raiz.position.set(w.x, Y0, w.z); pe.raiz.rotation.y = ry
    scene.add(pe.raiz); lista.push({ nome, pe, tipo: 'sentado', opts, fase: Math.random() * 6 }); return pe
  }
  // 1 e 2: comendo à mesa da cozinha
  sentada('comendo 1', 3.6, 1.33, 0, { comer: true, fase: 0 }, { camisa: 0xc0553a, calca: 0x2f3b52, cabelo: 0x1c120b, pele: 0xcf9b72 })
  sentada('comendo 2', 2.78, 2.2, Math.PI / 2, { comer: true, fase: 2 }, { camisa: 0x4f8a64, calca: 0x3a3a3a, cabelo: 0x6b4a2a, pele: 0xe8b88f, escala: 0.96 })
  // pratos na mesa
  for (const [x, p] of [[3.6, 1.72], [3.12, 2.2]]) {
    const w = mundo(x, p), prato = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.025, 18), new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.3 }))
    prato.position.set(w.x, Y0 + 0.76, w.z); prato.castShadow = true; scene.add(prato)
  }
  // 3: sentada no sofá da sala
  sentada('sofá', 10.8, 3.78, Math.PI, { recostar: true, fase: 1 }, { camisa: 0xe2c14a, calca: 0x1f2a44, cabelo: 0x120c08, pele: 0x9a6a45, escala: 1.02 })

  // andarilhos: seguem pontos (planta x,p), com pausas
  const andarilho = (nome, trajeto, look, vel = 1.15) => {
    const pe = criarPessoa(look); scene.add(pe.raiz)
    lista.push({ nome, pe, tipo: 'andar', trajeto: trajeto.map(([x, p, pausa = 0]) => ({ w: mundo(x, p), pausa })), i: 0, vel, espera: 0, ph: 0 })
    const a = lista[lista.length - 1]; a.pe.raiz.position.set(a.trajeto[0].w.x, Y0, a.trajeto[0].w.z)
  }
  // 4: caminhando pela varanda (frente e lado da sala)
  andarilho('andando', [[16.5, -1.6], [16.5, 6.5], [16.5, -1.6], [1.5, -1.6, 3], [16.5, -1.6]], { camisa: 0x7b5fb0, calca: 0x30343c, cabelo: 0x3a2a1a, pele: 0xd8a07a }, 1.2)
  // 5: indo ao lavabo da área de serviço
  andarilho('lavabo', [[-1.0, 5.4, 2], [-0.75, 6.8], [-0.75, 8.3, 6], [-0.75, 6.8], [-2.8, 5.0, 3], [-5.5, 3.5, 2], [-2.8, 5.0]], { camisa: 0x2a8f9c, calca: 0x5a4636, cabelo: 0x0e0a07, pele: 0xb97c54 }, 1.0)

  const v = new THREE.Vector3()
  return {
    update(t, dt) {
      for (const q of lista) {
        if (q.tipo === 'sentado') { poseSentado(q.pe, t, { ...q.opts, fase: q.fase }); continue }
        const alvo = q.trajeto[(q.i + 1) % q.trajeto.length], pos = q.pe.raiz.position
        if (q.espera > 0) { q.espera -= dt; poseParado(q.pe, t); continue }
        v.set(alvo.w.x - pos.x, 0, alvo.w.z - pos.z); const d = v.length()
        if (d < 0.08) { q.i = (q.i + 1) % q.trajeto.length; q.espera = alvo.pausa; continue }
        const yaw = Math.atan2(v.x, v.z); let dy = yaw - q.pe.raiz.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy))
        q.pe.raiz.rotation.y += dy * Math.min(1, dt * 6)
        const passo = Math.min(d, q.vel * dt); v.normalize(); pos.x += v.x * passo; pos.z += v.z * passo
        q.ph += dt * q.vel * 5.2; poseAndar(q.pe, q.ph)
      }
    },
  }
}
