import { BaseObject } from './BaseObject'

export class Ticker extends BaseObject {
  static instance = new Ticker()

  currentTime = 0
  elapsed = 0

  protected _requestId?: number

  constructor() {
    super()

    this.start()
  }

  protected _onTick = (time: number) => {
    this.elapsed = time - this.currentTime
    this.currentTime = time
    this._requestId = requestAnimationFrame(this._onTick)
    this.emit('update', time)
  }

  start() {
    this.currentTime = performance.now()
    this._requestId = requestAnimationFrame(this._onTick)
  }

  stop() {
    if (this._requestId) {
      cancelAnimationFrame(this._requestId)
      this._requestId = undefined
    }
  }
}
