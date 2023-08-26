import { IN_BROWSER, Ref } from '@rubickjs/shared'
import { Rectangle } from '@rubickjs/math'
import { LabelStyle, Texture } from '../resources'
import { Sprite } from './Sprite'
import type { ColorValue } from '@rubickjs/color'

export type FontWeight = 'normal' | 'bold' | 'lighter' | 'bolder' | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
export type FontStyle = 'normal' | 'italic' | 'oblique' | `oblique ${ string }`
export type FontKerning = 'auto' | 'none' | 'normal'
export type TextAlign = 'center' | 'end' | 'left' | 'right' | 'start'
export type TextBaseline = 'alphabetic' | 'bottom' | 'hanging' | 'ideographic' | 'middle' | 'top'
export type TextDecoration = 'underline' | 'line-through'

export class Label extends Sprite {
  /**
   * All characters in text
   *
   * boundingBox: Rectangle(x: 0 - 1, y: 0 - 1, width: 0 - 1, height: 0 - 1)
   */
  characters: Array<{
    value: string
    boundingBox: Rectangle
  }> = []

  protected _textTextureCanvas = IN_BROWSER
    ? document.createElement('canvas')
    : undefined

  protected _color = new Ref<ColorValue>('#000000')
  get color() { return this._color.value }
  set color(val) { this._color.value = val }

  protected _fontSize = new Ref(14)
  get fontSize() { return this._fontSize.value }
  set fontSize(val) { this._fontSize.value = val }

  protected _fontWeight = new Ref<FontWeight>('normal')
  get fontWeight() { return this._fontWeight.value }
  set fontWeight(val) { this._fontWeight.value = val }

  protected _fontFamily = new Ref('monospace')
  get fontFamily() { return this._fontFamily.value }
  set fontFamily(val) { this._fontFamily.value = val }

  protected _fontStyle = new Ref<FontStyle>('normal')
  get fontStyle() { return this._fontStyle.value }
  set fontStyle(val) { this._fontStyle.value = val }

  protected _fontKerning = new Ref<FontKerning>('normal')
  get fontKerning() { return this._fontKerning.value }
  set fontKerning(val) { this._fontKerning.value = val }

  protected _text = new Ref('')
  get text() { return this._text.value }
  set text(val) { this._text.value = String(val) }

  protected _textAlign = new Ref<TextAlign>('center')
  get textAlign() { return this._textAlign.value }
  set textAlign(val) { this._textAlign.value = val }

  protected _textBaseline = new Ref<TextBaseline>('middle')
  get textBaseline() { return this._textBaseline.value }
  set textBaseline(val) { this._textBaseline.value = val }

  protected _textDecoration = new Ref<TextDecoration | undefined>(undefined)
  get textDecoration() { return this._textDecoration.value }
  set textDecoration(val) { this._textDecoration.value = val }

  protected _direction = new Ref<'inherit' | 'ltr' | 'rtl'>('inherit')
  get direction() { return this._direction.value }
  set direction(val) { this._direction.value = val }

  /**
   * Style
   */
  protected override _style = new LabelStyle(this)

  constructor(text: string, style?: Record<string, any>) {
    super(Texture.EMPTY)

    const _onUpdate = this._onNeedsUpdateTextTexture.bind(this)
    this._color.on('update', _onUpdate)
    this._fontSize.on('update', _onUpdate)
    this._fontWeight.on('update', _onUpdate)
    this._fontFamily.on('update', _onUpdate)
    this._fontStyle.on('update', _onUpdate)
    this._fontKerning.on('update', _onUpdate)
    this._text.on('update', _onUpdate)
    this._textAlign.on('update', _onUpdate)
    this._textBaseline.on('update', _onUpdate)
    this._textDecoration.on('update', _onUpdate)
    this._direction.on('update', _onUpdate)

    this.text = text
    style && (this.style = style as any)
  }

  protected _onNeedsUpdateTextTexture() {
    this.addDirty('textTexture')
  }

  protected override _onUpdateSize() {
    super._onUpdateSize()
    this._onNeedsUpdateTextTexture()
  }

  protected _updateTextTexture() {
    if (!this._textTextureCanvas) {
      console.warn('Failed to _updateTextTexture')
      return
    }

    const context = this._textTextureCanvas.getContext('2d')

    if (!context) {
      console.warn('Failed to getContext(\'2d\') in _updateTextTexture')
      return
    }

    const fontSize = this.fontSize
    const font = `${ this.fontStyle } ${ this.fontWeight } ${ fontSize }px ${ this.fontFamily }`

    context.textBaseline = this.textBaseline
    context.textAlign = this.textAlign
    context.font = font

    const paragraphs = this.text
      .split(/[\r\n]+/)
      .map(text => ({
        text,
        x: 0,
        y: 0,
        width: context.measureText(text).width,
        height: fontSize * 1.2,
      }))

    const [textWidth, textHeight] = paragraphs
      .reduce((size, paragraph) => {
        size[0] = Math.max(size[0], paragraph.width)
        size[1] += paragraph.height
        return size
      }, [0, 0])

    const [rawWidth, rawHeight] = this.size

    const width = rawWidth <= 1 ? textWidth : rawWidth
    const height = rawHeight <= 1 ? textHeight : rawHeight

    context.canvas.width = width
    context.canvas.height = height
    context.strokeStyle = context.fillStyle = this.color as string
    context.lineWidth = 2
    context.direction = this.direction
    context.textAlign = this.textAlign
    context.textBaseline = this.textBaseline
    context.font = font
    context.fontKerning = this.fontKerning
    context.clearRect(0, 0, width, height)

    let y = 0
    paragraphs.forEach(paragraph => {
      const fillPosition = [0, 0]

      switch (context.textAlign) {
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

      switch (context.textBaseline) {
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

      switch (this.textDecoration) {
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

    this.setTexture(new Texture(context.canvas))

    // calc characters bbox
    this.characters.length = 0
    paragraphs.forEach(paragraph => {
      let offsetX = 0
      for (const char of paragraph.text) {
        const charWidth = context.measureText(char).width || fontSize
        const charHeight = fontSize * 1.2
        const boundingBox = new Rectangle(
          paragraph.x + offsetX,
          paragraph.y / textHeight,
          charWidth / textWidth,
          charHeight / textHeight,
        )
        offsetX += boundingBox.width
        if (char.trim()) {
          this.characters.push({
            value: char,
            boundingBox,
          })
        }
      }
    })
  }

  override process(delta: number) {
    if (this.hasDirty('textTexture')) {
      this.deleteDirty('textTexture')
      this._updateTextTexture()
    }

    super.process(delta)
  }
}
