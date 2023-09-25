import { Assets } from '@rubickjs/assets'
import { ImageTexture } from '@rubickjs/core'
import { Sprite } from './Sprite'
import type { Node2DStyle } from './Node2DStyle'

export class Image extends Sprite<ImageTexture> {
  protected _srcLoad?: Promise<this>
  protected _src!: string
  get src() { return this._src }
  set src(val) { this._updateProp('_src', val, { on: '_onUpdateSrc' }) }

  constructor(
    src = '',
    style?: Partial<Node2DStyle>,
  ) {
    super()
    this.src = src
    if (style) this.style = style
  }

  protected _onUpdateSrc() {
    this.load(true)
  }

  async load(force = false): Promise<this> {
    const src = this._src

    if (!src) {
      return this
    }

    if (force || !this._srcLoad) {
      this._srcLoad = Assets.load(src).then(texture => {
        this._srcLoad = undefined
        if (src === this._src && texture instanceof ImageTexture) {
          this.texture = texture
        }
        return this
      })
    }

    return this._srcLoad
  }
}
