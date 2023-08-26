import { uid } from '@rubickjs/shared'
import type { WebGLDrawOptions, WebGLVertexArrayObjectOptions, WebGLVertexAttrib } from './WebGL'
import type { WebGLRenderer } from './WebGLRenderer'

export interface Batchable {
  texture: WebGLTexture
  vertices: ArrayLike<number>
  indices: ArrayLike<number>
  uvs: ArrayLike<number>
  backgroundColor?: number
  tint?: number
  colorMatrix?: ArrayLike<number>
  colorMatrixOffset?: ArrayLike<number>
}

type DrawCall = WebGLDrawOptions & {
  id: number
  textures: WebGLTexture[]
}

interface Shader {
  updateBuffer(attributeBuffer: ArrayBuffer, indexBuffer: Uint16Array): void
  draw(options?: WebGLDrawOptions): void
}

export class WebGLBatchRenderer {
  batchSize = 4096 * 4
  batchables: Batchable[] = []
  vertexCount = 0
  indexCount = 0

  /**
   * Size of data being buffered per vertex in the attribute buffers
   */
  protected _attributes: Record<string, Partial<WebGLVertexAttrib>> = {
    aTextureId: { size: 1, normalized: true, type: 'float' }, // 1
    aPosition: { size: 2, normalized: false, type: 'float' }, // 2
    aUv: { size: 2, normalized: false, type: 'float' }, // 2
    aTint: { size: 4, normalized: true, type: 'unsigned_byte' }, // 1
    aBackgroundColor: { size: 4, normalized: true, type: 'unsigned_byte' }, // 1
    aColorMatrixOffset: { size: 4, normalized: false, type: 'float' }, // 4
    aColorMatrix: { size: 4, normalized: false, type: 'float' }, // 16
  }

  protected _vertexSize = 1 + 2 + 2 + 1 + 1 + 4 + 16
  protected _attributeBuffer: Array<ArrayBuffer> = []
  protected _indexBuffers: Array<Uint16Array> = []
  protected _shaders = new Map<number, Shader>()
  protected _defaultTint = 0xFFFFFFFF
  protected _defaultBackgroundColor = 0x00000000
  protected _defaultColorMatrix = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]

  protected _defaultColorMatrixOffset = [0, 0, 0, 0]

  constructor(
    public renderer: WebGLRenderer,
  ) {
    //
  }

  getShader(maxTextures: number) {
    let shader = this._shaders.get(maxTextures)
    if (!shader) {
      this._shaders.set(maxTextures, shader = this.createShader(maxTextures))
    }
    return shader
  }

  createShader(maxTextures: number) {
    const program = this.renderer.createProgram({
      vert: `precision highp float;
attribute float aTextureId;
attribute vec2 aPosition;
attribute vec2 aUv;
attribute vec4 aTint;
attribute vec4 aBackgroundColor;
attribute mat4 aColorMatrix;
attribute vec4 aColorMatrixOffset;

uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;
uniform vec4 tint;

varying float vTextureId;
varying vec2 vUv;
varying vec4 vTint;
varying vec4 vBackgroundColor;
varying mat4 vColorMatrix;
varying vec4 vColorMatrixOffset;

void main(void) {
  vTextureId = aTextureId;
  gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vUv = aUv;
  vTint = aTint * tint;
  vBackgroundColor = aBackgroundColor;
  vColorMatrix = aColorMatrix;
  vColorMatrixOffset = aColorMatrixOffset;
}`,
      frag: `precision highp float;
varying float vTextureId;
varying vec2 vUv;
varying vec4 vTint;
varying vec4 vBackgroundColor;
varying mat4 vColorMatrix;
varying vec4 vColorMatrixOffset;

uniform sampler2D samplers[${ maxTextures }];

void main(void) {
  vec4 color;
${ Array.from({ length: maxTextures }, (_, i) => {
        let text = '  '
        if (i > 0) {
          text += '\n  else '
        }
        if (i < maxTextures - 1) {
          text += `if (vTextureId < ${ i }.5)`
        }
        return `${ text }\n  {\n    color = texture2D(samplers[${ i }], vUv);\n  }`
      }).join('') }

  color *= vTint;
  color += (1.0 - color.a) * vBackgroundColor;
  color = vColorMatrix * color;
  if (color.a > 0.0) {
    color += vColorMatrixOffset;
  }
  gl_FragColor = color;
}`,
    })

    const buffer = this.renderer.createBuffer({
      target: 'array_buffer',
      data: new Float32Array(1),
      usage: 'dynamic_draw',
    })

    const elementArrayBuffer = this.renderer.createBuffer({
      target: 'element_array_buffer',
      data: new Uint16Array(1),
      usage: 'dynamic_draw',
    })

    const vertexArray: WebGLVertexArrayObjectOptions = {
      attributes: Object.fromEntries(
        Object.entries(this._attributes)
          .map(([key, value]) => [key, { ...value, buffer }]),
      ),
      elementArrayBuffer,
    }

    const vao = this.renderer.createVertexArray(program, vertexArray)

    const samplers = new Int32Array(
      Array.from({ length: maxTextures }, (_, i) => i),
    )

    return {
      updateBuffer: (attributeBuffer, indexBuffer) => {
        this.renderer.updateBuffer(buffer, { target: 'array_buffer', data: attributeBuffer })
        this.renderer.updateBuffer(elementArrayBuffer, { target: 'element_array_buffer', data: indexBuffer })
      },
      draw: (options) => {
        this.renderer.activeProgram(program)
        this.renderer.updateUniforms(program, {
          samplers,
          tint: [1, 1, 1, 1],
          translationMatrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
          ...this.renderer.uniforms,
        })
        this.renderer.activeVertexArray(vao ?? vertexArray)
        this.renderer.draw(options)
      },
    } as Shader
  }

  render(batchable: Batchable): void {
    const { vertices, indices } = batchable

    const vertexCount = vertices.length / 2

    if (this.vertexCount + vertexCount > this.batchSize) {
      this.flush()
    }

    this.vertexCount += vertexCount
    this.indexCount += indices.length
    this.batchables.push(batchable)
  }

  flush(): boolean {
    if (this.vertexCount === 0) {
      return false
    }

    const vertexCount = this.vertexCount
    const indexCount = this.indexCount
    const batchables = this.batchables
    this.batchables = []
    this.vertexCount = 0
    this.indexCount = 0

    const maxTextures = this.renderer.maxTextureImageUnits
    const attributeBuffer = this.getAttributeBuffer(vertexCount)
    const float32View = new Float32Array(attributeBuffer)
    const uint32View = new Uint32Array(attributeBuffer)
    const indexBuffer = this.getIndexBuffer(indexCount)
    let aIndex = 0
    let iIndex = 0
    const drawCalls: DrawCall[] = []

    for (
      let len = batchables.length,
        drawCall = { id: uid() } as DrawCall,
        textures: WebGLTexture[] = [],
        textureCount = 0,
        start = 0,
        end = 0;
      end < len;
      end++
    ) {
      const textureAny = batchables[end].texture as any
      const isLast = end === len - 1
      if (textureAny._drawCallId === drawCall.id) {
        if (!isLast) {
          continue
        }
      } else {
        textureAny._drawCallId = drawCall.id
        textureAny._drawCallTextureUnit = textureCount
        textures.push(textureAny)
        textureCount++
      }

      if (isLast || textureCount >= maxTextures) {
        drawCall.textures = textures
        textures = []
        textureCount = 0
        drawCall.first = iIndex
        for (let i = start; i <= end; i++) {
          const {
            indices,
            vertices,
            uvs,
            texture,
            tint = this._defaultTint,
            backgroundColor = this._defaultBackgroundColor,
            colorMatrix = this._defaultColorMatrix,
            colorMatrixOffset = this._defaultColorMatrixOffset,
          } = batchables[i]
          const iIndexStart = aIndex / this._vertexSize
          for (let len = vertices.length, i = 0; i < len; i += 2) {
            float32View[aIndex++] = (texture as any)._drawCallTextureUnit
            float32View[aIndex++] = vertices[i]
            float32View[aIndex++] = vertices[i + 1]
            float32View[aIndex++] = uvs[i]
            float32View[aIndex++] = uvs[i + 1]
            uint32View[aIndex++] = tint
            uint32View[aIndex++] = backgroundColor
            for (let i = 0; i < 4; i++) {
              float32View[aIndex++] = colorMatrixOffset[i] ?? 0
            }
            for (let i = 0; i < 16; i++) {
              float32View[aIndex++] = colorMatrix[i] ?? 0
            }
          }
          for (let len = indices.length, i = 0; i < len; i++) {
            indexBuffer[iIndex++] = iIndexStart + indices[i]
          }
        }
        start = end
        drawCall.count = iIndex - drawCall.first
        drawCalls.push(drawCall)
        drawCall = { id: uid() } as DrawCall
      }
    }

    const shader = this.getShader(maxTextures)

    shader.updateBuffer(attributeBuffer, indexBuffer)

    for (let len = drawCalls.length, i = 0; i < len; i++) {
      const drawCall = drawCalls[i]
      const { first = 0, textures } = drawCall

      for (let len = textures.length, i = 0; i < len; i++) {
        const texture = textures[i]
        const unit = (texture as any)._drawCallTextureUnit

        this.renderer.activeTexture({
          target: 'texture_2d',
          unit,
          value: texture,
        })
      }

      shader.draw({
        mode: 'triangles',
        count: drawCall.count,
        first: first / 2,
        bytesPerElement: 2,
      })
    }

    return true
  }

  /**
   * Fetches an attribute buffer from `this._attributeBuffer` that can hold atleast `size` floats.
   * @param size - minimum capacity required
   * @returns - buffer than can hold atleast `size` floats
   */
  getAttributeBuffer(size: number): ArrayBuffer {
    // 8 vertices is enough for 2 quads
    const roundedP2 = nextPow2(Math.ceil(size / 8))
    const roundedSizeIndex = log2(roundedP2)
    const roundedSize = roundedP2 * 8

    if (this._attributeBuffer.length <= roundedSizeIndex) {
      this._indexBuffers.length = roundedSizeIndex + 1
    }

    let buffer = this._attributeBuffer[roundedSize]

    if (!buffer) {
      this._attributeBuffer[roundedSize] = buffer = new ArrayBuffer(roundedSize * this._vertexSize * 4)
    }

    return buffer
  }

  /**
   * Fetches an index buffer from `this._indexBuffers` that can
   * have at least `size` capacity.
   * @param size - minimum required capacity
   * @returns - buffer that can fit `size` indices.
   */
  getIndexBuffer(size: number): Uint16Array {
    // 12 indices is enough for 2 quads
    const roundedP2 = nextPow2(Math.ceil(size / 12))
    const roundedSizeIndex = log2(roundedP2)
    const roundedSize = roundedP2 * 12

    if (this._indexBuffers.length <= roundedSizeIndex) {
      this._indexBuffers.length = roundedSizeIndex + 1
    }

    let buffer = this._indexBuffers[roundedSizeIndex]

    if (!buffer) {
      this._indexBuffers[roundedSizeIndex] = buffer = new Uint16Array(roundedSize)
    }

    return buffer
  }
}

/**
 * Rounds to next power of two.
 * @param {number} v - input value
 * @returns {number} - next rounded power of two
 */
export function nextPow2(v: number): number {
  v += v === 0 ? 1 : 0
  --v
  v |= v >>> 1
  v |= v >>> 2
  v |= v >>> 4
  v |= v >>> 8
  v |= v >>> 16

  return v + 1
}

/**
 * Computes ceil of log base 2
 * @param {number} v - input value
 * @returns {number} logarithm base 2
 */
export function log2(v: number): number {
  let r = (v > 0xFFFF ? 1 : 0) << 4

  v >>>= r

  let shift = (v > 0xFF ? 1 : 0) << 3

  v >>>= shift; r |= shift
  shift = (v > 0xF ? 1 : 0) << 2
  v >>>= shift; r |= shift
  shift = (v > 0x3 ? 1 : 0) << 1
  v >>>= shift; r |= shift

  return r | (v >> 1)
}
