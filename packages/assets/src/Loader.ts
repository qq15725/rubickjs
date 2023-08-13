export interface UrlInfo {
  url: string
  path: string
  query: string
  ext: string
  mime: string
}

export interface Loader {
  test: (info: UrlInfo) => boolean
  load: (info: UrlInfo) => any | Promise<any>
}
