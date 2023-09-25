import { PointerInputEvent } from '@rubickjs/input'
import { Texture } from '@rubickjs/core'
import { Node2D } from './Node2D'
import type { WebGLRenderer } from '@rubickjs/renderer'
import type { UIInputEvent } from '@rubickjs/input'
import type { Rectangle } from '@rubickjs/math'

export class Sprite<T extends Texture = Texture> extends Node2D {
  /** Flag */
  protected override _renderable = true

  /** Trim area */
  trim?: Rectangle

  protected _texture!: T
  get texture() { return this._texture }
  set texture(val) { this._updateProp('_texture', val, { on: '_onUpdateTexture' }) }

  /** Batch draw */
  protected _vertices?: Float32Array
  protected _indices = new Uint16Array([0, 1, 2, 0, 2, 3])
  protected _uvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1])

  constructor(texture: T = Texture.EMPTY as any) {
    super()
    this.texture = texture
  }

  updateScale() {
    if (!this.hasDirty('scale') && !this._texture.hasDirty('size')) {
      return
    }

    this.deleteDirty('scale')

    const { x: width, y: height } = this.size
    const { x: textureWidth, y: textureHeight } = this._texture.size

    if (width && height && textureWidth && textureHeight) {
      this.scale.update(
        (this.scale.x < 0 ? -1 : 1) * width / textureWidth,
        (this.scale.y < 0 ? -1 : 1) * height / textureHeight,
      )
    }
  }

  updateVertices(): void {
    let { x: width, y: height } = this._texture.size

    if (
      (!this.hasDirty('vertices') && !this._texture.hasDirty('size'))
      || !width
      || !height
    ) {
      return
    }

    this.deleteDirty('vertices')

    const { x: originX, y: originY } = this.transformOrigin

    const [
      a, c, _tx,
      b, d, _ty,
    ] = this.globalTransform
    const tx = _tx + (originX * this.size.x)
    const ty = _ty + (originY * this.size.y)

    let x = 0; let y = 0
    if (this.trim) {
      ({ x, y, width, height } = this.trim)
    }

    const x0 = x - (originX * width)
    const x1 = x0 + width
    const y0 = y - (originY * height)
    const y1 = y0 + height

    const vertices = new Float32Array(8)
    vertices[0] = (a * x0) + (c * y0) + tx
    vertices[1] = (b * x0) + (d * y0) + ty
    vertices[2] = (a * x1) + (c * y0) + tx
    vertices[3] = (b * x1) + (d * y0) + ty
    vertices[4] = (a * x1) + (c * y1) + tx
    vertices[5] = (b * x1) + (d * y1) + ty
    vertices[6] = (a * x0) + (c * y1) + tx
    vertices[7] = (b * x0) + (d * y1) + ty
    this._vertices = vertices
  }

  protected _onUpdateTexture(texture: Texture, _oldTexture: Texture) {
    this.size.copy(texture.size)
    this.scheduleUpdateScale()
    this.scheduleUpdateVertices()
  }

  protected override _onUpdateSize() {
    super._onUpdateSize()
    this.scheduleUpdateScale()
  }

  protected override _onUpdateTransform() {
    super._onUpdateTransform()
    this.scheduleUpdateVertices()
  }

  scheduleUpdateVertices() { this.addDirty('vertices') }
  scheduleUpdateScale() { this.addDirty('scale') }

  override input(event: UIInputEvent) {
    super.input(event)

    if (!event.target && this.needsRender()) {
      if (event instanceof PointerInputEvent) {
        const inverse = this.globalTransform.inverse()
        const { x: width, y: height } = this._texture.size
        const { x: originX, y: originY } = this.transformOrigin

        let { screenX, screenY } = event
        screenX -= (originX * this.size.x)
        screenY -= (originY * this.size.y)

        const [
          a, c, tx,
          b, d, ty,
        ] = inverse

        let x = a * screenX + c * screenY + tx
        let y = b * screenX + d * screenY + ty

        x += (originX * width)
        y += (originY * height)

        if (x >= 0 && x < width && y >= 0 && y < height) {
          event.target = this
        }
      }
    }
  }

  override isVisible(): boolean {
    return this._vertices !== undefined && super.isVisible()
  }

  protected override _process(delta: number) {
    this.updateScale()
    super._process(delta)
    this.updateVertices()
  }

  protected override _render(renderer: WebGLRenderer): void {
    if (!this._vertices) {
      return
    }

    this._texture.upload(renderer)

    renderer.batch.render({
      vertices: this._vertices,
      indices: this._indices,
      uvs: this._uvs,
      texture: this._texture.glTexture(renderer),
      backgroundColor: this._backgroundColor.abgr,
      tint: (this.globalAlpha * 255 << 24) + this._tint.bgr,
      colorMatrix: this.colorMatrix.toMatrix4().toArray(true),
      colorMatrixOffset: this.colorMatrix.toVector4().toArray(),
    })
  }
}
