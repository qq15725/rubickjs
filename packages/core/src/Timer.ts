import { Node } from './Node'

export class Timer extends Node {
  currentTime = 0

  protected _endTime = Number.MAX_SAFE_INTEGER
  get endTime() { return this._endTime }
  set endTime(val) { this._endTime = val || Number.MAX_SAFE_INTEGER }

  protected _startTime = 0
  get startTime() { return this._startTime }
  set startTime(val) { this._startTime = Math.min(val, this._endTime) }

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

  addTime(delta: number): number {
    const endTime = this._endTime
    let time = this.currentTime
    time += delta
    if (this.loop) {
      if (time > endTime) {
        time = (time % endTime) + this.startTime
      }
    } else {
      time = Math.min(time, endTime)
    }
    this.currentTime = time
    this.emit('update', time, delta)
    return time
  }
}
