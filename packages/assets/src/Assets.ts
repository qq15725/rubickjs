import { imageLoader, videoLoader } from './loaders'
import type { Loader, UrlInfo } from './Loader'
import type { Resource } from '@rubickjs/core'

export class Assets {
  static readonly EXT_TO_MIME_TYPE = new Map<string, string>([
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

  static readonly requests = new Map<string, Promise<any>>()
  static readonly resources = new Map<string, any>()

  static loaders = new Set<Loader>([
    imageLoader,
    videoLoader,
  ])

  static get<T = Resource>(url: string): T | undefined {
    return this.resources.get(url)
  }

  protected static _matchLoader(info: UrlInfo) {
    for (const loader of this.loaders) {
      if (loader.test(info)) {
        return loader
      }
    }
    return undefined
  }

  protected static async _parseUrlInfo(url: string): Promise<UrlInfo> {
    let path, query, ext, mime
    if (url.startsWith('blob:')) {
      path = url
      query = ''
      mime = await fetch(url).then(res => res.blob()).then(blob => blob.type)
      ext = mime.split('/')[1] ?? ''
    } else if (url.startsWith('data:')) {
      path = url
      query = ''
      mime = url.match(/^data:(.+?);/)?.[1] ?? ''
      ext = mime.split('/')[1] ?? ''
    } else {
      [path, query] = url.split('?')
      ext = path.match(/\.(\w+)$/)?.[1] ?? ''
      if (ext) {
        mime = this.EXT_TO_MIME_TYPE.get(ext) ?? ext
      } else {
        mime = await fetch(url).then(res => res.blob()).then(blob => blob.type)
        ext = mime.split('/')[1] ?? ''
      }
    }
    return { url, path, query, ext, mime }
  }

  static async load<T = Resource>(url: string): Promise<T> {
    const resource = this.get<T>(url)

    if (resource) {
      return resource
    }

    let request = this.requests.get(url)

    if (!request) {
      this.requests.set(url, request = this._parseUrlInfo(url).then(info => {
        return Promise.resolve(this._matchLoader(info)?.load(info)).then(resource => {
          this.requests.delete(url)
          this.resources.set(url, resource)
          return resource
        })
      }))
    }

    if (!request) {
      throw new Error(`Failed to Assets.load('${ url }')`)
    }

    return request
  }

  static waitUntilLoad(): Promise<any[]> {
    return Promise.all(Array.from(this.requests.values()))
  }
}
