import { PointerInputEvent } from '@rubickjs/input'
import { isPromise } from '@rubickjs/shared'
import { PixelsTexture, VideoTexture } from '@rubickjs/core'
import { clamp } from '@rubickjs/math'
import { Node2D } from './Node2D'
import type { NodeProcessContext, Texture } from '@rubickjs/core'
import type { WebGLRenderer } from '@rubickjs/renderer'
import type { UIInputEvent } from '@rubickjs/input'
import type { Rectangle } from '@rubickjs/math'

export interface SpriteFrame {
  /** Duration of the current frame */
  duration?: number
  /** Texture of the current frame */
  texture: Texture
}

export class Sprite extends Node2D {
  protected override _renderable = true

  loading = false
  trim?: Rectangle
  frames!: SpriteFrame[]
  frame = 0
  duration!: number
  get texture(): Texture { return this.frames[this.frame].texture }

  /**
   * Batchable props
   */
  protected vertices?: Float32Array
  protected readonly indices = new Uint16Array([0, 1, 2, 0, 2, 3])
  protected readonly uvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1])

  constructor(value: Texture | Array<SpriteFrame> | Promise<Texture | Array<SpriteFrame>>) {
    super()

    if (isPromise<Texture | Array<SpriteFrame>>(value)) {
      this.loadTexture(value)
    } else {
      this.updateTexture(value)
    }
  }

  async loadTexture(val: Promise<Texture | Array<SpriteFrame>>): Promise<void> {
    try {
      this.loading = true
      this.frames = [{ duration: 0, texture: PixelsTexture.EMPTY }]
      this.duration = 0
      const result = await val
      this.updateTexture(result)
    } finally {
      this.loading = false
    }
  }

  updateTexture(val: Texture | Array<SpriteFrame>, useTextureSize = true): void {
    this.frame = 0
    if (Array.isArray(val)) {
      this.frames = val
    } else {
      this.frames = [{ duration: 0, texture: val }]
    }
    this.updateDuration()
    if (useTextureSize) {
      this.size.copy(this.texture.size)
    }
    this._onUpdateTexture()
  }

  updateDuration() {
    this.duration = this.frames.reduce((total, frame) => total + (frame.duration ?? 0), 0)
  }

  updateScale() {
    if (!this.hasDirty('scale')) {
      return
    }

    this.deleteDirty('scale')

    const { x: width, y: height } = this.size
    const { x: textureWidth, y: textureHeight } = this.texture.size

    if (width && height && textureWidth && textureHeight) {
      this.scale.update(
        (this.scale.x < 0 ? -1 : 1) * width / textureWidth,
        (this.scale.y < 0 ? -1 : 1) * height / textureHeight,
      )
    }
  }

  updateVertices(): void {
    let { x: width, y: height } = this.texture.size

    if (
      !this.hasDirty('vertices')
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
    this.vertices = vertices
  }

  protected _onUpdateTexture() {
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

  updateFrame(currentTime: number): void {
    currentTime = currentTime - this.visibleStartTime

    if (currentTime < 0) {
      this.frame = 0
      return
    }

    currentTime = this.duration ? currentTime % this.duration : 0
    const frames = this.frames
    const len = frames.length

    const texture = this.texture
    if (texture instanceof VideoTexture) {
      const source = texture.source
      if (!texture.isPlaying && !source.seeking) {
        currentTime = ~~currentTime / 1000
        if (source.currentTime !== currentTime) {
          source.currentTime = currentTime
        }
      }
    } else {
      let index = len - 1

      for (let time = 0, i = 0; i < len; i++) {
        time += frames[i]?.duration ?? 0
        if (time >= currentTime) {
          index = i
          break
        }
      }

      this.frame = clamp(0, index, this.frames.length - 1)
    }
  }

  override input(event: UIInputEvent) {
    super.input(event)

    if (!event.target && this.needsRender()) {
      if (event instanceof PointerInputEvent) {
        const inverse = this.globalTransform.inverse()
        const { x: width, y: height } = this.texture.size
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
    return this.vertices !== undefined && super.isVisible()
  }

  protected override _process(context: NodeProcessContext) {
    this.updateFrame(context.currentTime)
    this.updateScale()
    super._process(context)
    this.updateVertices()
  }

  protected override _render(renderer: WebGLRenderer): void {
    if (!this.vertices) {
      return
    }

    this.texture.upload(renderer)

    renderer.batch.render({
      vertices: this.vertices,
      indices: this.indices,
      uvs: this.uvs,
      texture: this.texture.glTexture(renderer),
      backgroundColor: this._backgroundColor.abgr,
      tint: (this.globalAlpha * 255 << 24) + this._tint.bgr,
      colorMatrix: this.colorMatrix.toMatrix4().toArray(true),
      colorMatrixOffset: this.colorMatrix.toVector4().toArray(),
    })
  }
}
