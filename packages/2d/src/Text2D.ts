import { InternalMode, Texture, customNode, property } from '@rubickjs/core'
import { Transform2D } from '@rubickjs/math'
import { Element2D } from './element2D'
import type { Element2DProperties } from './element2D'

export type FontWeight = 'normal' | 'bold' | 'lighter' | 'bolder' | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
export type FontStyle = 'normal' | 'italic' | 'oblique' | `oblique ${ string }`
export type FontKerning = 'auto' | 'none' | 'normal'
export type TextWrap = 'wrap' | 'nowrap'
export type TextAlign = 'center' | 'end' | 'left' | 'right' | 'start'
export type TextBaseline = 'alphabetic' | 'bottom' | 'hanging' | 'ideographic' | 'middle' | 'top'
export type TextDecoration = 'underline' | 'line-through'

export interface StyleableTextParagraph {
  fragments?: Array<StyleableTextFragment>
  text?: string
  style?: Partial<TextStyle>
}

export interface StyleableTextFragment {
  text: string
  style?: Partial<TextStyle>
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
  actualBoundingBoxWidth: number
  height: number
  relativeX: number
  relativeY: number
  absoluteX: number
  absoluteY: number
  fillX: number
  fillY: number
  text: string
  style: Partial<TextStyle>
}

export interface TextStyle {
  color: string
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
  textStrokeWidth: number
  textStrokeColor: string
  direction: 'inherit' | 'ltr' | 'rtl'
  lineHeight: number
  letterSpacing: number
  shadowColor: string
  shadowOffsetX: number
  shadowOffsetY: number
  shadowBlur: number
}

export interface Text2DProperties extends Element2DProperties, Partial<TextStyle> {
  splitMode?: 'char' | 'paragraph' | null
  pixelRatio?: number
}

@customNode('Text2D')
export class Text2D extends Element2D {
  @property({ default: null }) splitMode!: 'char' | 'paragraph' | null
  @property({ default: '' }) text!: string | Array<StyleableTextParagraph>
  @property({ default: 2 }) pixelRatio!: number
  @property({ default: '#000000' }) color!: string
  @property({ default: 14 }) fontSize!: number
  @property({ default: 'normal' }) fontWeight!: FontWeight
  @property({ default: 'sans-serif' }) fontFamily!: string
  @property() fontFamilyUrl?: string
  @property({ default: 'normal' }) fontStyle!: FontStyle
  @property({ default: 'normal' }) fontKerning!: FontKerning
  @property({ default: 'wrap' }) textWrap!: TextWrap
  @property({ default: 'start' }) textAlign!: TextAlign
  @property({ default: 'middle' }) textBaseline!: TextBaseline
  @property({ default: null }) textDecoration!: TextDecoration | null
  @property({ default: 0 }) textStrokeWidth!: number
  @property({ default: '#000000' }) textStrokeColor!: string
  @property({ default: 'inherit' }) direction!: 'inherit' | 'ltr' | 'rtl'
  @property({ default: 1 }) lineHeight!: number
  @property({ default: 0 }) letterSpacing!: number
  @property({ default: '#000000' }) shadowColor!: string
  @property({ default: 0 }) shadowOffsetX!: number
  @property({ default: 0 }) shadowOffsetY!: number
  @property({ default: 0 }) shadowBlur!: number

  static textStyles = [
    'color',
    'fontSize', 'fontWeight', 'fontFamily', 'fontStyle', 'fontKerning',
    'textWrap', 'textAlign', 'textBaseline', 'textDecoration', 'textStrokeWidth', 'textStrokeColor',
    'direction', 'lineHeight', 'letterSpacing',
    'shadowColor', 'shadowOffsetX', 'shadowOffsetY', 'shadowBlur',
  ]

  readonly textCanvas = document.createElement('canvas')
  readonly textContext = this.textCanvas.getContext('2d')!
  readonly textTexture = new Texture(this.textCanvas)

  protected _subTextsCount = 0

  constructor(properties?: Text2DProperties) {
    super()
    properties && this.setProperties(properties)
  }

  measure(width = 0, height = 0) {
    let paragraphs = this._createParagraphs(this.text)
    paragraphs = this._createWrapedParagraphs(paragraphs, width)
    const context = this.textContext!
    let offsetY = 0
    for (let len = paragraphs.length, i = 0; i < len; i++) {
      const paragraph = paragraphs[i]
      paragraph.relativeX = 0
      paragraph.relativeY = offsetY
      paragraph.width = 0
      paragraph.height = 0
      let offsetX = 0
      let lastFragment: TextFragment | undefined
      for (const fragment of paragraph.fragments) {
        const style = this._getFragmentStyle(fragment.style)
        this._setTextContextStyle(style)
        const result = context.measureText(fragment.text)
        const fragmentWidth = result.width
        const actualBoundingBoxWidth = result.actualBoundingBoxRight + result.actualBoundingBoxLeft
        fragment.relativeX = offsetX
        fragment.relativeY = paragraph.relativeY
        fragment.width = fragmentWidth
        fragment.actualBoundingBoxWidth = actualBoundingBoxWidth
        fragment.height = style.fontSize * style.lineHeight
        offsetX += fragmentWidth + style.letterSpacing
        lastFragment = fragment
        paragraph.height = Math.max(paragraph.height, fragment.height)
      }
      paragraph.width = lastFragment
        ? lastFragment.relativeX + Math.max(lastFragment.width, lastFragment.actualBoundingBoxWidth)
        : 0
      offsetY += paragraph.height
    }

    const boundingRect = paragraphs.reduce((rect, paragraph) => {
      rect.x = Math.min(rect.x, paragraph.relativeX)
      rect.y = Math.min(rect.y, paragraph.relativeY)
      rect.width = Math.max(rect.width, paragraph.width)
      rect.height += paragraph.height
      return rect
    }, { x: 0, y: 0, width: 0, height: 0 })

    width = width || boundingRect.width
    height = Math.max(height, boundingRect.height)

    for (let len = paragraphs.length, i = 0; i < len; i++) {
      const paragraph = paragraphs[i]

      switch (this.textAlign) {
        case 'center':
          paragraph.absoluteX = (width - boundingRect.width) / 2
          paragraph.fragments.forEach(fragment => {
            fragment.absoluteX = paragraph.absoluteX + fragment.relativeX
            fragment.fillX = fragment.absoluteX + fragment.width / 2
          })
          break
        case 'end':
        case 'right':
          paragraph.absoluteX = width - boundingRect.width
          paragraph.fragments.forEach(fragment => {
            fragment.absoluteX = paragraph.absoluteX + fragment.relativeX
            fragment.fillX = fragment.absoluteX + fragment.width
          })
          break
        case 'start':
        case 'left':
        default:
          paragraph.absoluteX = 0
          paragraph.fragments.forEach(fragment => {
            fragment.absoluteX = paragraph.absoluteX + fragment.relativeX
            fragment.fillX = fragment.absoluteX
          })
          break
      }

      switch (this.textBaseline) {
        case 'top':
        case 'hanging':
          paragraph.absoluteY = paragraph.relativeY
          paragraph.fragments.forEach(fragment => {
            fragment.absoluteY = paragraph.absoluteY
            fragment.fillY = fragment.absoluteY
          })
          break
        case 'middle':
        case 'alphabetic':
        case 'ideographic':
          paragraph.absoluteY = paragraph.relativeY + (height - boundingRect.height) / 2
          paragraph.fragments.forEach(fragment => {
            fragment.absoluteY = paragraph.absoluteY
            fragment.fillY = fragment.absoluteY + paragraph.height / 2
          })
          break
        case 'bottom':
          paragraph.absoluteY = paragraph.relativeY + height - boundingRect.height
          paragraph.fragments.forEach(fragment => {
            fragment.absoluteY = paragraph.absoluteY
            fragment.fillY = fragment.absoluteY + paragraph.height
          })
          break
      }
    }

    return { ...boundingRect, paragraphs }
  }

  protected async _loadFontFamily(): Promise<this> {
    for (const font of document.fonts.values()) {
      if (font.family === this.fontFamily) {
        await font.loaded
        this.requestRedraw()
        return this
      }
    }
    if (this.fontFamilyUrl) {
      const fontFace = new FontFace(this.fontFamily, `url(${ this.fontFamilyUrl })`)
      document.fonts.add(fontFace)
      await fontFace.load()
      this.requestRedraw()
    }
    return this
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any) {
    if (key === 'height') return

    super._onUpdateProperty(key, value, oldValue)

    switch (key) {
      case 'fontFamily':
      case 'fontFamilyUrl':
        this._loadFontFamily()
        break
      case 'splitMode':
      case 'text':
        this._updateSplitMode()
        this.requestRedraw()
        break
      case 'width':
        if (this.splitMode) {
          this._updateSubTexts()
        }
        break
      case 'fontSize':
        if (value <= 0) this.fontSize = 14
        break
      case 'fontWeight':
        if (!value) this.fontWeight = 'normal'
        break
      case 'lineHeight':
        if (!value) this.lineHeight = 1
        break
    }

    if (typeof key === 'string' && Text2D.textStyles.includes(key)) {
      this.requestRedraw()

      if (this._subTextsCount) {
        this._getSubTexts().forEach(child => {
          child.setProperties({ [key]: value })
        })
      }
    }
  }

  protected _getSubTexts(): Array<Text2D> {
    return this.getChildren(InternalMode.FRONT)
      .filter(node => node instanceof Text2D) as Array<Text2D>
  }

  protected _updateSubTexts() {
    const subTexts = this._getSubTexts()
    const result = this.measure(this.width)
    let i = 0
    switch (this.splitMode) {
      case 'char':
        result.paragraphs.forEach(paragraph => {
          paragraph.fragments.forEach(fragment => {
            const child = subTexts[i]
            if (child) {
              child.left = fragment.relativeX
              child.top = fragment.relativeY
            }
            i++
          })
        })
        break
      case 'paragraph': {
        result.paragraphs.forEach(paragraph => {
          const child = subTexts[i]
          if (child) {
            child.left = paragraph.relativeX
            child.top = paragraph.relativeY
          }
          i++
        })
        break
      }
    }
    if (!this.width) this.width = result.width
    this.height = result.height
  }

  protected _updateSplitMode() {
    if (this._subTextsCount) {
      this.getChildren(InternalMode.FRONT).forEach(child => this.removeChild(child))
      this._subTextsCount = 0
    }

    if (!this.splitMode) return

    const result = this.measure(this.width)

    switch (this.splitMode) {
      case 'char':
        result.paragraphs.forEach(paragraph => {
          paragraph.fragments.forEach((fragment) => {
            this.addChild(
              new Text2D({
                ...this._getFragmentStyle(fragment.style),
                pixelRatio: this.pixelRatio,
                splitMode: null,
                left: fragment.relativeX,
                top: fragment.relativeY,
                text: fragment.text,
              }),
              InternalMode.FRONT,
            )
            this._subTextsCount++
          })
        })
        break
      case 'paragraph': {
        result.paragraphs.forEach(paragraph => {
          this.addChild(
            new Text2D({
              ...this._getFragmentStyle(),
              pixelRatio: this.pixelRatio,
              splitMode: null,
              left: paragraph.relativeX,
              top: paragraph.relativeY,
              text: [paragraph],
            }),
            InternalMode.FRONT,
          )
          this._subTextsCount++
        })
        break
      }
    }

    if (!this.width) this.width = result.width
    this.height = result.height
  }

  protected _createParagraphs(
    text: string | StyleableTextParagraph | Array<StyleableTextParagraph>,
  ): Array<TextParagraph> {
    const shared = {
      width: 0,
      actualBoundingBoxWidth: 0,
      height: 0,
      relativeX: 0,
      relativeY: 0,
      absoluteX: 0,
      absoluteY: 0,
    }

    const createParagraph = (props: Partial<TextParagraph> = {}): TextParagraph => {
      return { ...shared, fragments: [], ...props }
    }

    const createFragments = (props: Partial<TextFragment> = {}): Array<TextFragment> => {
      const fragments: Array<TextFragment> = []
      const text = props.text ?? ''
      if (this.splitMode === 'char') {
        for (const char of text) {
          fragments.push({ fillX: 0, fillY: 0, style: {}, ...shared, ...props, text: char })
        }
      } else {
        fragments.push({ fillX: 0, fillY: 0, style: {}, ...shared, ...props, text })
      }
      return fragments
    }

    const paragraphs: Array<TextParagraph> = []
    if (typeof text === 'string') {
      if (text) {
        paragraphs.push(
          createParagraph({
            fragments: createFragments({ text }),
          }),
        )
      }
    } else {
      text = Array.isArray(text) ? text : [text]
      for (const p of text) {
        const paragraph = createParagraph()
        if (p.fragments) {
          for (const f of p.fragments) {
            paragraph.fragments.push(
              ...createFragments({ text: f.text, style: { ...p.style, ...f.style } }),
            )
          }
        } else if (p.text) {
          paragraph.fragments.push(
            ...createFragments({ text: p.text, style: p.style }),
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
      let first = true
      // eslint-disable-next-line no-cond-assign
      while (fragment = restFragments.shift()) {
        const style = this._getFragmentStyle(fragment.style)
        this._setTextContextStyle(style)
        let text = ''
        let wrap = false
        for (const char of fragment.text) {
          const charWidth = this.textContext!.measureText(char).width + (first ? 0 : style.letterSpacing)
          const isNewline = /^[\r\n]$/.test(char)
          if (
            isNewline
            || (
              style.textWrap === 'wrap'
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
        first = false
      }
      if (fragments.length) {
        wrapedParagraphs.push({ ...paragraph, fragments })
      }
    }
    return wrapedParagraphs
  }

  protected _drawText(paragraphs: Array<TextParagraph>) {
    const context = this.textContext!
    paragraphs.forEach(paragraph => {
      paragraph.fragments.forEach(fragment => {
        const style = this._getFragmentStyle(fragment.style)
        this._setTextContextStyle(style)
        if (style.textStrokeWidth) {
          context.strokeText(fragment.text, fragment.fillX, fragment.fillY)
        }
        context.fillText(fragment.text, fragment.fillX, fragment.fillY)
        switch (style.textDecoration) {
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

  protected _resizeTextCanvas(width: number, height: number) {
    const canvas = this.textCanvas
    canvas.style.width = `${ width }px`
    canvas.style.height = `${ height }px`
    canvas.dataset.width = String(width)
    canvas.dataset.height = String(height)
    canvas.width = Math.max(1, Math.floor(width * this.pixelRatio))
    canvas.height = Math.max(1, Math.floor(height * this.pixelRatio))
  }

  protected _getFragmentStyle(style: Partial<TextStyle> = {}): Omit<TextStyle, 'text'> {
    const result = {} as any
    Text2D.textStyles.forEach(key => {
      result[key] = (style as any)[key] || (this as any)[key]
    })
    return result
  }

  protected _setTextContextStyle(style: Omit<TextStyle, 'text'>) {
    const context = this.textContext
    context.shadowColor = style.shadowColor
    context.shadowOffsetX = style.shadowOffsetX
    context.shadowOffsetY = style.shadowOffsetY
    context.shadowBlur = style.shadowBlur
    context.strokeStyle = style.textStrokeColor
    context.lineWidth = style.textStrokeWidth
    context.fillStyle = style.color
    context.direction = style.direction
    context.textAlign = style.textAlign
    context.textBaseline = style.textBaseline
    context.font = [
      style.fontStyle,
      style.fontWeight,
      `${ style.fontSize }px`,
      style.fontFamily,
    ].join(' ')
    context.fontKerning = style.fontKerning
    // TODO
    ;(context as any).letterSpacing = `${ style.letterSpacing }px`
  }

  protected _updateTextTexture() {
    const context = this.textContext
    let { width, height } = this
    const result = this.measure(width, height)
    if (!width) width = result.width
    height = Math.max(height, result.height)
    this._resizeTextCanvas(width, height)
    const pixelRatio = this.pixelRatio
    context.scale(pixelRatio, pixelRatio)
    context.clearRect(0, 0, context.canvas.width, context.canvas.height)
    this._drawText(result.paragraphs)
    this.textTexture.requestUpload()
    this.width = width
    this.height = height
  }

  protected override _drawContent() {
    if (!this.splitMode) {
      this._updateTextTexture()
      const texture = this.textTexture
      this._context.texture = texture
      this._context.textureTransform = new Transform2D().scale(
        this.width! / texture.width,
        this.height! / texture.height,
      )
      super._drawContent()
    }
  }
}
