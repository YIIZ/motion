//@ts-ignore
import { Timeline } from './timeline'
import ticker from './ticker'
import { linear } from './easing'

export const tween = (props: any) => {
  const value = {}
  const { duration, from, to, ease = linear, loop = 0 } = props
  const keys = [
    { time: 0, value: from, curve: ease },
    { time: duration, value: to },
  ]

  return new Timeline(value, keys, { loop })
}

export const yoyo = (props: any) => {
  const value = {}
  const { duration, from, to, ease = linear, ratio = 0.5, loop = 0 } = props
  const keys = [
    { time: 0, value: from, curve: ease },
    { time: duration * ratio, value: to, curve: ease },
    { time: duration * (1 - ratio), value: from },
  ]

  return new Timeline(value, keys, { loop })
}

export const delay = (time: number) => {
  return new Promise((resolve) => {
    let escaped = 0
    const loop = (delta: number) => {
      escaped += delta
      if (escaped > time) {
        ticker.remove(loop)
        resolve()
      }
    }
    ticker.add(loop)
  })
}

export const everyFrame = (handler: Function) => {
  let escaped = 0
  const loop = (delta: number) => {
    handler(escaped, delta)
  }
  ticker.add(loop)
  return {
    stop: () => {
      ticker.remove(loop)
    },
  }
}
