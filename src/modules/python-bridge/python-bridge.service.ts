import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as http from 'http';
import * as https from 'https';
import axios from 'axios';

export interface ExtractedResume {
  text: string;
  sections: {
    contact?: Record<string, string>;
    experience?: string[];
    education?: string[];
    skills?: string[];
    summary?: string;
  };
  metadata: {
    hasTables: boolean;
    hasImages: boolean;
    pageCount: number;
    confidence: number;
  };
}

@Injectable()
export class PythonBridgeService {
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('PYTHON_SERVICE_URL') ??
      'http://localhost:8000';
  }

  /**
   * Call Python service to extract text and structure from a PDF resume buffer
   */
  async extractResume(fileBuffer: Buffer, originalFileName: string): Promise<ExtractedResume> {
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(fileBuffer)], { type: 'application/pdf' });
      formData.append('file', blob, originalFileName);

      const response = await axios.post<ExtractedResume>(
        `${this.baseUrl}/extract-resume`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );
      return response.data;
    } catch (error) {
      console.error('Python bridge error:', error);
      throw new ServiceUnavailableException(
        'PDF extraction service is currently unavailable. Please try again later.',
      );
    }
  }

  /**
   * Generic POST helper — keeps all HTTP logic in one place
   */
  private post<T>(path: string, body: Record<string, any>): Promise<T> {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(body);
      const url = new URL(this.baseUrl + path);
      const isHttps = url.protocol === 'https:';
      const transport = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      };

      const req = transport.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data) as T);
          } catch {
            reject(new Error('Invalid JSON response from Python service'));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Python service request timed out'));
      });

      req.write(payload);
      req.end();
    });
  }
}
