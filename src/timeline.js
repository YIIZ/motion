// keys: [{ time: 0, value: { x, y } }]

export class Timeline {
  constructor(value, keys, meta) {
    Object.assign(this, meta)
    this.value = value
    this.keys = keys
    this.callbacks = []
    if (value !== 'number' && keys && keys.length > 0) {
      this.fields = Object.keys(keys[0].value)
    }
  }

  update(time) {
    const { keys } = this
    const endAt = keys.findIndex(p => p.time > time)

    if (endAt === 0) return this.begain()
    if (endAt < 0) return this.end()

    const start = keys[endAt - 1]
    const end = keys[endAt]
    this.interpolate(time, start, end)
  }

  begain() {
    this.isBegin = true
    this.isEnd = false
    const k = this.keys[0]
    this.interpolate(0, k, k)
  }

  end() {
    this.isBegin = false
    this.isEnd = true
    const k = this.keys[this.keys.length - 1]
    this.interpolate(0, k, k)
  }

  interpolate(t, start, end) {
    const { curve } = start

    const t0 = start.time
    const t1 = end.time
    const d = t1 - t0
    const r = d === 0 ? 0 : curve((t - t0)/(t1 - t0))

    if (!this.fields || this.fields.length === 0) {
      this.value = this.mix(start.value, end.value, r)
    } else {
      this.fields.forEach(f => {
        this.value[f] = this.mix(start.value[f], end.value[f], r)
      })
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
