// src/app/core/services/preview.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export interface PreviewData {
  type: 'image' | 'pdf' | 'text' | 'docx' | 'xlsx' | 'unsupported';
  content?: string;
  html?: string;
  url?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PreviewService {
  private apiUrl = `${environment.baseApi}/documents`;

  constructor(private http: HttpClient) {}

  getPreviewContent(documentId: string): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.apiUrl}/${documentId}/download`, {
      responseType: 'blob',
      observe: 'response'
    });
  }

  async getPreviewData(
    documentId: string,
    mimeType: string,
    fileName: string
  ): Promise<PreviewData> {
    try {
      const response = await firstValueFrom(this.getPreviewContent(documentId));
      const originalBlob = response.body;

      if (!originalBlob) {
        return { type: 'unsupported', error: 'No content available' };
      }

      const serverContentType =
        response.headers.get('Content-Type') || originalBlob.type || '';

      const lowerName = (fileName || '').toLowerCase();
      const lowerMime = (mimeType || '').toLowerCase();
      const lowerServerType = serverContentType.toLowerCase();

      console.log('fileName:', fileName);
      console.log('mimeType from DB:', mimeType);
      console.log('Content-Type from server:', serverContentType);
      console.log('Blob type:', originalBlob.type);

      // IMAGE
      if (
        lowerMime.startsWith('image/') ||
        lowerServerType.startsWith('image/')
      ) {
        const imageBlob = new Blob([originalBlob], {
          type: lowerMime || lowerServerType || 'image/*'
        });
        const url = URL.createObjectURL(imageBlob);
        return { type: 'image', url };
      }

      // PDF
      if (
        lowerMime.includes('pdf') ||
        lowerServerType.includes('pdf') ||
        lowerName.endsWith('.pdf')
      ) {
        const pdfBlob = new Blob([originalBlob], {
          type: 'application/pdf'
        });
        const url = URL.createObjectURL(pdfBlob);
        return { type: 'pdf', url };
      }

      // TEXT
      if (
        lowerMime.startsWith('text/') ||
        lowerServerType.startsWith('text/') ||
        lowerName.endsWith('.txt') ||
        lowerName.endsWith('.json') ||
        lowerName.endsWith('.md') ||
        lowerName.endsWith('.html') ||
        lowerName.endsWith('.xml') ||
        lowerName.endsWith('.css') ||
        lowerName.endsWith('.js') ||
        lowerName.endsWith('.ts') ||
        lowerName.endsWith('.csv')
      ) {
        const textBlob = new Blob([originalBlob], {
          type: 'text/plain;charset=utf-8'
        });

        const text = await textBlob.text();
        const maxLength = 50000;
        const content =
          text.length > maxLength
            ? text.substring(0, maxLength) + '\n\n... (truncated)'
            : text;

        return { type: 'text', content };
      }

      // DOCX
      if (
        lowerName.endsWith('.docx') ||
        lowerMime ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        const arrayBuffer = await originalBlob.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });

        return {
          type: 'docx',
          html: result.value || '<p>No preview content available.</p>'
        };
      }

      // XLSX
      if (
        lowerName.endsWith('.xlsx') ||
        lowerMime ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ) {
        const arrayBuffer = await originalBlob.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        if (!workbook.SheetNames.length) {
          return { type: 'unsupported', error: 'Excel file contains no sheets' };
        }

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const html = XLSX.utils.sheet_to_html(firstSheet);

        return {
          type: 'xlsx',
          html
        };
      }

      return {
        type: 'unsupported',
        error: `Preview not available for ${mimeType || fileName}`
      };
    } catch (error) {
      console.error('Error loading preview:', error);
      return {
        type: 'unsupported',
        error: 'Failed to load document preview'
      };
    }
  }

  downloadDocument(documentId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${documentId}/download`, {
      responseType: 'blob'
    });
  }

  revokeUrl(url: string): void {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }
}
