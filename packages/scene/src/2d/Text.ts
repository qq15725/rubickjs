import { Rectangle } from '@rubickjs/math'
import { IN_BROWSER, Ref } from '@rubickjs/shared'
import { Texture } from '../resources'
import { Sprite } from './Sprite'
import type { ColorValue } from '@rubickjs/math'

export class Text extends Sprite {
  protected _textTextureCanvas = IN_BROWSER
    ? document.createElement('canvas')
    : undefined

  protected _color = new Ref<ColorValue>('#000000')
  get color() { return this._color.value }
  set color(val) { this._color.value = val }

  protected _fontSize = new Ref(14)
  get fontSize() { return this._fontSize.value }
  set fontSize(val) { this._fontSize.value = val }

  protected _fontWeight = new Ref<'normal' | 'bold' | 'lighter' | 'bolder' | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900>('normal')
  get fontWeight() { return this._fontWeight.value }
  set fontWeight(val) { this._fontWeight.value = val }

  protected _fontFamily = new Ref('monospace')
  get fontFamily() { return this._fontFamily.value }
  set fontFamily(val) { this._fontFamily.value = val }

  protected _fontStyle = new Ref<'normal' | 'italic' | 'oblique' | `oblique ${ string }`>('normal')
  get fontStyle() { return this._fontStyle.value }
  set fontStyle(val) { this._fontStyle.value = val }

  protected _fontKerning = new Ref<'auto' | 'none' | 'normal'>('normal')
  get fontKerning() { return this._fontKerning.value }
  set fontKerning(val) { this._fontKerning.value = val }

  protected _text = new Ref<string>('')
  get text() { return this._text.value }
  set text(val) { this._text.value = String(val) }

  protected _textAlign = new Ref<'center' | 'end' | 'left' | 'right' | 'start'>('center')
  get textAlign() { return this._textAlign.value }
  set textAlign(val) { this._textAlign.value = val }

  protected _textBaseline = new Ref<'alphabetic' | 'bottom' | 'hanging' | 'ideographic' | 'middle' | 'top'>('middle')
  get textBaseline() { return this._textBaseline.value }
  set textBaseline(val) { this._textBaseline.value = val }

  protected _textDecoration = new Ref<'underline' | 'line-through' | undefined>(undefined)
  get textDecoration() { return this._textDecoration.value }
  set textDecoration(val) { this._textDecoration.value = val }

  protected _direction = new Ref<'inherit' | 'ltr' | 'rtl'>('inherit')
  get direction() { return this._direction.value }
  set direction(val) { this._direction.value = val }

  /**
   * All characters in text
   *
   * boundingBox: Rectangle(x: 0 - 1, y: 0 - 1, width: 0 - 1, height: 0 - 1)
   */
  characters: Array<{
    value: string
    boundingBox: Rectangle
  }> = []

  override get style() { return this._getStyle() }
  override set style(val) { this._updateStyle(val) }

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

    if (style) {
      this.style = style as any
    }
  }

  protected override _getStyle() {
    return {
      ...super._getStyle(),
      color: this.color,
      fontSize: this.fontSize,
      fontWeight: this.fontWeight,
      fontFamily: this.fontFamily,
      fontStyle: this.fontStyle,
      fontKerning: this.fontKerning,
      textAlign: this.textAlign,
      textBaseline: this.textBaseline,
      textDecoration: this.textDecoration,
      direction: this.direction,
    }
  }

  protected override _updateStyle(val: Record<string, any>) {
    super._updateStyle(val)

    ;[
      'color',
      'fontSize',
      'fontWeight',
      'fontFamily',
      'fontStyle',
      'fontKerning',
      'textAlign',
      'textBaseline',
      'textDecoration',
      'direction',
    ].forEach(key => {
      if (typeof (val as any)[key] !== 'undefined') {
        (this as any)[key] = (val as any)[key]
      }
    })
  }

  protected _onNeedsUpdateTextTexture() {
    this.addDirty('textTexture')
  }

  /** disabled update size */
  protected override _onUpdateSize() {}

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
    context.strokeStyle = context.fillStyle = this.color as string
    context.lineWidth = 2
    context.direction = this.direction
    context.textAlign = this.textAlign
    context.textBaseline = this.textBaseline
    context.font = font
    context.fontKerning = this.fontKerning
    context.clearRect(0, 0, width, height)

    rows.forEach(row => {
      const offset = [0, 0]

      switch (context.textAlign) {
        case 'left':
          offset[0] = 0
          break
        case 'center':
          offset[0] = row.width / 2
          break
        case 'right':
          offset[0] = row.width
          break
      }

      switch (context.textBaseline) {
        case 'top':
        case 'hanging':
          offset[1] = 0
          break
        case 'middle':
        case 'alphabetic':
        case 'ideographic':
          offset[1] = row.height / 2
          break
        case 'bottom':
          offset[1] = row.height
          break
      }

      const x = row.x + offset[0]
      const y = row.y + offset[1]

      context.fillText(row.text, x, y)

      switch (this.textDecoration) {
        case 'underline':
          context.beginPath()
          context.moveTo(row.x, row.y + row.height - 2)
          context.lineTo(row.x + row.width, row.y + row.height - 2)
          context.stroke()
          break
        case 'line-through':
          context.beginPath()
          context.moveTo(row.x, row.y + row.height / 2)
          context.lineTo(row.x + row.width, row.y + row.height / 2)
          context.stroke()
          break
      }
    })

    this.setTexture(new Texture(context.canvas))
  }

  override process(delta: number) {
    if (this.hasDirty('textTexture')) {
      this.deleteDirty('textTexture')
      this._updateTextTexture()
    }

    super.process(delta)
  }
}
