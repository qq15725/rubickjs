export function blobTo(blob: Blob, type: 'arrayBuffer'): Promise<ArrayBuffer>
export function blobTo(blob: Blob, type: 'binaryString' | 'dataURL' | 'text'): Promise<string>
export function blobTo(
  blob: Blob,
  type: 'arrayBuffer' | 'binaryString' | 'dataURL' | 'text',
): Promise<string | ArrayBuffer> {
  if (type === 'arrayBuffer' && typeof blob.arrayBuffer !== 'undefined') {
    return blob.arrayBuffer()
  }

  if (type === 'text' && typeof blob.text !== 'undefined') {
    return blob.text()
  }

  return new Promise((resolve, reject) => {
    const fileReader = new FileReader()

    fileReader.addEventListener('load', () => {
      if (!fileReader.result) {
        reject(new Error('Failed to blobTo, result is null'))
      } else {
        resolve(fileReader.result)
      }
    })

    fileReader.addEventListener('error', () => {
      reject(fileReader.error)
    })

    switch (type) {
      case 'arrayBuffer':
        fileReader.readAsArrayBuffer(blob)
        break
      case 'binaryString':
        fileReader.readAsBinaryString(blob)
        break
      case 'dataURL':
        fileReader.readAsDataURL(blob)
        break
      case 'text':
        fileReader.readAsText(blob)
        break
    }
  })
}
