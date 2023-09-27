import { Assets } from '@rubickjs/assets'
import { ImageTexture } from '@rubickjs/core'
import { defineProps } from '@rubickjs/shared'
import { Sprite } from './Sprite'
import type { Node2DStyle } from './Node2DStyle'

export interface Image {
  src: string
}

@defineProps({
  src: { internal: '_src', onUpdated: '_onUpdateSrc' },
})
export class Image extends Sprite<ImageTexture> {
  protected _srcLoad?: Promise<this>
  protected _src!: string

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
