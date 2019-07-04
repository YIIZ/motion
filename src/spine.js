import { Timeline } from './timeline.js'
import { linear, cubicBezier } from '@popmotion/easing'

const degRad = Math.PI / 180

export class SpineAnimation {
  constructor(animation, { basename = true } = {}) {
    this.animation = animation
    // TODO deform, draworder
    const { slots = {}, bones = {}, deform = {}, draworder = {} } = animation
    const lines = []
    const entities = {}
    this.lines = lines
    this.entities = entities
    this.escaped = 0

    Object.keys(slots).map(n => {
      const name = basename ? getBasename(n) : n
      entities[name] = entities[name] || {}
      const entity = entities[name]
      const slot = slots[n]
      Object.keys(slot).forEach(field => {
        const keys = this.normalizeKeys(slot[field], 'color')
        const line = new Timeline(entity, keys, { field, name })
        lines.push(line)
      })
    })

    Object.keys(bones).map(n => {
      const name = basename ? getBasename(n) : n
      entities[name] = entities[name] || {}
      const entity = entities[name]
      const bone = bones[n]
      Object.keys(bone).forEach(field => {
        const keys = this.normalizeKeys(bone[field], field)
        switch (field) {
          case 'scale':
          case 'translate': {
            entity[field] = {}
            const line = new Timeline(entity[field], keys, { field, name })
            lines.push(line)
            break;
          }
          case 'rotate': {
            const line = new Timeline(entity, keys, { field, name })
            lines.push(line)
            break;
          }
        }
      })
    })
  }

  normalizeKeys(keys, type) {
    return keys.map(k => {
      const { time, curve } = k
      const nk = { time, curve: this.normalizeCurve(curve) }
      if (type === 'color') {
        let { color: hex } = k
        hex = hex.charAt(0) == '#' ? hex.substr(1) : hex
        const r = parseInt(hex.substr(0, 2), 16) / 255.0
        const g = parseInt(hex.substr(2, 2), 16) / 255.0
        const b = parseInt(hex.substr(4, 2), 16) / 255.0
        const alpha = (hex.length != 8 ? 255 : parseInt(hex.substr(6, 2), 16)) / 255.0;
        nk.value = { r, g, b, alpha }
      } else if (type === 'rotate') {
        nk.value = { rotation: degRad * k.angle }
      } else {
        nk.value = { x: k.x, y: k.y }
      }
      return nk
    })
  }

  normalizeCurve(curve) {
    if (!curve) return linear
    if (curve === 'steppd') return steppd
    return cubicBezier(...curve)
  }

  addScaleTimeline(name, points) {
    const { entities } = this
    entities[name] = entities[name] || {}
    const entity = entities[name]
    const line = new ScaleTimeline(entity, points)
    this.lines.push(line)
    return this
  }

  reverse() {
    const endTime = this.lines.reduce((t, l) => {
      const tt = l.points[l.points.length - 1].time
      return t > tt ? t : tt
    }, 0)

    this.isReverse = true
    this.escaped = endTime - this.escaped
    this.timeScale = -this.timeScale

    return this
  }

  start(ticker) {
    this.started = true
    this.ticker = ticker
    this.ticker.add(this.update, this)

    this.promise = new Promise((resolve) => {
      this.resolve = resolve
    })

    return this
  }

  timeScale = 1 / 66.666
  update(delta) {
    this.escaped += delta * this.timeScale

    const { isReverse, escaped: time } = this

    let completed = true
    this.lines.forEach(l => {
      l.update(time)
      const { isEnd, isBegin } = l
      if ((!isReverse && !isEnd) || (isReverse && !isBegin)) completed = false
    })

    this.handleUpdate()

    if (completed) {
      this.handleComplete()
    }
    return this
  }

  stop() {
    this.ticker.remove(this.update, this)
    return this
  }

  handleComplete() {
    this.ticker.remove(this.update, this)
    this.completed = true
    this.resolve()
  }

  handleUpdate() {
    const { entities, targets } = this
    Object.keys(targets)
    .forEach(name => {
      const entity = entities[name]
      const ts = targets[name]
      if (ts) ts.forEach(t => this.assign(t, entity))
    })
  }

  targets = {}
  bind(name, target) {
    if (!this.targets[name]) {
      this.targets[name] = []
    }
    const ts = this.targets[name]
    ts.push(target)
    return this
  }

  assign(t, entity) {
    Object.assign(t, entity)
    if (entity.translate) {
      if (!entity.position) entity.position = t.position.clone()
      const { x, y } = entity.position
      const { x: x1, y: y1 } = entity.translate
      t.position.set(x - x1, y - y1)
    }
  }

}


function steppd() {
  return 0
}

function noop(v) {
  return v
}

function getBasename(name) {
  return name.split('/').pop()
}

