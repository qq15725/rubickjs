import { clamp } from '@rubickjs/math'
import { Node } from './Node'
import { customNode } from './decorators'

@customNode('timer')
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

  protected _addTime(delta: number): number {
    const startTime = this.startTime
    const endTime = this.endTime
    let time = this.currentTime
    time += delta
    if (this.loop) {
      if (time > endTime) {
        time = (time % endTime) + startTime
      }
    }
    time = clamp(startTime, time, endTime)
    this.currentTime = time
    this.emit('update', time, delta)
    return time
  }

  protected _process(delta: number) {
    super._process(delta)
    this._addTime(delta)
  }
}
