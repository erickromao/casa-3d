// Baixa texturas, HDRIs e modelos CC0 do Poly Haven (polyhaven.com) para public/assets
// Uso: node scripts/baixar-assets.mjs
import { mkdir, writeFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const OUT = 'public/assets'
const TEXTURAS = {
  chao: 'leafy_grass', parede: 'beige_wall_001', telhado: 'grey_roof_tiles',
  madeira: 'dark_planks', piso: 'brown_floor_tiles', forro: 'brown_planks_03',
  pedra: 'cobblestone_floor_01',
}
const HDRIS = ['hilly_terrain_01_puresky', 'evening_road_01_puresky', 'farm_sunset']
const MODELOS = ['sofa_02', 'dining_table', 'dining_chair_02', 'mid_century_lounge_chair', 'vintage_day_bed',
  'drawer_cabinet', 'electric_stove', 'potted_plant_02', 'painted_wooden_bench',
  'coffee_table_round_01', 'planter_box_01', 'outdoor_table_chair_set_01', 'wooden_picnic_table']
const MAPAS = { diff: 'Diffuse', nor_gl: 'nor_gl', rough: 'Rough', ao: 'AO' }

const exists = p => access(p).then(() => true, () => false)
async function get(url, dest) {
  if (await exists(dest)) return
  const r = await fetch(url); if (!r.ok) throw new Error(url + ' ' + r.status)
  await mkdir(dirname(dest), { recursive: true })
  await writeFile(dest, Buffer.from(await r.arrayBuffer()))
}
const files = async id => (await fetch(`https://api.polyhaven.com/files/${id}`)).json()

for (const [nome, id] of Object.entries(TEXTURAS)) {
  const f = await files(id)
  for (const [k, api] of Object.entries(MAPAS)) {
    const e = f[api]?.['1k']?.jpg; if (!e) { console.log('sem', id, api); continue }
    await get(e.url, join(OUT, 'tex', nome, k + '.jpg'))
  }
  console.log('textura', nome, id)
}
for (const id of HDRIS) {
  const f = await files(id)
  await get(f.hdri['2k'].hdr.url, join(OUT, 'hdri', id + '.hdr')); console.log('hdri', id)
}
for (const id of MODELOS) {
  const f = await files(id)
  const g = f.gltf['1k'].gltf
  await get(g.url, join(OUT, 'models', id, id + '.gltf'))
  for (const [rel, inc] of Object.entries(g.include)) await get(inc.url, join(OUT, 'models', id, rel))
  console.log('modelo', id)
}
