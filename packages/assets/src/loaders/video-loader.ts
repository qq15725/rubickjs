import { VideoTexture } from '@rubickjs/core'
import type { Loader } from '../Loader'

export const videoLoader: Loader = {
  test: ({ ext }) => VideoTexture.TYPES.has(ext),
  load: ({ url }) => new VideoTexture(url).load(),
}
