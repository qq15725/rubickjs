import { GlobalTicker } from '@rubickjs/core'
import { imageLoader, videoLoader } from './loaders'
import type { Resource } from '@rubickjs/core'
import type { Loader, UrlInfo } from './Loader'

const SUPPORTS_WEAK_REF = 'WeakRef' in globalThis

export class Assets {
  static extToMimeType = new Map<string, string>([
    ['jpeg', 'image/jpeg'],
    ['jpg', 'image/jpeg'],
    ['png', 'image/png'],
    ['webp', 'image/webp'],
    ['avif', 'image/avif'],
    ['svg', 'image/svg+xml'],
    ['gif', 'image/gif'],
    ['mp4', 'video/mp4'],
    ['m4v', 'video/m4v'],
    ['webm', 'video/webm'],
    ['ogv', 'video/ogv'],
    ['ogg', 'video/ogg'],
  ])

  protected static _instance?: Assets
  static get instance() { return this._instance ??= new Assets() }
  static registerLoader(...loaders: Array<Loader>): Assets { return this.instance.registerLoader(...loaders) }
  static unregisterLoader(...loaders: Array<Loader>): Assets { return this.instance.unregisterLoader(...loaders) }
  static clearLoaders(): Assets { return this.instance.clearLoaders() }
  static parseUrl(url: string): Promise<UrlInfo> { return this.instance.parseUrl(url) }
  static get(): Record<string, Resource>
  static get<T extends Resource = Resource>(url: string): T | undefined
  static get(url?: any): any { return this.instance.get(url) }
  static load<T extends Resource = Resource>(url: string): Promise<T> { return this.instance.load(url) }
  static waitUntilLoad(): Promise<void> { return this.instance.waitUntilLoad() }

  protected _loaders = new Set<Loader>()
  protected _requests = new Map<string, Promise<Resource | undefined>>()
  protected _resources = new Map<string, Resource | WeakRef<Resource>>()
  protected _registry = SUPPORTS_WEAK_REF
    ? new FinalizationRegistry<string>(url => this._resources.delete(url))
    : undefined

  constructor() {
    this.registerLoader(imageLoader, videoLoader)
    if (!SUPPORTS_WEAK_REF) {
      GlobalTicker.on(this._gc.bind(this), { sort: 2 })
    }
  }

  registerLoader(...loaders: Array<Loader>): this {
    loaders.forEach(loader => this._loaders.add(loader))
    return this
  }

  unregisterLoader(...loaders: Array<Loader>): this {
    loaders.forEach(loader => this._loaders.delete(loader))
    return this
  }

  clearLoaders(): this {
    this._loaders.clear()
    return this
  }

  get(): Record<string, Resource>
  get<T extends Resource = Resource>(url: string): T | undefined
  get(url?: string): any {
    if (url) {
      let resource = this._resources.get(url)
      if (SUPPORTS_WEAK_REF) {
        resource = (resource as WeakRef<Resource>)?.deref()
        if (!resource) {
          this._resources.delete(url)
        }
      }
      return resource
    } else {
      if (SUPPORTS_WEAK_REF) {
        const resources: Record<string, Resource> = {}
        for (const [key, value] of this._resources.entries()) {
          const resource = (value as WeakRef<Resource>)?.deref()
          if (resource) {
            resources[key] = resource
          } else {
            this._resources.delete(key)
          }
        }
        return resources
      }
      return Object.entries(this._resources.entries())
    }
  }

  async load<T extends Resource = Resource>(url: string): Promise<T> {
    const resource = this.get<T>(url)
    if (resource) return resource
    let request = this._requests.get(url)
    if (!request) {
      this._requests.set(
        url,
        request = this.parseUrl(url)
          .then(info => {
            const loader = this._loader(info)
            if (!loader) {
              return Promise.reject(new Error(`Failed to Assets.load('${ url }')`))
            }
            return loader.load(info)
          })
          .then(resource => {
            this._requests.delete(url)
            this._resources.set(url, SUPPORTS_WEAK_REF ? new WeakRef(resource) : resource)
            this._registry?.register(resource, url)
            return resource
          }),
      )
    }
    if (!request) {
      throw new Error(`Failed to Assets.load('${ url }')`)
    }
    return request as any
  }

  async waitUntilLoad(): Promise<void> {
    await Promise.all(Array.from(this._requests.values()))
  }

  protected _loader(info: UrlInfo) {
    for (const loader of this._loaders) {
      if (loader.test(info)) {
        return loader
      }
    }
    return undefined
  }

  async parseUrl(url: string): Promise<UrlInfo> {
    let path, query, ext, mime
    if (url.startsWith('blob:')) {
      path = url
      query = ''
      mime = await fetch(url)
        .then(res => res.blob())
        .then(blob => blob.type)
        .catch(err => {
          console.warn(`Failed to fetch, url: ${ url }`, err)
          return ''
        })
      ext = mime?.split('/')[1] ?? ''
    } else if (url.startsWith('data:')) {
      path = url
      query = ''
      mime = url.match(/^data:(.+?);/)?.[1] ?? ''
      ext = mime.split('/')[1] ?? ''
    } else {
      [path, query] = url.split('?')
      ext = path.match(/\.(\w+)$/)?.[1] ?? url.match(/\.(\w+)$/)?.[1] ?? ''
      if (ext) {
        mime = Assets.extToMimeType.get(ext) ?? ext
      } else {
        mime = await fetch(url)
          .then(res => res.blob())
          .then(blob => blob.type)
          .catch(err => {
            console.warn(`Failed to fetch, url: ${ url }`, err)
            return ''
          })
        ext = mime?.split('/')[1] ?? ''
      }
    }
    return { url, path, query, ext, mime }
  }

  protected _gc() {
    this._resources.clear()
  }
}
