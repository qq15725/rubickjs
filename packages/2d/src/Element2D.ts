import { Texture, customNode } from '@rubickjs/core'
import { Assets } from '@rubickjs/assets'
import { Transform2D } from '@rubickjs/math'
import { Node2D } from './Node2D'
import type { Node2DOptions } from './Node2D'

export interface Element2DOptions extends Node2DOptions {
  //
}

@customNode({
  tag: 'element2D',
  renderable: true,
})
export class Element2D extends Node2D {
  protected _backgroundImage?: Texture

  constructor(options?: Element2DOptions) {
    super()
    options && this.setProperties(options)
  }

  protected override _onUpdateStyleProperty(key: PropertyKey, value: any, oldValue: any) {
    super._onUpdateStyleProperty(key, value, oldValue)

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
      this.style.width / texture.width,
      this.style.height / texture.height,
    )
    this._drawRect()
  }

  protected _drawContent() {
    this._drawRect()
  }

  protected _drawRect() {
    if (this.style.borderRadius) {
      this._context.roundRect(0, 0, this.style.width, this.style.height, this.style.borderRadius)
    } else {
      this._context.rect(0, 0, this.style.width, this.style.height)
    }
    this._context.fill()
  }
}
