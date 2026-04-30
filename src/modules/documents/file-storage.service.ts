import * as fs from 'fs';
import * as path from 'path';

// UUID generation without external dependency
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'documents');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '52428800', 10); // 50MB default
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/x-zip-compressed',
  'application/zip',
];

export interface FileUpload {
  originalName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
}

export class FileStorageService {
  static async initializeUploadDirectory(): Promise<void> {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  }

  static validateFileUpload(file: FileUpload): { valid: boolean; error?: string } {
    if (!file.buffer) {
      return { valid: false, error: 'File buffer is required' };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB` };
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimeType)) {
      return { valid: false, error: `File type ${file.mimeType} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}` };
    }

    return { valid: true };
  }

  static async saveFile(file: FileUpload): Promise<{ filePath: string; fileSize: number }> {
    const validation = this.validateFileUpload(file);
    if (!validation.valid) {
      const error = new Error(validation.error || 'File validation failed');
      (error as any).statusCode = 400;
      (error as any).errors = [{ field: 'file', message: validation.error }];
      throw error;
    }

    await this.initializeUploadDirectory();

    // Generate unique filename
    const fileExtension = path.extname(file.originalName);
    const uniqueFileName = `${generateUUID()}${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, uniqueFileName);

    // Write file to disk
    fs.writeFileSync(filePath, file.buffer);

    return {
      filePath: path.relative(process.cwd(), filePath),
      fileSize: file.size,
    };
  }

  static async deleteFile(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(process.cwd(), filePath);

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  static async getFileBuffer(filePath: string): Promise<Buffer> {
    try {
      const fullPath = path.join(process.cwd(), filePath);

      if (!fs.existsSync(fullPath)) {
        const error = new Error('File not found');
        (error as any).statusCode = 404;
        throw error;
      }

      return fs.readFileSync(fullPath);
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  }
}

export default FileStorageService;
