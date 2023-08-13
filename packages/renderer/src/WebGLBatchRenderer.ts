import { uid } from '@rubickjs/shared'
import type { WebGLRenderer } from './WebGLRenderer'
import type { WebGLDrawOptions, WebGLVertexArrayObjectOptions } from './WebGL'

export interface Batchable {
  texture: WebGLTexture
  vertices: ArrayLike<number>
  indices: ArrayLike<number>
  uvs: ArrayLike<number>
  tint?: number
  background?: number
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
  renderer: WebGLRenderer
  batchSize = 4096 * 4

  batchables: Batchable[] = []
  vertexCount = 0
  indexCount = 0

  /**
   * Size of data being buffered per vertex in the
   * attribute buffers (in floats). By default, the
   * batch-renderer uses 7:
   *
   * | position       | 2 |
   * | uv             | 2 |
   * | tint           | 1 |
   * | background     | 1 |
   * | textureId      | 1 |
   */
  protected vertexSize = 7
  protected attributeBuffer: Array<ArrayBuffer> = []
  protected indexBuffers: Array<Uint16Array> = []
  protected shaders = new Map<number, Shader>()

  constructor(renderer: WebGLRenderer) {
    this.renderer = renderer
  }

  getShader(maxTextures: number) {
    let shader = this.shaders.get(maxTextures)
    if (!shader) {
      this.shaders.set(maxTextures, shader = this.createShader(maxTextures))
    }
    return shader
  }

  createShader(maxTextures: number) {
    const program = this.renderer.createProgram({
      vert: `precision highp float;
attribute vec2 aPosition;
attribute vec2 aUv;
attribute vec4 aTint;
attribute vec4 aBackground;
attribute float aTextureId;

uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;
uniform vec4 tint;

varying vec2 vUv;
varying vec4 vTint;
varying vec4 vBackground;
varying float vTextureId;

void main(void) {
  gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aPosition, 1.0)).xy, 0.0, 1.0);

  vUv = aUv;
  vTint = aTint * tint;
  vBackground = aBackground;
  vTextureId = aTextureId;
}`,
      frag: `precision highp float;
varying vec2 vUv;
varying vec4 vTint;
varying vec4 vBackground;
varying float vTextureId;
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
  gl_FragColor = (color + (1.0 - color.a) * vBackground) * vTint;
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
      attributes: {
        aPosition: { buffer, size: 2, normalized: false, type: 'float' },
        aUv: { buffer, size: 2, normalized: false, type: 'float' },
        aTint: { buffer, size: 4, normalized: true, type: 'unsigned_byte' },
        aBackground: { buffer, size: 4, normalized: true, type: 'unsigned_byte' },
        aTextureId: { buffer, size: 1, normalized: true, type: 'float' },
      },
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
          const { indices, vertices, uvs, texture, tint, background } = batchables[i]
          const iIndexStart = aIndex / this.vertexSize
          for (let len = vertices.length, i = 0; i < len; i += 2) {
            float32View[aIndex++] = vertices[i]
            float32View[aIndex++] = vertices[i + 1]
            float32View[aIndex++] = uvs[i]
            float32View[aIndex++] = uvs[i + 1]
            uint32View[aIndex++] = tint ?? 4294967295
            uint32View[aIndex++] = background ?? 0
            float32View[aIndex++] = (texture as any)._drawCallTextureUnit
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
   * Fetches an attribute buffer from `this.attributeBuffer` that can hold atleast `size` floats.
   * @param size - minimum capacity required
   * @returns - buffer than can hold atleast `size` floats
   */
  getAttributeBuffer(size: number): ArrayBuffer {
    // 8 vertices is enough for 2 quads
    const roundedP2 = nextPow2(Math.ceil(size / 8))
    const roundedSizeIndex = log2(roundedP2)
    const roundedSize = roundedP2 * 8

    if (this.attributeBuffer.length <= roundedSizeIndex) {
      this.indexBuffers.length = roundedSizeIndex + 1
    }

    let buffer = this.attributeBuffer[roundedSize]

    if (!buffer) {
      this.attributeBuffer[roundedSize] = buffer = new ArrayBuffer(roundedSize * this.vertexSize * 4)
    }

    return buffer
  }

  /**
   * Fetches an index buffer from `this.indexBuffers` that can
   * have at least `size` capacity.
   * @param size - minimum required capacity
   * @returns - buffer that can fit `size` indices.
   */
  getIndexBuffer(size: number): Uint16Array {
    // 12 indices is enough for 2 quads
    const roundedP2 = nextPow2(Math.ceil(size / 12))
    const roundedSizeIndex = log2(roundedP2)
    const roundedSize = roundedP2 * 12

    if (this.indexBuffers.length <= roundedSizeIndex) {
      this.indexBuffers.length = roundedSizeIndex + 1
    }

    let buffer = this.indexBuffers[roundedSizeIndex]

    if (!buffer) {
      this.indexBuffers[roundedSizeIndex] = buffer = new Uint16Array(roundedSize)
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
