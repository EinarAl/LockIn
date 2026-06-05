declare module 'pdf-parse' {
  interface PDFData {
    text: string
    numpages: number
    numrender: number
    info: Record<string, any>
    metadata: any
    version: string
  }
  function pdf(dataBuffer: Buffer): Promise<PDFData>
  export default pdf
}
