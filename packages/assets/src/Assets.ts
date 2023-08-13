import { blobTo } from './utils'
import { imageLoader, videoLoader } from './loaders'
import type { Loader, UrlInfo } from './Loader'
import type { Resouce } from '@rubickjs/scene'

export class Assets {
  static resources = new Map<string, any>()

  static requests = new Map<string, Promise<any>>()

  static extMimeMap = new Map<string, string>([
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

  static loaders = new Set<Loader>([
    imageLoader,
    videoLoader,
  ])

  static get<T = Resouce>(url: string): T | undefined {
    return this.resources.get(url)
  }

  private static getLoader(urlInfo: UrlInfo) {
    for (const loader of this.loaders) {
      if (loader.test(urlInfo)) {
        return loader
      }
    }
    return undefined
  }

  private static parseUrlInfo(url: string): UrlInfo {
    const [path, query] = url.split('?')
    const ext = path.match(/\.(\w+)$/)?.[1] ?? ''
    const mime = path.match(/^data:(.+?);/)?.[1]
      ?? this.extMimeMap.get(ext)
      ?? ext
    return { url, path, query, ext, mime }
  }

  static async load<T = Resouce>(url: string): Promise<T> {
    const resource = this.get<T>(url)

    if (resource) {
      return resource
    }

    let request = this.requests.get(url)
    if (!request) {
      let urlInfo = this.parseUrlInfo(url)
      let loader = this.getLoader(urlInfo)
      if (!loader) {
        urlInfo = this.parseUrlInfo(
          await fetch(url)
            .then(res => res.blob())
            .then(blob => blobTo(blob, 'dataURL')),
        )
        loader = this.getLoader(urlInfo)
      }
      if (loader) {
        request = loader.load(urlInfo)
        if (request instanceof Promise) {
          this.requests.set(url, request.then(resource => {
            this.requests.delete(url)
            this.resources.set(url, resource)
            return resource
          }))
        } else {
          this.resources.set(url, request)
        }
      }
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
