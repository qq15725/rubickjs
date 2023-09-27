import { IN_BROWSER, defineProps } from '@rubickjs/shared'
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

export interface TextOnlyStyle {
  color: string
  fontSize: number
  fontWeight: FontWeight
  fontFamily: string
  fontStyle: FontStyle
  fontKerning: FontKerning
  text: string
  textWrap: TextWrap
  textAlign: TextAlign
  textBaseline: TextBaseline
  textDecoration: TextDecoration | null
  direction: 'inherit' | 'ltr' | 'rtl'
  lineHeight: number
}

export interface StyleableTextParagraph {
  fragments?: Array<StyleableTextFragment>
  text?: string
  style?: Partial<TextOnlyStyle>
}

export interface StyleableTextFragment {
  text: string
  style?: Partial<TextOnlyStyle>
}

export interface TextParagraph {
  width: number
  height: number
  relativeX: number
  relativeY: number
  absoluteX: number
  absoluteY: number
  fragments: Array<TextFragment>
}

export interface TextFragment {
  width: number
  height: number
  relativeX: number
  relativeY: number
  absoluteX: number
  absoluteY: number
  fillX: number
  fillY: number
  text: string
  style: Partial<TextOnlyStyle>
}

export interface Text {
  pixelRatio: number
  color: ColorValue
  fontSize: number
  fontWeight: FontWeight
  fontFamily: string
  fontStyle: FontStyle
  fontKerning: FontKerning
  text: string | Array<StyleableTextParagraph>
  textWrap: TextWrap
  textAlign: TextAlign
  textBaseline: TextBaseline
  textDecoration: TextDecoration | null
  direction: 'inherit' | 'ltr' | 'rtl'
  lineHeight: number
}

@defineProps({
  text: { internal: '_text', onUpdated: '_onUpdateText' },
  pixelRatio: { internal: '_pixelRatio', onUpdated: 'scheduleUpdateTexture' },
  color: { internal: '_color', onUpdated: 'scheduleUpdateTexture' },
  fontSize: { internal: '_fontSize', onUpdated: 'scheduleUpdateTexture' },
  fontWeight: { internal: '_fontWeight', onUpdated: 'scheduleUpdateTexture' },
  fontFamily: { internal: '_fontFamily', onUpdated: 'scheduleUpdateTexture' },
  fontStyle: { internal: '_fontStyle', onUpdated: 'scheduleUpdateTexture' },
  fontKerning: { internal: '_fontKerning', onUpdated: 'scheduleUpdateTexture' },
  textWrap: { internal: '_textWrap', onUpdated: 'scheduleUpdateTexture' },
  textAlign: { internal: '_textAlign', onUpdated: 'scheduleUpdateTexture' },
  textBaseline: { internal: '_textBaseline', onUpdated: 'scheduleUpdateTexture' },
  textDecoration: { internal: '_textDecoration', onUpdated: 'scheduleUpdateTexture' },
  direction: { internal: '_direction', onUpdated: 'scheduleUpdateTexture' },
  lineHeight: { internal: '_lineHeight', onUpdated: 'scheduleUpdateTexture' },
})
export class Text extends Sprite<Texture<HTMLCanvasElement>> {
  protected _context: CanvasRenderingContext2D
  protected _text: string | Array<StyleableTextParagraph> = ''
  protected _pixelRatio = 2
  protected _color: ColorValue = '#000000'
  protected _fontSize = 10
  protected _fontWeight: FontWeight = 'normal'
  protected _fontFamily = 'sans-serif'
  protected _fontStyle: FontStyle = 'normal'
  protected _fontKerning: FontKerning = 'normal'
  protected _textWrap: TextWrap = 'wrap'
  protected _textAlign: TextAlign = 'start'
  protected _textBaseline: TextBaseline = 'middle'
  protected _textDecoration: TextDecoration | null = null
  protected _direction: 'inherit' | 'ltr' | 'rtl' = 'inherit'
  protected _lineHeight = 1.2

  /** Style */
  protected override _style = new TextStyle(this)
  get style(): TextStyle { return this._style }
  set style(val: Partial<TextStyle>) { this._style.update(val) }

  constructor(
    text: string | Array<StyleableTextParagraph>,
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
    this._context = canvas.getContext('2d')!
    this.text = text
    if (style) this.style = style
  }

  protected override _onUpdateSize() {
    super._onUpdateSize()
    this.scheduleUpdateTexture()
  }

  scheduleUpdateTexture() { this.addDirty('texture') }

  protected _onUpdateText() {
    this.scheduleUpdateTexture()
  }

  protected _createParagraphs(text: string | StyleableTextParagraph | Array<StyleableTextParagraph>): Array<TextParagraph> {
    function createParagraph(props: Partial<TextParagraph> = {}): TextParagraph {
      return {
        width: 0,
        height: 0,
        relativeX: 0,
        relativeY: 0,
        absoluteX: 0,
        absoluteY: 0,
        fragments: [],
        ...props,
      }
    }

    function createFragment(props: Partial<TextFragment> = {}): TextFragment {
      return {
        width: 0,
        height: 0,
        relativeX: 0,
        relativeY: 0,
        absoluteX: 0,
        absoluteY: 0,
        fillX: 0,
        fillY: 0,
        style: {},
        text: '',
        ...props,
      }
    }

    const paragraphs: Array<TextParagraph> = []
    if (typeof text === 'string') {
      paragraphs.push(
        createParagraph({
          fragments: [createFragment({ text })],
        }),
      )
    } else {
      text = Array.isArray(text) ? text : [text]
      for (const p of text) {
        const paragraph = createParagraph()
        if (p.fragments) {
          for (const f of p.fragments) {
            paragraph.fragments.push(
              createFragment({ text: f.text, style: { ...p.style, ...f.style } }),
            )
          }
        } else if (p.text) {
          paragraph.fragments.push(
            createFragment({ text: p.text, style: p.style }),
          )
        }
        paragraphs.push(paragraph)
      }
    }
    return paragraphs
  }

  protected _createWrapedParagraphs(paragraphs: Array<TextParagraph>): Array<TextParagraph> {
    const width = this.width
    const wrapedParagraphs: Array<TextParagraph> = []
    const restParagraphs = paragraphs.slice()
    let paragraph: TextParagraph | undefined
    let fragment: TextFragment | undefined
    // eslint-disable-next-line no-cond-assign
    while (paragraph = restParagraphs.shift()) {
      const restFragments = paragraph.fragments.slice()
      let paragraphWidth = 0
      const fragments = []
      // eslint-disable-next-line no-cond-assign
      while (fragment = restFragments.shift()) {
        const style = fragment.style
        const textWrap = style.textWrap ?? this._textWrap
        this._setupContextStyle(style)
        let text = ''
        let wrap = false
        for (const char of fragment.text) {
          const charWidth = this._context.measureText(char).width
          if (
            textWrap === 'wrap'
            && width
            && paragraphWidth + charWidth > width
          ) {
            if (text.length) fragments.push({ ...fragment, text })
            if (fragments.length) {
              wrapedParagraphs.push({ ...paragraph, fragments: fragments.slice() })
              fragments.length = 0
            }
            restParagraphs.unshift({
              ...paragraph,
              fragments: [
                { ...fragment, text: fragment.text.substring(text.length) },
              ].concat(restFragments.slice()),
            })
            restFragments.length = 0
            wrap = true
            break
          } else {
            paragraphWidth += charWidth
          }
          text += char
        }
        if (!wrap) fragments.push({ ...fragment })
      }
      if (fragments.length) {
        wrapedParagraphs.push({ ...paragraph, fragments })
      }
    }
    return wrapedParagraphs
  }

  protected _measure(paragraphs: Array<TextParagraph>, width = 0, height = 0) {
    const context = this._context
    let paragraphOffsetY = 0
    for (let len = paragraphs.length, i = 0; i < len; i++) {
      const paragraph = paragraphs[i]
      paragraph.relativeX = 0
      paragraph.relativeY = paragraphOffsetY
      paragraph.width = 0
      paragraph.height = 0
      let textOffsetX = 0
      for (const text of paragraph.fragments) {
        const style = text.style
        this._setupContextStyle(style)
        const textWidth = context.measureText(text.text).width
        const fontSize = style.fontSize ?? this._fontSize
        const lineHeight = style.lineHeight ?? this._lineHeight
        const textHeight = fontSize * lineHeight
        text.relativeX = textOffsetX
        text.relativeY = paragraph.relativeY
        text.width = textWidth
        text.height = textHeight
        textOffsetX += textWidth
        paragraph.width += textWidth
        paragraph.height = Math.max(paragraph.height, text.height)
      }
      paragraphOffsetY += paragraph.height
    }

    const boundingRect = paragraphs.reduce((rect, paragraph) => {
      rect.x = Math.min(rect.x, paragraph.relativeX)
      rect.y = Math.min(rect.y, paragraph.relativeY)
      rect.width = Math.max(rect.width, paragraph.width)
      rect.height += paragraph.height
      return rect
    }, { x: 0, y: 0, width: 0, height: 0 })

    for (let len = paragraphs.length, i = 0; i < len; i++) {
      const paragraph = paragraphs[i]

      if (width) {
        let absoluteX = 0
        switch (this._textAlign) {
          case 'start':
          case 'left':
            absoluteX = paragraph.absoluteX = 0
            paragraph.fragments.forEach(fragment => {
              fragment.absoluteX = absoluteX
              fragment.fillX = absoluteX
              absoluteX += fragment.width
            })
            break
          case 'center':
            absoluteX = paragraph.absoluteX = (width - boundingRect.width) / 2
            paragraph.fragments.forEach(fragment => {
              fragment.absoluteX = absoluteX
              fragment.fillX = absoluteX + fragment.width / 2
              absoluteX += fragment.width
            })
            break
          case 'end':
          case 'right':
            absoluteX = paragraph.absoluteX = width - boundingRect.width
            paragraph.fragments.forEach(fragment => {
              fragment.absoluteX = absoluteX
              fragment.fillX = absoluteX + fragment.width
              absoluteX += fragment.width
            })
            break
        }
      }

      if (height) {
        switch (this._textBaseline) {
          case 'top':
          case 'hanging':
            paragraph.absoluteY = paragraph.relativeY
            paragraph.fragments.forEach(fragment => {
              fragment.fillY = paragraph.absoluteY
              fragment.absoluteY = paragraph.absoluteY
            })
            break
          case 'middle':
          case 'alphabetic':
          case 'ideographic':
            paragraph.absoluteY = paragraph.relativeY + (height - boundingRect.height) / 2
            paragraph.fragments.forEach(fragment => {
              fragment.fillY = paragraph.absoluteY + paragraph.height / 2
              fragment.absoluteY = fragment.fillY - fragment.height / 2
            })
            break
          case 'bottom':
            paragraph.absoluteY = paragraph.relativeY + height - boundingRect.height
            paragraph.fragments.forEach(fragment => {
              fragment.fillY = paragraph.absoluteY + paragraph.height
              fragment.absoluteY = fragment.fillY - fragment.height
            })
            break
        }
      }
    }

    return boundingRect
  }

  protected _fillText(paragraphs: Array<TextParagraph>) {
    const context = this._context
    paragraphs.forEach(paragraph => {
      paragraph.fragments.forEach(text => {
        this._setupContextStyle(text.style)
        context.fillText(text.text, text.fillX, text.fillY)
        switch (text.style.textDecoration ?? this._textDecoration) {
          case 'underline':
            context.beginPath()
            context.moveTo(text.absoluteX, paragraph.absoluteY + paragraph.height - 2)
            context.lineTo(text.absoluteX + text.width, paragraph.absoluteY + paragraph.height - 2)
            context.stroke()
            break
          case 'line-through':
            context.beginPath()
            context.moveTo(text.absoluteX, paragraph.absoluteY + paragraph.height / 2)
            context.lineTo(text.absoluteX + text.width, paragraph.absoluteY + paragraph.height / 2)
            context.stroke()
            break
        }
      })
    })
  }

  protected _resizeCanvas(width: number, height: number) {
    const canvas = this._texture.source
    canvas.style.width = `${ width }px`
    canvas.style.height = `${ height }px`
    canvas.dataset.width = String(width)
    canvas.dataset.height = String(height)
    canvas.width = Math.max(1, Math.floor(width * this._pixelRatio))
    canvas.height = Math.max(1, Math.floor(height * this._pixelRatio))
  }

  protected _setupContextStyle(style?: Partial<TextOnlyStyle>) {
    const context = this._context
    context.strokeStyle = style?.color ?? this._color as string
    context.fillStyle = style?.color ?? this._color as string
    context.lineWidth = 2
    context.direction = style?.direction ?? this._direction
    context.textAlign = style?.textAlign ?? this._textAlign
    context.textBaseline = style?.textBaseline ?? this._textBaseline
    context.font = [
      style?.fontStyle ?? this._fontStyle,
      style?.fontWeight ?? this._fontWeight,
      `${ style?.fontSize ?? this._fontSize }px`,
      style?.fontFamily ?? this._fontFamily,
    ].join(' ')
    context.fontKerning = style?.fontKerning ?? this._fontKerning
  }

  updateTexture() {
    const context = this._texture.source.getContext('2d')
    if (!context) {
      console.warn('Failed to getContext(\'2d\') in updateTexture')
      return
    }
    this._context = context

    let [width, height] = this.size
    let paragraphs = this._createParagraphs(this._text)
    paragraphs = this._createWrapedParagraphs(paragraphs)
    const result = this._measure(paragraphs, width, height)
    if (!width) width = result.width
    if (!height) height = result.height
    this._resizeCanvas(width, height)
    context.scale(this._pixelRatio, this._pixelRatio)
    context.clearRect(0, 0, context.canvas.width, context.canvas.height)
    this._fillText(paragraphs)
    this._texture.updateSource()
    this.size.update(width, height)
  }

  protected override _process(delta: number) {
    if (this.hasDirty('texture')) {
      this.deleteDirty('texture')
      this.updateTexture()
    }

    super._process(delta)
  }
}
