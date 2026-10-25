// Controles de toque: joystick virtual (metade esquerda) e arrastar para olhar (metade direita).
export const ehMobile = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent)

export function criarToque(aoOlhar, ativo = () => true) {
  const estado = { f: 0, s: 0, correr: false }
  const base = document.createElement('div'), pino = document.createElement('div')
  base.id = 'joy'; pino.id = 'joyPino'; base.appendChild(pino); document.body.appendChild(base)
  const RAIO = 55
  let idMov = null, idOlhar = null, cx = 0, cy = 0, ox = 0, oy = 0

  const naUI = t => t.target.closest('#bar, #menuBtn, .lil-gui')
  addEventListener('touchstart', e => {
    for (const t of e.changedTouches) {
      if (naUI(t) || !ativo()) continue
      if (t.clientX < innerWidth / 2 && idMov === null) {
        idMov = t.identifier; cx = t.clientX; cy = t.clientY
        base.style.cssText = `display:block;left:${cx - RAIO}px;top:${cy - RAIO}px`
        pino.style.transform = 'translate(0,0)'
      } else if (t.clientX >= innerWidth / 2 && idOlhar === null) {
        idOlhar = t.identifier; ox = t.clientX; oy = t.clientY
      }
    }
    e.preventDefault()
  }, { passive: false })
  addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === idMov) {
        let dx = t.clientX - cx, dy = t.clientY - cy
        const d = Math.hypot(dx, dy); if (d > RAIO) { dx *= RAIO / d; dy *= RAIO / d }
        pino.style.transform = `translate(${dx}px,${dy}px)`
        estado.s = dx / RAIO; estado.f = -dy / RAIO
        estado.correr = Math.hypot(estado.s, estado.f) > 0.95
      } else if (t.identifier === idOlhar) {
        aoOlhar(t.clientX - ox, t.clientY - oy); ox = t.clientX; oy = t.clientY
      }
    }
    e.preventDefault()
  }, { passive: false })
  const fim = e => {
    for (const t of e.changedTouches) {
      if (t.identifier === idMov) { idMov = null; estado.f = estado.s = 0; estado.correr = false; base.style.display = 'none' }
      if (t.identifier === idOlhar) idOlhar = null
    }
  }
  addEventListener('touchend', fim); addEventListener('touchcancel', fim)
  return estado
}
