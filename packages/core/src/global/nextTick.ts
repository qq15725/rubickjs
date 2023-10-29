import { GlobalTicker } from './GlobalTicker'

export async function nextTick(cb?: () => void): Promise<void> {
  return new Promise(resolve => {
    GlobalTicker.on(
      () => {
        cb?.()
        resolve()
      },
      { sort: 1, once: true },
    )
  })
}
