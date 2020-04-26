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
            break
          }
          case 'rotate': {
            const line = new Timeline(entity, keys, { field, name })
            lines.push(line)
            break
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
        const alpha = (hex.length != 8 ? 255 : parseInt(hex.substr(6, 2), 16)) / 255.0
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

  reverse() {
    const endTime = this.lines.reduce((t, l) => {
      const tt = l.keys[l.keys.length - 1].time
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

    this.promise = new Promise(resolve => {
      this.resolve = resolve
    })

    return this
  }

  timeScale = 1 / 66.666
  update(delta) {
    this.escaped += delta * this.timeScale

    const { lines, isReverse, escaped: time } = this

    let completed = true
    for (var l, i = 0, len = lines.length; i < len; i++) {
      l = lines[i]
      l.update(time)
      const { isComplete, isBegin } = l
      if ((!isReverse && !isComplete) || (isReverse && !isBegin)) completed = false
    }

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
    const { entities, attachments } = this
    Object.keys(attachments).forEach(name => {
      const entity = entities[name]
      const ts = attachments[name]
      if (ts) ts.forEach(t => this.assign(t, entity))
    })
  }

  attachments = {}
  attach(name, attachment) {
    if (!this.attachments[name]) {
      this.attachments[name] = []
    }
    const ts = this.attachments[name]
    ts.push(attachment)
    return this
  }

  bind(name, attachment) {
    console.warn('use .attach instead of, .bind is deprecated')
    return this.attach(name, attachment)
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
