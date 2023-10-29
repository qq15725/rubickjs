import type { WebGLRenderer } from '../WebGLRenderer'

export interface WebGLModuleConstructor<T extends WebGLModule = WebGLModule> {
  new (renderer: WebGLRenderer): T
}

export abstract class WebGLModule {
  get gl() { return this._renderer.gl }

  constructor(
    protected _renderer: WebGLRenderer,
  ) {
    //
  }

  onUpdateContext(): void { /** override */ }
  flush(): void { /** override */ }
  reset(): void { /** override */ }
  destroy(): void { /** override */ }
}
