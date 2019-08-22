// keys: [{ time: 0, value: { x, y } }]
import { linear, cubicBezier } from '@popmotion/easing'

export class Timeline {
  constructor(value, keys, meta) {
    this.value = value
    this.keys = keys
    this.callbacks = []
    if (value !== 'number' && keys && keys.length > 0) {
      this.fields = Object.keys(keys[0].value)
    }
    // field in meta

    Object.assign(this, meta)
  }

  update(time) {
    const { keys, loop } = this
    if (!keys || keys.length === 0) return

    if (loop) {
      const endTime = keys[keys.length - 1].time
      if (time > endTime) time = time % endTime
    }

    const nextAt = keys.findIndex(p => p.time > time)
    this.keyId = nextAt - 1

    if (nextAt === 0) return
    if (nextAt < 0) return this.end()

    const start = keys[nextAt - 1]
    const end = keys[nextAt]
    this.interpolate(time, start, end)
  }

  end() {
    this.isEnd = true
    const k = this.keys[this.keys.length - 1]
    this.interpolate(0, k, k)
  }

  interpolate(t, start, end) {
    let { curve } = start
    if (typeof curve === 'string' || typeof curve === 'undefined') {
      curve = curveFuncs[curve] || curveFuncs.stepped
    }

    const t0 = start.time
    const t1 = end.time
    const d = t1 - t0
    const r = d === 0 ? 0 : curve((t - t0)/(t1 - t0))

    if (this.fields && this.fields.length > 0) {
      this.fields.forEach(f => {
        this.value[f] = this.mix(start.value[f], end.value[f], r)
      })
    } else if (this.field) {
      this.value[this.field] = this.mix(start.value, end.value, r)
    } else {
      this.value = this.mix(start.value, end.value, r)
    }

    if (this.callbacks.length > 0) {
      this.callbacks.forEach(cb => cb(this.value))
    }
  }

  mix(v0, v1, r) {
    return r * (v1 - v0) + v0
  }

  onUpdate(cb) {
    this.callbacks.push(cb)
  }

  destroy() {
    this.callbacks = null
    this.fields = null
    this.keys = null
    this.value = null
  }
}

const curveFuncs = {
  stepped: function() {
    return 0
  },
  linear,
}
