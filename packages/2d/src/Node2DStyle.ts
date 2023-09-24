import { DEG_TO_RAD, RAD_TO_DEG, Transform2D } from '@rubickjs/math'
import { parseCssFunctions } from '@rubickjs/shared'
import { CanvasItemStyle } from './CanvasItemStyle'
import type { Node2D } from './Node2D'

export class Node2DStyle extends CanvasItemStyle {
  get left() { return this._source.transform.position.x }
  set left(val) { this._source.transform.position.x = val }
  get top() { return this._source.transform.position.y }
  set top(val) { this._source.transform.position.y = val }
  get width() { return this._source.size.x }
  set width(val) { this._source.size.x = val }
  get height() { return this._source.size.y }
  set height(val) { this._source.size.y = val }
  get rotate() { return this._source.transform.rotation * RAD_TO_DEG }
  set rotate(val) { this._source.transform.rotation = val * DEG_TO_RAD }
  get transformOrigin() { return `${ this._source.transformOrigin[0] }, ${ this._source.transformOrigin[1] }` }
  set transformOrigin(val) {
    const [x, y] = val.split(',').map((val: string) => Number(val.trim()))
    this._source.transformOrigin.update(x, y)
  }

  protected _transform?: string
  get transform() { return this._transform }
  set transform(val) {
    if (val === this._transform) {
      return
    }

    this._transform = val

    this._source.transform2.identity()
    const transform = new Transform2D()
    parseCssFunctions(val ?? '').forEach(({ name, args }) => {
      const values = args.map(arg => arg.normalized)
      transform.identity()
      switch (name) {
        case 'translate':
        case 'translate3d':
          transform.position.update(values[0], values[1] ?? values[0])
          transform[8] = values[2] ?? 1
          break
        case 'translateX':
          transform.position.x = values[0]
          break
        case 'translateY':
          transform.position.y = values[0]
          break
        case 'translateZ':
          transform[8] = values[0]
          break
        case 'scale':
        case 'scale3d':
          transform.scale.update(values[0] ?? 1, values[1] ?? values[0] ?? 1)
          break
        case 'scaleX':
          transform.scale.x = values[0]
          break
        case 'scaleY':
          transform.scale.y = values[0]
          break
        case 'rotate':
        case 'rotateZ':
          transform.rotation = values[0]
          break
        case 'rotateX':
          transform.scale.y = rotate2Scale(values[0])
          break
        case 'rotateY':
          transform.scale.x = rotate2Scale(values[0])
          break
        case 'rotate3d': {
          const [rx, ry, rz] = decomposeRotate3d(values[0], values[1], values[2], values[3])
          rx && (transform.scale.y = rotate2Scale(rx))
          ry && (transform.scale.x = rotate2Scale(ry))
          rz && (transform.rotation = rz)
          break
        }
        case 'skew':
          transform.skew.update(values[0], values[1])
          break
        case 'skewX':
          transform.skew.x = values[0]
          break
        case 'skewY':
          transform.skew.y = values[0]
          break
        case 'matrix':
          transform.set(values)
          break
      }
      transform.update()
      this._source.transform2.multiply(transform)
    })
    this._source.transform2.sync()
    this._source.transform2.dirtyId++
  }

  constructor(
    protected _source: Node2D,
  ) {
    super(_source)
  }
}

function rotate2Scale(deg: number) {
  return deg / 360 <= 0.5 ? deg / 360 * -4 + 1 : (deg / 360 - 1) * 4 + 1
}

function decomposeRotate3d(x: number, y: number, z: number, angle: number): [number, number, number] {
  if (x === 1 && y === 0 && z === 0) {
    return [angle, 0, 0]
  } else if (x === 0 && y === 1 && z === 0) {
    return [0, angle, 0]
  } else if (x === 0 && y === 0 && z === 1) {
    return [0, 0, angle]
  } else {
    const rad = angle * Math.PI / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)

    const m11 = cos + x * x * (1 - cos)
    const m12 = x * y * (1 - cos) - z * sin
    const m13 = x * z * (1 - cos) + y * sin
    const m22 = cos + y * y * (1 - cos)
    const m23 = y * z * (1 - cos) - x * sin
    const m33 = cos + z * z * (1 - cos)

    const rotateX = -Math.atan2(-m23, m22) * 180 / Math.PI
    const rotateY = -Math.atan2(m13, Math.sqrt(m23 * m23 + m33 * m33)) * 180 / Math.PI
    const rotateZ = -Math.atan2(-m12, m11) * 180 / Math.PI

    return [rotateX, rotateY, rotateZ]
  }
}
