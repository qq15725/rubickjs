import { Resource } from './Resource'

export class Ticker extends Resource {
  static instance = new Ticker()

  lastTime = 0
  elapsed = 0

  protected _requestId?: number

  constructor() {
    super()

    this.start()
  }

  protected _tick = (time: number) => {
    this.elapsed = time - this.lastTime
    this.lastTime = time
    this._requestId = requestAnimationFrame(this._tick)
    this.emit('update', time)
  }

  start() {
    this.lastTime = performance.now()
    this._requestId = requestAnimationFrame(this._tick)
  }

  stop() {
    if (this._requestId) {
      cancelAnimationFrame(this._requestId)
      this._requestId = undefined
    }
  }
}
