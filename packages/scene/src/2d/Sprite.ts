import { PointerInputEvent } from '@rubickjs/input'
import { isPromise, isVideoElement } from '@rubickjs/shared'
import { Texture } from '../resources'
import { Node2D } from './Node2D'
import type { UIInputEvent } from '@rubickjs/input'
import type { Rectangle } from '@rubickjs/math'

export interface SpriteFrame {
  /**
   * Duration of the current frame
   */
  duration?: number

  /**
   * Texture of the current frame
   */
  texture: Texture
}

export class Sprite extends Node2D {
  /**
   * Loading
   */
  loading = false

  /**
   * Bounding box
   */
  boundingBox?: Rectangle

  /**
   * All sprite frame
   */
  frames!: SpriteFrame[]

  /**
   * Current frame index
   */
  frame = 0

  /**
   * Total duration of all sprite frame
   */
  duration!: number

  /**
   * Current frame texture
   */
  get texture(): Texture {
    return this.frames[this.frame].texture
  }

  protected isVideo = false

  /**
   * Batchable props
   */
  protected vertices?: Float32Array
  protected readonly indices = new Uint16Array([0, 1, 2, 0, 2, 3])
  protected readonly uvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1])

  needsUpdateVertices() { this.addDirty('vertices') }

  constructor(value: Texture | Array<SpriteFrame> | Promise<Texture | Array<SpriteFrame>>) {
    super()

    if (isPromise<Texture | Array<SpriteFrame>>(value)) {
      this.loadTexture(value)
    } else {
      this.setTexture(value)
    }
  }

  protected override _onUpdateSize() {
    super._onUpdateSize()
    this._updateScale()
  }

  async loadTexture(val: Promise<Texture | Array<SpriteFrame>>): Promise<void> {
    try {
      this.loading = true
      this.frames = [{ duration: 0, texture: Texture.EMPTY }]
      this.duration = 0
      const result = await val
      this.setTexture(result)
    } finally {
      this.loading = false
    }
  }

  setTexture(val: Texture | Array<SpriteFrame>): void {
    if (Array.isArray(val)) {
      this.frames = val
    } else {
      this.frames = [{ duration: 0, texture: val }]
    }
    this.duration = this.frames.reduce((total, frame) => total + (frame.duration ?? 0), 0)

    this.size.copy(this.frames[0].texture.size)
    this._updateScale()
    this.isVideo = isVideoElement(this.texture.source)
    this.needsUpdateVertices()
  }

  protected override _onUpdateTransform() {
    this.needsUpdateVertices()
  }

  protected _updateScale() {
    const { x: width, y: height } = this.size
    const { x: textureWidth, y: textureHeight } = this.texture.size

    if (width && height && textureWidth && textureHeight) {
      this.scale.update(
        (this.scale.x < 0 ? -1 : 1) * width / textureWidth,
        (this.scale.y < 0 ? -1 : 1) * height / textureHeight,
      )
    }
  }

  protected _updateVertices(): void {
    let { x: width, y: height } = this.texture.size

    if (!width || !height) return

    const { x: originX, y: originY } = this.transformOrigin

    const [
      a, c, _tx,
      b, d, _ty,
    ] = this.globalTransform
    const tx = _tx + (originX * this.size.x)
    const ty = _ty + (originY * this.size.y)

    let x = 0; let y = 0
    if (this.boundingBox) {
      ({ x, y, width, height } = this.boundingBox)
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

  protected _updateFrame(currentTime?: number): void {
    currentTime = (currentTime ?? this.currentTime) - this.visibleTime

    if (currentTime < 0) {
      this.frame = 0
      return
    }

    currentTime = this.duration ? currentTime % this.duration : 0
    const frames = this.frames
    const len = frames.length

    if (this.isVideo) {
      const source = this.texture.source as HTMLVideoElement
      currentTime /= 1000
      if (source.currentTime !== currentTime && !source.seeking) {
        source.currentTime = currentTime
        this.texture.update()
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

      this.frame = index
    }
  }

  input(event: UIInputEvent) {
    super.input(event)

    if (!event.target) {
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

  protected override _render(currentTime: number) {
    this._updateFrame(currentTime)

    if (this.hasDirty('vertices')) {
      this.deleteDirty('vertices')
      this._updateVertices()
    }

    if (this.vertices) {
      this.renderer.batch.render({
        vertices: this.vertices,
        indices: this.indices,
        uvs: this.uvs,
        texture: (this.filter?.redrawTexture(this.texture, this) ?? this.texture).getRelated(),
        background: this._backgroundColor.abgr,
      })
    }
  }
}
