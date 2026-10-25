import * as THREE from 'three'

const loader = new THREE.TextureLoader()

/** Material PBR a partir de public/assets/tex/<nome>. `tam` = metros que uma repetição da textura cobre. */
function pbr(nome, tam, { cor = 0xffffff, rugosidade = 1, normal = 1, dupla = false } = {}) {
  const base = `${import.meta.env.BASE_URL}assets/tex/${nome}/`
  const tex = (f, srgb) => {
    const t = loader.load(base + f)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
    t.anisotropy = 8
    return t
  }
  const m = new THREE.MeshStandardMaterial({
    map: tex('diff.jpg', true), normalMap: tex('nor_gl.jpg'), roughnessMap: tex('rough.jpg'),
    aoMap: tex('ao.jpg'), color: cor, roughness: rugosidade, normalScale: new THREE.Vector2(normal, normal),
    side: dupla ? THREE.DoubleSide : THREE.FrontSide,
  })
  m.userData.tam = tam
  return m
}

export function criarMateriais() {
  return {
    parede: pbr('parede', 2.5),
    piso: pbr('piso', 2.4, { rugosidade: 0.9, cor: 0xe6d8c4 }),
    telhado: pbr('telhado', 2.4, { dupla: true, cor: 0x8a8580 }),
    madeira: pbr('madeira', 1.5, { cor: 0xd08a64 }),
    forro: pbr('forro', 2, { cor: 0xcaa07c }),
    pedra: pbr('pedra', 1.5),
    chao: pbr('chao', 3, { cor: 0xa8c070 }),
    vidro: new THREE.MeshPhysicalMaterial({
      color: 0xcfe6ee, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.22,
      envMapIntensity: 1.6, depthWrite: false,
    }),
    esquadria: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.5, metalness: 0.6 }),
    tampo: new THREE.MeshStandardMaterial({ color: 0x2b2725, roughness: 0.25, metalness: 0.1 }),
    rede: new THREE.MeshStandardMaterial({ color: 0xf1e9d6, roughness: 1, side: THREE.DoubleSide }),
    branco: new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.3 }),
    lampada: new THREE.MeshBasicMaterial({ color: 0xffd9a0 }),
  }
}
