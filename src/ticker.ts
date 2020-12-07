class Ticker {
  listeners = []
  listenersIn = []
  listenersOut = []

  started = false
  reqId = -1
  t0 = 0

  start() {
    if (this.started) return
    this.started = true
    this.t0 = performance.now()
    this.reqId = requestAnimationFrame(this.tick)
  }

  stop() {
    this.started = false
    if (this.reqId > 0) {
      cancelAnimationFrame(this.reqId)
    }
  }

  tick = (t: number) => {
    const { t0, listeners, listenersIn, listenersOut } = this
    if (listenersIn.length > 0) {
      listeners.push(...listenersIn)
      listenersIn.length = 0
    }

    if (listenersOut.length > 0) {
      for (var i = 0, len = listenersOut.length; i < len; i++) {
        const index = listeners.indexOf(listenersOut[i])
        if (index < 0) continue
        listeners.splice(index, 1)
      }
      listenersOut.length = 0
    }

    if (listeners.length === 0) {
      return this.stop()
    }

    this.t0 = t
    const delta = t - t0
    for (var i = 0, len = listeners.length; i < len; i++) {
      listeners[i](delta)
    }
    requestAnimationFrame(this.tick)
  }

  add(handler: Function) {
    this.listenersIn.push(handler)
    if (!this.started) {
      this.start()
    }
  }

  remove(handler: Function) {
    this.listenersOut.push(handler)
  }
}

const ticker = new Ticker()
export default ticker
