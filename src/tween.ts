//@ts-ignore
import { Timeline } from './timeline'
import ticker from './ticker'
import { linear } from './easing'

export const tween = (props: any) => {
  const value = {}
  const { duration, fromVal, toVal, ease = linear, loop = 0 } = props
  const keys = [
    { time: 0, value: fromVal, curve: ease },
    { time: duration, value: toVal },
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
