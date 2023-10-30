import { Texture, customNode, property } from '@rubickjs/core'
import { Assets } from '@rubickjs/assets'
import { Node2d } from '../node2d'
import type { Node2dProperties } from '../node2d'

export interface Element2dProperties extends Node2dProperties {
  backgroundImage?: string
  borderRadius?: number
}

@customNode({
  tagName: 'element2d',
  renderable: true,
})
export class Element2d extends Node2d {
  @property() borderRadius?: number
  @property() backgroundImage?: string

  protected _backgroundImage?: Texture

  constructor(properties: Element2dProperties = {}) {
    super()
    this.setProperties(properties)
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
    this._drawFill()
  }

  protected _drawFill() {
    if (this.borderRadius) {
      this._context.roundRect(0, 0, this.width, this.height, this.borderRadius)
    } else {
      this._context.rect(0, 0, this.width, this.height)
    }
    this._context.fill()
  }
}
