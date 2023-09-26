import { defineProxiedProp } from '@rubickjs/shared'
import { Resource } from './Resource'
import { Ticker } from './Ticker'

export abstract class MainLoop extends Resource {
  /** FPS */
  protected _fps?: number
  @defineProxiedProp({ on: '_onUpdateFps' })
  public fps?: number

  /** SPF */
  protected _spf?: number

  /** Speed */
  protected _speed = 1
  @defineProxiedProp({ on: '_onUpdateSpeed' })
  public speed!: number

  /** Starting */
  protected _starting = false
  get starting() { return this._starting }

  /** Process */
  processDeltaTime = 0
  protected _nextProcessDeltaTime = 0
  protected _process?: (delta: number) => void

  protected _onUpdateSpeed(_val: number, _oldVal: number): void { /** override */ }
  protected _onUpdateFps(val: number | undefined, _oldVal: number | undefined): void {
    this._spf = val ? Math.floor(1000 / val) : undefined
  }

  startLoop(process: (delta: number) => void) {
    if (!this._starting) {
      this._starting = true
      this._process = process
      Ticker.instance.on('update', this._onTick)
    }
  }

  stopLoop() {
    if (this._starting) {
      this._starting = false
      Ticker.instance.off('update', this._onTick)
    }
  }

  protected _onTick = () => {
    const elapsed = Ticker.instance.elapsed * this._speed
    const time = this._nextProcessDeltaTime -= elapsed
    if (time <= 0) {
      const delta = (this._nextProcessDeltaTime = this._spf || 0) || elapsed
      this.processDeltaTime = delta
      this._process?.(delta)
    }
  }
}
