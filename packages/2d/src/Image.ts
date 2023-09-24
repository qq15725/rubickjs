import { Assets } from '@rubickjs/assets'
import { ImageTexture } from '@rubickjs/core'
import { Sprite } from './Sprite'

export class Image extends Sprite<ImageTexture> {
  protected _srcLoad?: Promise<this>
  protected _src!: string
  get src() { return this._src }
  set src(val) {
    if (this._src !== val) {
      this._src = val
      this.load(true)
    }
  }

  constructor(src = '') {
    super()
    this.src = src
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
