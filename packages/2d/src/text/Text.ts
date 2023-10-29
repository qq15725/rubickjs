import { IN_BROWSER } from '@rubickjs/shared'
import { Texture, customNode, property } from '@rubickjs/core'
import { Transform2D } from '@rubickjs/math'
import { Element2d } from '../element2d'

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

@customNode('text')
export class Text extends Element2d {
  @property() text: string | Array<StyleableTextParagraph> = ''
  @property() pixelRatio = 2
  @property() color = '#000000'
  @property() fontSize = 10
  @property() fontWeight: FontWeight = 'normal'
  @property() fontFamily = 'sans-serif'
  @property() fontStyle: FontStyle = 'normal'
  @property() fontKerning: FontKerning = 'normal'
  @property() textWrap: TextWrap = 'wrap'
  @property() textAlign: TextAlign = 'start'
  @property() textBaseline: TextBaseline = 'middle'
  @property() textDecoration: TextDecoration | null = null
  @property() direction: 'inherit' | 'ltr' | 'rtl' = 'inherit'
  @property() lineHeight = 1.2

  protected _needsUpdateTexture = false
  protected _src = IN_BROWSER
    ? new Texture(document.createElement('canvas'))
    : undefined

  protected _domContext = this._src?.source.getContext('2d')

  constructor(options: Record<string, any> = {}) {
    super()
    this.setProperties(options)
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any) {
    super._onUpdateProperty(key, value, oldValue)

    switch (key) {
      case 'text':
      case 'pixelRatio':
      case 'color':
      case 'fontSize':
      case 'fontWeight':
      case 'fontFamily':
      case 'fontStyle':
      case 'fontKerning':
      case 'textWrap':
      case 'textAlign':
      case 'textBaseline':
      case 'textDecoration':
      case 'direction':
      case 'lineHeight':
      case 'width':
      case 'height':
        this._needsUpdateTexture = true
        break
    }
  }

  protected _createParagraphs(
    text: string | StyleableTextParagraph | Array<StyleableTextParagraph>,
  ): Array<TextParagraph> {
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

  protected _createWrapedParagraphs(
    paragraphs: Array<TextParagraph>,
    width: number,
  ): Array<TextParagraph> {
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
        const textWrap = style.textWrap ?? this.textWrap
        this._setupContextStyle(style)
        let text = ''
        let wrap = false
        for (const char of fragment.text) {
          const charWidth = this._domContext!.measureText(char).width
          const isNewline = /^[\r\n]$/.test(char)
          if (
            isNewline
            || (
              textWrap === 'wrap'
              && width
              && paragraphWidth + charWidth > width
            )
          ) {
            let pos = isNewline ? text.length + 1 : text.length
            if (!paragraphWidth && !pos) {
              text += char
              pos++
            }
            if (text.length) fragments.push({ ...fragment, text })
            if (fragments.length) {
              wrapedParagraphs.push({ ...paragraph, fragments: fragments.slice() })
              fragments.length = 0
            }
            const restText = fragment.text.substring(pos)
            if (restText.length || restFragments.length) {
              restParagraphs.unshift({
                ...paragraph,
                fragments: (
                  restText.length
                    ? [{ ...fragment, text: restText }]
                    : []
                ).concat(restFragments.slice()),
              })
            }
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

  measure(
    text: string | StyleableTextParagraph | Array<StyleableTextParagraph>,
    width = 0,
    height = 0,
  ) {
    let paragraphs = this._createParagraphs(text)
    paragraphs = this._createWrapedParagraphs(paragraphs, width)
    const context = this._domContext!
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
        const fontSize = style.fontSize ?? this.fontSize
        const lineHeight = style.lineHeight || this.lineHeight || 1
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
        switch (this.textAlign) {
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
        switch (this.textBaseline) {
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

    return { ...boundingRect, paragraphs }
  }

  protected _fillText(paragraphs: Array<TextParagraph>) {
    const context = this._domContext!
    paragraphs.forEach(paragraph => {
      paragraph.fragments.forEach(fragment => {
        this._setupContextStyle(fragment.style)
        context.fillText(fragment.text, fragment.fillX, fragment.fillY)
        switch (fragment.style.textDecoration ?? this.textDecoration) {
          case 'underline':
            context.beginPath()
            context.moveTo(fragment.absoluteX, paragraph.absoluteY + paragraph.height - 2)
            context.lineTo(fragment.absoluteX + fragment.width, paragraph.absoluteY + paragraph.height - 2)
            context.stroke()
            break
          case 'line-through':
            context.beginPath()
            context.moveTo(fragment.absoluteX, paragraph.absoluteY + paragraph.height / 2)
            context.lineTo(fragment.absoluteX + fragment.width, paragraph.absoluteY + paragraph.height / 2)
            context.stroke()
            break
        }
      })
    })
  }

  protected _resizeCanvas(width: number, height: number) {
    const canvas = this._src!.source
    canvas.style.width = `${ width }px`
    canvas.style.height = `${ height }px`
    canvas.dataset.width = String(width)
    canvas.dataset.height = String(height)
    canvas.width = Math.max(1, Math.floor(width * this.pixelRatio))
    canvas.height = Math.max(1, Math.floor(height * this.pixelRatio))
  }

  protected _setupContextStyle(style?: Partial<TextOnlyStyle>) {
    const context = this._domContext!
    context.strokeStyle = style?.color ?? this.color as string
    context.fillStyle = style?.color ?? this.color as string
    context.lineWidth = 2
    context.direction = style?.direction ?? this.direction
    context.textAlign = style?.textAlign ?? this.textAlign
    context.textBaseline = style?.textBaseline ?? this.textBaseline
    context.font = [
      style?.fontStyle ?? this.fontStyle,
      style?.fontWeight || this.fontWeight || 'normal',
      `${ style?.fontSize || this.fontSize || 10 }px`,
      style?.fontFamily ?? this.fontFamily,
    ].join(' ')
    context.fontKerning = style?.fontKerning ?? this.fontKerning
  }

  refreshTexture() {
    if (this._needsUpdateTexture) {
      this._needsUpdateTexture = false
      const context = this._src?.source.getContext('2d')
      if (!context) {
        console.warn('Failed to getContext(\'2d\') in refreshTexture')
        return
      }
      this._domContext! = context
      let { width, height } = this
      const result = this.measure(this.text, width, height)
      if (!width) width = result.width
      if (!height) height = result.height
      this._resizeCanvas(width, height)
      const pixelRatio = this.pixelRatio
      context.scale(pixelRatio, pixelRatio)
      context.clearRect(0, 0, context.canvas.width, context.canvas.height)
      this._fillText(result.paragraphs)
      this._src!.requestUpload()
      this.width = width
      this.height = height
      this._requestRedraw()
    }
  }

  protected override _process(delta: number) {
    if (this.isVisible()) {
      this.refreshTexture()
    }

    super._process(delta)
  }

  protected _drawSrc() {
    const src = this._src
    if (src) {
      this._context.texture = src
      this._context.textureTransform = new Transform2D().scale(
        this.width! / src.width,
        this.height! / src.height,
      )
    }
  }

  protected override _drawFill() {
    this._drawSrc()
    super._drawFill()
  }
}
