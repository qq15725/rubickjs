import { Ref } from '@rubickjs/shared'
import { Resource } from './Resource'
import { Ticker } from './Ticker'

export abstract class MainLoop extends Resource {
  /** FPS */
  protected _fps = new Ref(60)
  get fps() { return this._fps.value }
  set fps(val) { this._fps.value = val }

  /** SPF */
  protected _spf!: number
  protected _nextTime = 0

  /** The speed with which time passes */
  protected _speed = new Ref(1)
  get speed() { return this._speed.value }
  set speed(val) { this._speed.value = val }

  protected _process?: (delta: number) => void

  protected _starting = false
  get starting() { return this._starting }

  constructor() {
    super()

    this._onUpdateFps(this._fps.value)
    this._fps.on('update', this._onUpdateFps)
  }

  protected _onUpdateFps = (val: number) => {
    this._spf = val ? Math.floor(1000 / val) : 0
  }

  protected _onNextTick = () => {
    const elapsed = Ticker.instance.elapsed * this._speed.value
    const time = this._nextTime -= elapsed
    if (time <= 0) {
      this._process?.((this._nextTime = this._spf) || elapsed)
    }
  }

  startLoop(process: (delta: number) => void) {
    if (!this._starting) {
      this._starting = true
      this._process = process
      Ticker.instance.on('update', this._onNextTick)
    }
  }

  stopLoop() {
    if (this._starting) {
      this._starting = false
      Ticker.instance.off('update', this._onNextTick)
    }
  }
}
