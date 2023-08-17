import { Resouce } from './Resouce'

export abstract class MainLoop extends Resouce {
  /**
   * Main loop UID
   */
  protected _loopId = 0

  /**
   * Start main loop
   */
  startLoop(fps: number, process?: (delta: number) => void) {
    process = process ?? this.process
    const spf = 1000 / fps
    const id = ++this._loopId
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    let startTime = 0
    requestAnimationFrame(function loop(now: number) {
      if (!startTime) startTime = now
      if (id !== self._loopId) return
      requestAnimationFrame(loop)
      const elapsed = ~~(now - startTime)
      if (elapsed < spf) return
      startTime = now
      process?.(elapsed)
    })
  }

  /**
   * Stop main loop
   */
  stopLoop() {
    ++this._loopId
  }

  /**
   * Process each frame
   *
   * @param delta
   */
  abstract process(delta: number): void
}
