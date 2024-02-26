import { InternalMode, Texture, customNode, property } from '@rubickjs/core'
import { Transform2D } from '@rubickjs/math'
import { Text as BaseText } from 'modern-text'
import { Element } from './Element'
import type { TextContent, TextStyle } from 'modern-text'
import type { ElementOptions } from './Element'

export interface TextOptions extends ElementOptions, Partial<TextStyle> {
  pixelRatio?: number
  splitMode?: 'char' | 'paragraph'
  content?: TextContent
}

@customNode('text')
export class Text extends Element {
  @property({ default: 2 }) declare pixelRatio: number
  @property() splitMode?: 'char' | 'paragraph'
  @property({ default: '' }) declare content: TextContent
  @property() fontFamilyUrl?: string

  protected _text = new BaseText()
  readonly textTexture = new Texture(this._text.view)

  protected _subTextsCount = 0

  constructor(options?: TextOptions) {
    super()
    options && this.setProperties(options)
  }

  protected async _loadFontFamily(): Promise<this> {
    for (const font of document.fonts.values()) {
      if (font.family === this.style.fontFamily) {
        await font.loaded
        this.requestRedraw()
        return this
      }
    }
    if (this.fontFamilyUrl) {
      const fontFace = new FontFace(this.style.fontFamily, `url(${ this.fontFamilyUrl })`)
      document.fonts.add(fontFace)
      await fontFace.load()
      this.requestRedraw()
    }
    return this
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any) {
    super._onUpdateProperty(key, value, oldValue)

    switch (key) {
      case 'content':
        this._text.content = value
      // eslint-disable-next-line no-fallthrough
      case 'splitMode':
        this._updateSplitMode()
        this.requestRedraw()
        break
    }
  }

  protected override _onUpdateStyleProperty(key: PropertyKey, value: any, oldValue: any) {
    (this._text.style as any)[key] = value

    if (key === 'height') return

    super._onUpdateStyleProperty(key, value, oldValue)

    switch (key) {
      case 'fontFamily':
      case 'fontFamilyUrl':
        this._loadFontFamily()
        break
      case 'width':
        if (this.splitMode) {
          this._updateSubTexts()
        }
        break
    }

    this.requestRedraw()

    if (this._subTextsCount) {
      this._getSubTexts().forEach(child => {
        child.style.setProperties({ [key]: value })
      })
    }
  }

  protected _getSubTexts(): Array<Text> {
    return this.getChildren(InternalMode.FRONT)
      .filter(node => node instanceof Text) as Array<Text>
  }

  protected _updateSubTexts() {
    const subTexts = this._getSubTexts()
    const result = this._text.measure()
    let i = 0
    switch (this.splitMode) {
      case 'char':
        result.paragraphs.forEach(paragraph => {
          paragraph.fragments.forEach(fragment => {
            const child = subTexts[i]
            if (child) {
              child.style.left = fragment.contentBox.left
              child.style.top = fragment.contentBox.top
            }
            i++
          })
        })
        break
      case 'paragraph': {
        result.paragraphs.forEach(paragraph => {
          const child = subTexts[i]
          if (child) {
            child.style.left = paragraph.contentBox.left
            child.style.top = paragraph.contentBox.top
          }
          i++
        })
        break
      }
    }
    if (!this.style.width) this.style.width = result.contentBox.width
    this.style.height = result.contentBox.height
  }

  protected _updateSplitMode() {
    if (this._subTextsCount) {
      this.getChildren(InternalMode.FRONT).forEach(child => this.removeChild(child))
      this._subTextsCount = 0
    }

    const result = this._text.measure()

    switch (this.splitMode) {
      case 'char':
        result.paragraphs.forEach(paragraph => {
          paragraph.fragments.forEach((fragment) => {
            this.addChild(
              new Text({
                pixelRatio: this.pixelRatio,
                content: fragment.content,
                style: {
                  ...this.style,
                  ...fragment.style,
                  left: fragment.contentBox.left,
                  top: fragment.contentBox.top,
                },
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
            new Text({
              pixelRatio: this.pixelRatio,
              content: [paragraph],
              style: {
                ...this.style,
                ...paragraph.style,
                left: paragraph.contentBox.left,
                top: paragraph.contentBox.top,
              },
            }),
            InternalMode.FRONT,
          )
          this._subTextsCount++
        })
        break
      }
    }

    if (!this.style.width) this.style.width = result.contentBox.width
    this.style.height = result.contentBox.height
  }

  protected override _drawContent() {
    if (!this.splitMode) {
      this._text.update()
      this.textTexture.requestUpload()
      const texture = this.textTexture
      this.context.fillStyle = texture
      this.context.textureTransform = new Transform2D().scale(
        this.style.width / texture.width,
        this.style.height / texture.height,
      )
      super._drawContent()
    }
  }
}
