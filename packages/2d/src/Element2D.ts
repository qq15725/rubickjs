import { Texture, customNode, property } from '@rubickjs/core'
import { Assets } from '@rubickjs/assets'
import { Transform2D } from '@rubickjs/math'
import { Node2D } from './Node2D'
import type { Node2DProperties } from './Node2D'

export interface Element2DProperties extends Node2DProperties {
  backgroundImage?: string
  borderRadius?: number
}

@customNode({
  tagName: 'Element2D',
  renderable: true,
})
export class Element2D extends Node2D {
  @property() borderRadius?: number
  @property() backgroundImage?: string

  protected _backgroundImage?: Texture

  constructor(properties?: Element2DProperties) {
    super()
    properties && this.setProperties(properties)
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any) {
    super._onUpdateProperty(key, value, oldValue)

    switch (key) {
      case 'backgroundImage':
        this._loadBackgroundImage(value)
        break
      case 'borderRadius':
        this.requestRedraw()
        break
    }
  }

  protected async _loadBackgroundImage(src: string): Promise<void> {
    const texture = await Assets.load(src)
    if (!(texture instanceof Texture)) return
    this._backgroundImage = texture
    this.requestRedraw()
  }

  protected override _draw(): void {
    super._draw()
    this._drawBackgroundImage()
    this._drawContent()
  }

  protected _drawBackgroundImage(): void {
    const texture = this._backgroundImage
    if (!texture?.valid) return
    this._context.texture = texture
    this._context.textureTransform = new Transform2D().scale(
      this.width! / texture.width,
      this.height! / texture.height,
    )
    this._drawRect()
  }

  protected _drawContent() {
    this._drawRect()
  }

  protected _drawRect() {
    if (this.borderRadius) {
      this._context.roundRect(0, 0, this.width, this.height, this.borderRadius)
    } else {
      this._context.rect(0, 0, this.width, this.height)
    }
    this._context.fill()
  }
}
