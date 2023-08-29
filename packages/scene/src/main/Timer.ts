import { Node } from './Node'

export class Timer extends Node {
  /**
   * Start time
   */
  startTime = 0

  /**
   * End time
   */
  endTime: number

  /**
   * Current time
   */
  currentTime = 0

  constructor(
    range: number | null | Array<number> = null,
    public loop = false,
  ) {
    super()

    ;(
      [
        this.startTime = 0,
        this.endTime = Number.MAX_SAFE_INTEGER,
      ] = range
        ? Array.isArray(range)
          ? range
          : [0, range]
        : []
    )
  }

  /**
   * Add delta time to current time
   *
   * @param delta
   */
  addTime(delta: number) {
    let time = this.currentTime
    time += delta
    if (this.loop) {
      if (time > this.endTime) {
        time = (time % this.endTime) + this.startTime
      }
    } else {
      time = Math.min(time, this.endTime)
    }
    this.currentTime = time
    this.emit('update', delta)
  }
}
