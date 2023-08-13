import { uid } from '@rubickjs/shared'
import { Resouce } from './Resouce'

export abstract class MainLoop extends Resouce {
  /**
   * Main loop UID
   */
  protected loopId?: number

  /**
   * Start main loop
   */
  startLoop(fps: number, process?: (delta: number) => void) {
    const spf = 1000 / fps
    const id = this.loopId = uid()
    let then = 0

    const loop = (now: number) => {
      if (id !== this.loopId) {
        return
      }
      requestAnimationFrame(loop)
      const delta = ~~(now - then)
      if (delta < spf) {
        return
      }
      then = now
      ;(process ?? this.process)(delta)
    }

    requestAnimationFrame(now => {
      then = now
      requestAnimationFrame(loop)
    })
  }

  /**
   * Stop main loop
   */
  stopLoop() {
    this.loopId = undefined
  }

  /**
   * Process each frame
   *
   * @param delta
   */
  abstract process(delta: number): void
}
