import { Texture, customNode, property } from '@rubickjs/core'
import { Transform2D } from '@rubickjs/math'
import { Node2d } from '../Node2D'
import { Assets } from '@rubickjs/assets'
import type { Node2dOptions } from '../Node2D'

export interface Element2dOptions extends Node2dOptions {
  borderRadius?: number
  backgroundImage?: string
}

@customNode('element2d')
export class Element2d extends Node2d {
  @property() borderRadius?: number
  @property() backgroundImage?: string

  protected _backgroundImage?: Texture

  constructor(options: Element2dOptions = {}) {
    super()
    this.setProperties(options)
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any) {
    super._onUpdateProperty(key, value, oldValue)

    switch (key) {
      case 'backgroundImage':
        this._loadBackgroundImage(value)
        break
    }
  }

  protected async _loadBackgroundImage(src: string): Promise<void> {
    const texture = await Assets.load(src)
    if (texture instanceof Texture) {
      this._backgroundImage = texture
      this._requestRepaint()
    }
  }

  protected override _draw(): void {
    super._draw()
    if (this.width && this.height) {
      this._drawBackgroundImage()
      this._drawFill()
    }
  }

  protected _drawBackgroundImage() {
    const backgroundImage = this._backgroundImage
    if (backgroundImage) {
      this._context.texture = backgroundImage
      this._context.textureTransform = new Transform2D().scale(
        this.width! / backgroundImage.width,
        this.height! / backgroundImage.height,
      )
    }
  }

  protected _drawFill() {
    const x = 0
    const y = 0
    const { width = 0, height = 0 } = this
    if (this.borderRadius) {
      this._context.roundRect(x, y, width, height, this.borderRadius)
    } else {
      this._context.rect(x, y, width, height)
    }
    this._context.fill()
  }
}
