import { Texture } from '@rubickjs/scene'
import type { Loader } from '../Loader'

export const imageMime = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/svg+xml',
])

export const imageLoader: Loader = {
  test: ({ mime }) => imageMime.has(mime),
  load: async ({ url }): Promise<Texture> => {
    const texture = new Texture(
      await new Promise<HTMLImageElement>((resolve, reject) => {
        const src = new Image()
        src.crossOrigin = 'anonymous'
        src.src = url
        if (src.complete) {
          resolve(src)
        } else {
          src.onload = () => resolve(src)
          src.onerror = e => reject(e)
        }
      }),
    )

    texture.name = url

    return texture
  },
}
