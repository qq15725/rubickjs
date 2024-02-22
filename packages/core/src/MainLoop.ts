import { property } from './decorators'
import { Resource } from './Resource'
import { GlobalTicker } from './global'

export abstract class MainLoop extends Resource {
  @property() declare fps: number

  protected _spf?: number
  speed = 1

  protected _starting = false
  get starting() { return this._starting }

  deltaTime = 0
  protected _nextDeltaTime = 0
  protected _process?: (delta: number) => void

  constructor() {
    super()
    this._onNextTick = this._onNextTick.bind(this)
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any) {
    super._onUpdateProperty(key, value, oldValue)

    switch (key) {
      case 'fps':
        this._spf = value ? Math.floor(1000 / value) : undefined
        break
    }
  }

  start(process: (delta: number) => void) {
    if (!this._starting) {
      this._starting = true
      this._process = process
      GlobalTicker.on(this._onNextTick, { sort: 0 })
    }
  }

  stop() {
    if (this._starting) {
      this._starting = false
      GlobalTicker.off(this._onNextTick, { sort: 0 })
    }
  }

  protected _onNextTick() {
    const elapsed = GlobalTicker.elapsed * this.speed
    const time = this._nextDeltaTime -= elapsed
    if (time <= 0) {
      const delta = (this._nextDeltaTime = this._spf || 0) || elapsed
      this.deltaTime = delta
      this._process?.(delta)
    }
  }
}
