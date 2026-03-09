export class ClipperError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ClipperError'
    this.code = code
  }
}
