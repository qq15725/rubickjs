import type { WebGLRenderer } from './WebGLRenderer'

let activeRenderer: WebGLRenderer | undefined
export function setCurrentRenderer(renderer: WebGLRenderer | undefined) {
  activeRenderer = renderer
}

export function getCurrentRenderer(): WebGLRenderer
export function getCurrentRenderer(orFail: false): WebGLRenderer | undefined
export function getCurrentRenderer(orFail = true): WebGLRenderer | undefined {
  if (orFail && !activeRenderer) throw new Error('Failed to getCurrentRenderer, current WebGLRenderer not found')
  return activeRenderer
}
