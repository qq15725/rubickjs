import { property } from './decorators'
import { Resource } from './Resource'
import { GlobalTicker } from './global'

export abstract class MainLoop extends Resource {
  @property() fps!: number

  protected _spf?: number
  speed = 1

  /** Starting */
  protected _starting = false
  get starting() { return this._starting }

  /** Process */
  deltaTime = 0
  protected _nextDeltaTime = 0
  protected _process?: (delta: number) => void

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any) {
    super._onUpdateProperty(key, value, oldValue)

    switch (key) {
      case 'fps':
        this._spf = value ? Math.floor(1000 / value) : undefined
        break
    }
  }

  startLoop(process: (delta: number) => void) {
    if (!this._starting) {
      this._starting = true
      this._process = process
      GlobalTicker.on(this._onNextTick, { sort: 0 })
    }
  }

  stopLoop() {
    if (this._starting) {
      this._starting = false
      GlobalTicker.off(this._onNextTick, { sort: 0 })
    }
  }

  private _onNextTick = () => {
    const elapsed = GlobalTicker.elapsed * this.speed
    const time = this._nextDeltaTime -= elapsed
    if (time <= 0) {
      const delta = (this._nextDeltaTime = this._spf || 0) || elapsed
      this.deltaTime = delta
      this._process?.(delta)
    }
  }
}
