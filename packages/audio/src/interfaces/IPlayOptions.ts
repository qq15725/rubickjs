import type { AudioProcessor } from '../pipeline'

export interface IPlayOptions {
  start?: number
  end?: number
  playbackRate?: number
  loop?: boolean
  volume?: number
  muted?: boolean
  processors?: Array<AudioProcessor>
  complete?: () => void
  multiple?: boolean
}
