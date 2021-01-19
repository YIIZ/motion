import { linear, cubicBezier } from '@teambun/motion'
import ticker from 'ticker'

// keys: [{ time: 0, value: { x, y }, curve }]
export class Timeline {
  constructor(value, keys, meta) {
    this.value = value
    this.keys = keys
    if (value !== 'number' && keys && keys.length > 0) {
      this.fields = Object.keys(keys[0].value)
    }
    // field in meta

    Object.assign(this, meta)
  }

  update(time) {
    const { keys, loop } = this
    if (!keys || keys.length === 0) return

    if (loop > 0) {
      const endTime = keys[keys.length - 1].time
      if (time >= endTime) {
        time = time % endTime
        this.loop -= 1
        if (this.handleLoop) this.handleLoop()
      }
    }

    const len = keys.length
    let nextAt = -1
    for (let t, i = len - 1; i >= 0; i--) {
      if (keys[i].time <= time) {
        nextAt = i + 1
        break
      }
    }

    if (nextAt <= 0) return

    this.keyId = nextAt - 1
    this.isBegin = true
    if (nextAt === len) return this.complete(time)
    const start = keys[nextAt - 1]
    const end = keys[nextAt]
    this.interpolate(time, start, end)
  }

  complete() {
    const { keys, handleComplete } = this
    this.isComplete = true
    const k = keys[keys.length - 1]
    this.interpolate(0, k, k)

    ticker.remove(this.tick)
    if (handleComplete) handleComplete(this.value)
  }

  interpolate(t, start, end) {
    let { curve } = start
    if (typeof curve === 'string' || typeof curve === 'undefined') {
      curve = curveFuncs[curve] || curveFuncs.stepped
    }

    const t0 = start.time
    const t1 = end.time
    const d = t1 - t0
    const r = d === 0 ? 0 : curve((t - t0) / (t1 - t0))

    const { fields, handleUpdate, value, field } = this

    if (fields && fields.length > 0) {
      for (let f, i = 0, len = fields.length; i < len; i++) {
        f = fields[i]
        value[f] = this.mix(start.value[f], end.value[f], r)
      }
    } else if (field) {
      this.value[field] = this.mix(start.value, end.value, r)
    } else {
      this.value = this.mix(start.value, end.value, r)
    }

    if (handleUpdate) {
      handleUpdate(this.value)
    }
  }

  mix(v0, v1, r) {
    return r * (v1 - v0) + v0
  }

  onUpdate(cb) {
    this.handleUpdate = cb
    return this
  }

  onLoop(cb) {
    this.handleLoop = cb
    return this
  }

  onComplete(cb) {
    this.handleComplete = cb
    return this
  }

  onStop(cb) {
    this.handleStop = cb
    return this
  }

  destroy() {
    this.fields = null
    this.keys = null
    this.value = null
  }

  destroyWithPIXI(node) {
    this.destroyDetect = () => {
      if (node._destroyed) {
        this.destroy()
      }
    }
  }

  tick = (delta) => {
    this.escaped += delta
    this.update(this.escaped)
  }

  start() {
    this.escaped = 0
    this.tick(0)
    ticker.add(this.tick)
    return this
  }

  stop() {
    ticker.remove(this.tick)
    if (this.handleStop) this.handleStop()
    return this
  }
}

const curveFuncs = {
  stepped: function () {
    return 0
  },
  linear,
}
