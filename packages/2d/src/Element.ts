import { Texture, customNode, property } from '@rubickjs/core'
import { Assets } from '@rubickjs/assets'
import { Transform2D } from '@rubickjs/math'
import { Node2D } from './Node2D'
import type { Node2DOptions } from './Node2D'

export interface ElementOptions extends Node2DOptions {
  draggable?: boolean
}

@customNode({
  tag: 'element',
  renderable: true,
})
export class Element extends Node2D {
  @property() draggable?: boolean

  protected _backgroundImage?: Texture

  constructor(options?: ElementOptions) {
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
    this.context.fillStyle = texture
    this.context.textureTransform = new Transform2D().scale(
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
      this.context.roundRect(0, 0, this.style.width, this.style.height, this.style.borderRadius)
    } else {
      this.context.rect(0, 0, this.style.width, this.style.height)
    }
    this.context.fill()
  }
}
