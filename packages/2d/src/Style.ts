import { Reactive, property } from '@rubickjs/core'
import { PI_2, parseCssFunctions } from '@rubickjs/shared'
import { ColorMatrix } from '@rubickjs/color'
import { DEG_TO_RAD, Transform2D } from '@rubickjs/math'
import type { FontKerning, FontStyle, FontWeight, TextAlign, TextDecoration, TextWrap, VerticalAlign } from 'modern-text'

export interface StyleOptions {
  left?: number
  top?: number
  width?: number
  height?: number
  rotate?: number
  opacity?: number
  backgroundColor?: string
  filter?: string
  borderRadius?: number
  backgroundImage?: string
  transform?: string
  transformOrigin?: string
  color?: string
  fontSize?: number
  fontWeight?: FontWeight
  fontFamily?: string
  fontStyle?: FontStyle
  fontKerning?: FontKerning
  textWrap?: TextWrap
  textAlign?: TextAlign
  verticalAlign?: VerticalAlign
  textDecoration?: TextDecoration | null
  textStrokeWidth?: number
  textStrokeColor?: string
  direction?: 'inherit' | 'ltr' | 'rtl'
  lineHeight?: number
  letterSpacing?: number
  shadowColor?: string
  shadowOffsetX?: number
  shadowOffsetY?: number
  shadowBlur?: number
}

export class Style extends Reactive {
  @property({ default: 0 }) declare left: number
  @property({ default: 0 }) declare top: number
  @property({ default: 0 }) declare width: number
  @property({ default: 0 }) declare height: number
  @property({ default: 0 }) declare rotate: number
  @property({ default: 1 }) declare opacity: number
  @property() backgroundColor?: string
  @property({ default: '' }) declare filter: string
  @property({ default: 0 }) declare borderRadius: number
  @property() backgroundImage?: string
  @property({ default: '' }) declare transform: string
  @property({ default: 'center' }) declare transformOrigin: string
  @property({ default: '#000000' }) declare color: string
  @property({ default: 14 }) declare fontSize: number
  @property({ default: 'normal' }) declare fontWeight: FontWeight
  @property({ default: 'sans-serif' }) declare fontFamily: string
  @property({ default: 'normal' }) declare fontStyle: FontStyle
  @property({ default: 'normal' }) declare fontKerning: FontKerning
  @property({ default: 'wrap' }) declare textWrap: TextWrap
  @property({ default: 'start' }) declare textAlign: TextAlign
  @property({ default: 'middle' }) declare verticalAlign: VerticalAlign
  @property({ default: null }) declare textDecoration: TextDecoration | null
  @property({ default: 0 }) declare textStrokeWidth: number
  @property({ default: '#000000' }) declare textStrokeColor: string
  @property({ default: 'inherit' }) declare direction: 'inherit' | 'ltr' | 'rtl'
  @property({ default: 1 }) declare lineHeight: number
  @property({ default: 0 }) declare letterSpacing: number
  @property({ default: '#000000' }) declare shadowColor: string
  @property({ default: 0 }) declare shadowOffsetX: number
  @property({ default: 0 }) declare shadowOffsetY: number
  @property({ default: 0 }) declare shadowBlur: number

  constructor(options?: StyleOptions) {
    super()
    options && this.setProperties(options)
  }

  get computedTransform(): Transform2D {
    const transform2d = new Transform2D(false)
      .translate(this.left, this.top)
      .rotate(this.rotate * DEG_TO_RAD)

    const transform3d = new Transform2D(false)

    const transform = new Transform2D()
    parseCssFunctions(this.transform ?? '', { width: this.width, height: this.height })
      .forEach(({ name, args }) => {
        const values = args.map(arg => arg.normalizedIntValue)
        transform.identity()
        switch (name) {
          case 'translate':
            transform.translate((values[0]) * this.width, (values[1] ?? values[0]) * this.height)
            break
          case 'translateX':
            transform.translateX(values[0] * this.width)
            break
          case 'translateY':
            transform.translateY(values[0] * this.height)
            break
          case 'translateZ':
            transform.translateZ(values[0])
            break
          case 'translate3d':
            transform.translate3d(
              values[0] * this.width,
              (values[1] ?? values[0]) * this.height,
              values[2] ?? values[1] ?? values[0],
            )
            break
          case 'scale':
            transform.scale(values[0], values[1] ?? values[0])
            break
          case 'scaleX':
            transform.scaleX(values[0])
            break
          case 'scaleY':
            transform.scaleY(values[0])
            break
          case 'scale3d':
            transform.scale3d(values[0], values[1] ?? values[0], values[2] ?? values[1] ?? values[0])
            break
          case 'rotate':
            transform.rotate(values[0] * PI_2)
            break
          case 'rotateX':
            transform.rotateX(values[0] * PI_2)
            break
          case 'rotateY':
            transform.rotateY(values[0] * PI_2)
            break
          case 'rotateZ':
            transform.rotateZ(values[0] * PI_2)
            break
          case 'rotate3d':
            transform.rotate3d(
              values[0] * PI_2,
              (values[1] ?? values[0]) * PI_2,
              (values[2] ?? values[1] ?? values[0]) * PI_2,
              (values[3] ?? values[2] ?? values[1] ?? values[0]) * PI_2,
            )
            break
          case 'skew':
            transform.skew(values[0], values[0] ?? values[1])
            break
          case 'skewX':
            transform.skewX(values[0])
            break
          case 'skewY':
            transform.skewY(values[0])
            break
          case 'matrix':
            transform.set(values)
            break
        }
        transform3d.multiply(transform)
      })

    transform2d.update()
    transform3d.update()

    const t2d = transform2d.toArray()
    const t3d = transform3d.toArray()
    const t3dT2d = [
      (t3d[0] * t2d[0]) + (t3d[3] * t2d[1]),
      (t3d[1] * t2d[0]) + (t3d[4] * t2d[1]),
      (t3d[2] * t2d[0]) + (t3d[5] * t2d[1]) + t2d[2],
      (t3d[0] * t2d[3]) + (t3d[3] * t2d[4]),
      (t3d[1] * t2d[3]) + (t3d[4] * t2d[4]),
      (t3d[2] * t2d[3]) + (t3d[5] * t2d[4]) + t2d[5],
      0, 0, 1,
    ]
    const [originX, originY] = this.computedTransformOrigin
    const offsetX = originX * this.width
    const offsetY = originY * this.height
    t3dT2d[2] += (t3dT2d[0] * -offsetX) + (t3dT2d[1] * -offsetY) + offsetX
    t3dT2d[5] += (t3dT2d[3] * -offsetX) + (t3dT2d[4] * -offsetY) + offsetY
    return new Transform2D().set(t3dT2d)
  }

  get computedTransformOrigin(): Array<number> {
    const [originX, originY = originX] = this.transformOrigin.split(' ')
    return [originX, originY].map(val => {
      val = val.trim()
      switch (val) {
        case 'left':
        case 'top':
          return 0
        case 'center':
          return 0.5
        case 'right':
        case 'bottom':
          return 1
        default:
          return Number(val)
      }
    })
  }

  /** @internal */
  get computedFilter(): ColorMatrix {
    const matrix = new ColorMatrix()
    parseCssFunctions(this.filter).forEach(({ name, args }) => {
      const values = args.map(arg => arg.normalizedIntValue)
      switch (name) {
        case 'hue-rotate':
        case 'hueRotate':
          matrix.hueRotate(values[0] * PI_2)
          break
        case 'saturate':
          matrix.saturate(values[0])
          break
        case 'brightness':
          matrix.brightness(values[0])
          break
        case 'contrast':
          matrix.contrast(values[0])
          break
        case 'invert':
          matrix.invert(values[0])
          break
        case 'sepia':
          matrix.sepia(values[0])
          break
        case 'opacity':
          matrix.opacity(values[0])
          break
        case 'grayscale':
          matrix.grayscale(values[0])
          break
      }
    })
    return matrix
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any) {
    super._onUpdateProperty(key, value, oldValue)

    switch (key) {
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
  }
}
