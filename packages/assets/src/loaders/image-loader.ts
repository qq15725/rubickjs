import { ImageTexture } from '@rubickjs/core'
import type { Loader } from '../Loader'

export const imageLoader: Loader = {
  test: ({ ext }) => ImageTexture.fileExtensions.has(ext),
  load: ({ url }) => new ImageTexture(url).load(),
}
