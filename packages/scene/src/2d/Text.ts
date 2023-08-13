import { Rectangle } from '@rubickjs/math'
import { IN_BROWSER } from '@rubickjs/shared'
import { Texture } from '../resources'
import { Sprite } from './Sprite'
import type { ColorValue } from '@rubickjs/math'

export interface TextStyle {
  color?: ColorValue
  fontSize?: number
  fontWeight?: number
  fontFamily?: string
  fontKerning?: CanvasFontKerning
  direction?: CanvasDirection
  textAlign?: CanvasTextAlign
  textBaseline?: CanvasTextBaseline
}

export class Text extends Sprite {
  protected _canvas?: HTMLCanvasElement

  text: string
  color: ColorValue
  fontSize: number
  fontWeight: number
  fontFamily: string
  fontKerning: CanvasFontKerning
  direction: CanvasDirection
  textAlign: CanvasTextAlign
  textBaseline: CanvasTextBaseline

  /**
   * All characters in text
   *
   * boundingBox: Rectangle(x: 0 - 1, y: 0 - 1, width: 0 - 1, height: 0 - 1)
   */
  characters: Array<{
    value: string
    boundingBox: Rectangle
  }> = []

  constructor(text: string, style?: TextStyle) {
    super(Texture.EMPTY)
    this.text = text
    this.color = style?.color ?? 'black'
    this.fontSize = style?.fontSize ?? 14
    this.fontWeight = style?.fontWeight ?? 400
    this.fontFamily = style?.fontFamily ?? 'monospace'
    this.fontKerning = style?.fontKerning ?? 'normal'
    this.direction = style?.direction ?? 'inherit'
    this.textAlign = style?.textAlign ?? 'center'
    this.textBaseline = style?.textBaseline ?? 'middle'

    if (IN_BROWSER) {
      this._canvas = document.createElement('canvas')
    }

    this.updateTexture()
  }

  protected _onUpdateSize() {
    if (this.fontSize) {
      const { x: width } = this.size
      const { x: textureWidth } = this.texture.size

      const fontSize = Math.round(this.fontSize * width / textureWidth)

      if (this.fontSize !== fontSize) {
        this.fontSize = fontSize
        this.updateTexture()
      }
    }

    super._onUpdateSize()
  }

  updateTexture() {
    if (!this._canvas) {
      console.warn('Failed to updateTexture')
      return
    }

    const context = this._canvas.getContext('2d')

    if (!context) {
      console.warn('Failed to getContext(\'2d\') in updateTexture')
      return
    }

    const fontSize = this.fontSize
    const font = `${ this.fontWeight } ${ fontSize }px ${ this.fontFamily }`

    context.textBaseline = this.textBaseline
    context.textAlign = this.textAlign
    context.font = font

    let width = 0
    let height = 0
    let offsetY = 0
    const rows = this.text.split(/[\r\n]+/).map(text => {
      const rowWidth = context.measureText(text).width
      const rowHeight = fontSize * 1.2
      const y = offsetY
      offsetY += rowHeight
      width = Math.max(width, rowWidth)
      height += rowHeight
      return {
        text,
        x: 0,
        y,
        height: rowHeight,
        width: rowWidth,
      }
    })

    this.characters.length = 0
    for (const i in rows) {
      const row = rows[i]

      let offsetX = 0
      for (const char of row.text) {
        const charWidth = context.measureText(char).width || fontSize
        const charHeight = fontSize * 1.2
        const boundingBox = new Rectangle(
          offsetX,
          row.y / height,
          charWidth / width,
          charHeight / height,
        )

        offsetX += boundingBox.width

        if (char.trim()) {
          this.characters.push({
            value: char,
            boundingBox,
          })
        }
      }
    }

    context.canvas.width = width
    context.canvas.height = height
    context.fillStyle = this.color as string
    context.direction = this.direction
    context.textAlign = this.textAlign
    context.textBaseline = this.textBaseline
    context.font = font
    context.fontKerning = this.fontKerning
    context.clearRect(0, 0, width, height)
    rows.forEach(row => {
      context.fillText(row.text, row.x + width / 2, row.y + row.height / 2)
    })

    this.setTexture(new Texture(context.canvas))
  }
}
