import { Resouce } from '../main/Resouce'

export class Timeline extends Resouce {
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

  /**
   * Enable loop
   */
  loop = false

  constructor(range: number | null | Array<number> = null, loop = false) {
    super()
    if (Array.isArray(range)) {
      this.startTime = range[0]
      this.endTime = range[1] ?? Number.MAX_SAFE_INTEGER
    } else {
      this.endTime = range ?? Number.MAX_SAFE_INTEGER
    }
    this.loop = loop
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
  }
}
