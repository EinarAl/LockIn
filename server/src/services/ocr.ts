import fs from 'fs';
import path from 'path';
import Tesseract from 'tesseract.js';
import pdf from 'pdf-parse';

export class OCRService {
  static async processFile(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();

    if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
      return await this.processImage(filePath);
    }

    if (ext === '.pdf') {
      return await this.processPDF(filePath);
    }

    const textContent = fs.readFileSync(filePath, 'utf-8');
    return textContent;
  }

  private static async processImage(filePath: string): Promise<string> {
    const { data } = await Tesseract.recognize(filePath, 'eng', {
      logger: () => {},
    });
    return data.text || '[No text extracted]';
  }

  private static async processPDF(filePath: string): Promise<string> {
    const pdfBuffer = fs.readFileSync(filePath);
    const data = await pdf(pdfBuffer);
    return data.text?.trim() || '[No text extracted from PDF]';
  }
}
