import { IN_BROWSER, defineProxiedProp } from '@rubickjs/shared'
import { Texture } from '@rubickjs/core'
import { TextStyle } from './TextStyle'
import { Sprite } from './Sprite'
import type { ColorValue } from '@rubickjs/color'

export type FontWeight = 'normal' | 'bold' | 'lighter' | 'bolder' | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
export type FontStyle = 'normal' | 'italic' | 'oblique' | `oblique ${ string }`
export type FontKerning = 'auto' | 'none' | 'normal'
export type TextWrap = 'wrap' | 'nowrap'
export type TextAlign = 'center' | 'end' | 'left' | 'right' | 'start'
export type TextBaseline = 'alphabetic' | 'bottom' | 'hanging' | 'ideographic' | 'middle' | 'top'
export type TextDecoration = 'underline' | 'line-through'

export interface TextParagraph extends TextChar {
  chars: Array<TextChar>
}

export interface TextChar {
  x: number
  y: number
  width: number
  height: number
  text: string
}

export class Text extends Sprite<Texture<HTMLCanvasElement>> {
  /** Pixel ratio */
  protected _pixelRatio = 2
  @defineProxiedProp({ on: 'scheduleUpdateTexture' })
  public pixelRatio!: number

  protected _color: ColorValue = '#000000'
  @defineProxiedProp({ on: 'scheduleUpdateTexture' })
  public color!: ColorValue

  protected _fontSize = 14
  @defineProxiedProp({ on: 'scheduleUpdateTexture' })
  public fontSize!: number

  protected _fontWeight: FontWeight = 'normal'
  @defineProxiedProp({ on: 'scheduleUpdateTexture' })
  public fontWeight!: FontWeight

  protected _fontFamily = 'monospace'
  @defineProxiedProp({ on: 'scheduleUpdateTexture' })
  public fontFamily!: string

  protected _fontStyle: FontStyle = 'normal'
  @defineProxiedProp({ on: 'scheduleUpdateTexture' })
  public fontStyle!: FontStyle

  protected _fontKerning: FontKerning = 'normal'
  @defineProxiedProp({ on: 'scheduleUpdateTexture' })
  public fontKerning!: FontKerning

  protected _text = ''
  @defineProxiedProp({ on: 'scheduleUpdateTexture' })
  public text!: string

  protected _textWrap: TextWrap = 'wrap'
  @defineProxiedProp({ on: 'scheduleUpdateTexture' })
  public textWrap!: TextWrap

  protected _textAlign: TextAlign = 'center'
  @defineProxiedProp({ on: 'scheduleUpdateTexture' })
  public textAlign!: TextAlign

  protected _textBaseline: TextBaseline = 'middle'
  @defineProxiedProp({ on: 'scheduleUpdateTexture' })
  public textBaseline!: TextBaseline

  protected _textDecoration: TextDecoration | undefined = undefined
  @defineProxiedProp({ on: 'scheduleUpdateTexture' })
  public textDecoration!: TextDecoration | undefined

  protected _direction: 'inherit' | 'ltr' | 'rtl' = 'inherit'
  @defineProxiedProp({ on: 'scheduleUpdateTexture' })
  public direction!: 'inherit' | 'ltr' | 'rtl'

  /** Style */
  protected override _style = new TextStyle(this)
  get style(): TextStyle { return this._style }
  set style(val: Partial<TextStyle>) { this._style.update(val) }

  constructor(
    text: string,
    style?: Partial<TextStyle>,
  ) {
    const canvas = document.createElement('canvas')
    canvas.width = 0
    canvas.height = 0
    super(
      IN_BROWSER
        ? new Texture(canvas)
        : undefined,
    )
    this.text = text
    if (style) this.style = style
  }

  protected override _onUpdateSize() {
    super._onUpdateSize()
    this.scheduleUpdateTexture()
  }

  scheduleUpdateTexture() { this.addDirty('texture') }

  measure(width = 0) {
    const context = this._texture.source.getContext('2d')
    if (!context) {
      throw new Error('Failed to measureText')
    }
    context.textBaseline = this._textBaseline
    context.textAlign = this._textAlign
    context.font = `${ this._fontStyle } ${ this._fontWeight } ${ this._fontSize }px ${ this._fontFamily }`

    const charHeight = this._fontSize * 1.2
    const paragraphs: Array<TextParagraph> = []
    let chars: Array<TextChar> = []
    let offsetX = 0
    let offsetY = 0

    const addParagraph = () => {
      paragraphs.push({
        x: offsetX,
        y: offsetY,
        width: chars.reduce((width, char) => width + char.width, 0),
        height: charHeight,
        text: chars.reduce((text, char) => text + char.text, ''),
        chars,
      })
      offsetX = 0
      offsetY += charHeight
      chars = []
    }

    this.text.split(/[\r\n]+/).forEach(text => {
      for (const char of text) {
        const charWidth = context.measureText(char).width || this._fontSize
        if (this._textWrap === 'wrap' && width && offsetX + charWidth > width) {
          addParagraph()
        }
        chars.push({
          text: char,
          x: offsetX,
          y: offsetY,
          width: charWidth,
          height: charHeight,
        })
        offsetX += charWidth
      }
      addParagraph()
    })

    if (chars.length) {
      addParagraph()
    }

    return {
      paragraphs,
      ...paragraphs.reduce((size, paragraph) => {
        size.width = Math.max(size.width, paragraph.width)
        size.height += paragraph.height
        return size
      }, { width: 0, height: 0 }),
    }
  }

  protected _fillText(
    paragraphs: Array<TextParagraph>,
    width: number,
    height: number,
    textHeight: number,
    y = 0,
  ) {
    const context = this._texture.source.getContext('2d')
    if (!context) {
      throw new Error('Failed to measureText')
    }
    paragraphs.forEach(paragraph => {
      const fillPosition = [0, 0]

      switch (this._textAlign) {
        case 'start':
        case 'left':
          paragraph.x = 0
          fillPosition[0] = 0
          break
        case 'center':
          paragraph.x = (width - paragraph.width) / 2
          fillPosition[0] = width / 2
          break
        case 'end':
        case 'right':
          paragraph.x = width - paragraph.width
          fillPosition[0] = width
          break
      }

      switch (this._textBaseline) {
        case 'top':
        case 'hanging':
          paragraph.y = y
          fillPosition[1] = y
          break
        case 'middle':
        case 'alphabetic':
        case 'ideographic':
          paragraph.y = y + (height - textHeight) / 2
          fillPosition[1] = paragraph.y + paragraph.height / 2
          break
        case 'bottom':
          paragraph.y = y + height - textHeight
          fillPosition[1] = paragraph.y + paragraph.height
          break
      }

      context.fillText(paragraph.text, fillPosition[0], fillPosition[1])

      switch (this._textDecoration) {
        case 'underline':
          context.beginPath()
          context.moveTo(paragraph.x, paragraph.y + paragraph.height - 2)
          context.lineTo(paragraph.x + paragraph.width, paragraph.y + paragraph.height - 2)
          context.stroke()
          break
        case 'line-through':
          context.beginPath()
          context.moveTo(paragraph.x, paragraph.y + paragraph.height / 2)
          context.lineTo(paragraph.x + paragraph.width, paragraph.y + paragraph.height / 2)
          context.stroke()
          break
      }

      y += paragraph.height
    })
    return y
  }

  updateTexture() {
    if (!this.hasDirty('texture')) return
    this.deleteDirty('texture')

    const canvas = this._texture.source

    const context = canvas.getContext('2d')
    if (!context) {
      console.warn('Failed to getContext(\'2d\') in updateTexture')
      return
    }

    let [width, height] = this.size
    const { paragraphs, width: textWidth, height: textHeight } = this.measure(width)
    if (!width) width = textWidth
    if (!height) height = textHeight

    canvas.style.width = `${ width }px`
    canvas.style.height = `${ height }px`
    canvas.dataset.width = String(width)
    canvas.dataset.height = String(height)
    canvas.width = Math.max(1, Math.floor(width * this._pixelRatio))
    canvas.height = Math.max(1, Math.floor(height * this._pixelRatio))
    context.strokeStyle = context.fillStyle = this._color as string
    context.lineWidth = 2
    context.direction = this._direction
    context.textAlign = this._textAlign
    context.textBaseline = this._textBaseline
    context.font = `${ this._fontStyle } ${ this._fontWeight } ${ this._fontSize }px ${ this._fontFamily }`
    context.fontKerning = this._fontKerning

    context.scale(this._pixelRatio, this._pixelRatio)
    context.clearRect(0, 0, canvas.width, canvas.height)

    this._fillText(
      paragraphs,
      width,
      height,
      textHeight,
    )

    this._texture.updateSource()
    this.size.update(width, height)
  }

  protected override _process(delta: number) {
    this.updateTexture()
    super._process(delta)
  }
}
