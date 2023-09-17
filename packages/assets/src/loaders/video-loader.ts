import { Texture } from '@rubickjs/core'
import type { Loader } from '../Loader'

export const videoMime = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
])

export const videoLoader: Loader = {
  test: ({ mime }) => videoMime.has(mime),
  load: async ({ url }): Promise<Texture> => {
    const texture = new Texture(
      await new Promise<HTMLVideoElement>((resolve, reject) => {
        const src = document.createElement('video')
        src.playsInline = true
        src.muted = true
        src.loop = true
        src.src = url
        if (src.readyState >= 2) return resolve(src)
        src.oncanplay = () => resolve(src)
        src.onerror = e => reject(e)
      }),
    )

    texture.name = url

    return texture
  },
}
