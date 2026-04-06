// src/app/components/documents/document-preview/document-preview.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  DomSanitizer,
  SafeHtml,
  SafeResourceUrl
} from '@angular/platform-browser';
import {
  PreviewService,
  PreviewData
} from '../../../core/services/preview.service';
import { Document } from '../../../core/services/document.service';

@Component({
  selector: 'app-document-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-preview.component.html',
  styleUrls: ['./document-preview.component.css']
})
export class DocumentPreviewComponent implements OnInit, OnDestroy {
  @Input() document: Document | null = null;
  @Output() closeModal = new EventEmitter<void>();

  loading = signal(true);
  error = signal<string | null>(null);
  previewData = signal<PreviewData | null>(null);

  constructor(
    private previewService: PreviewService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    if (this.document) {
      this.loadPreview();
    }
  }

  async loadPreview(): Promise<void> {
    if (!this.document) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      const data = await this.previewService.getPreviewData(
        this.document.id,
        this.document.mimeType,
        this.document.name
      );

      this.previewData.set(data);

      if (data.type === 'unsupported') {
        this.error.set(data.error || 'Preview not available');
      }
    } catch (err) {
      console.error('Preview error:', err);
      this.error.set('Failed to load preview');
    } finally {
      this.loading.set(false);
    }
  }

  sanitizeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  downloadDocument(): void {
    if (!this.document) return;

    this.previewService.downloadDocument(this.document.id).subscribe({
      next: (blob) => {
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = this.document!.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
      },
      error: (err) => console.error('Download failed:', err)
    });
  }

  close(): void {
    const data = this.previewData();
    if (data?.url) {
      this.previewService.revokeUrl(data.url);
    }
    this.closeModal.emit();
  }

  getFileIcon(): string {
    if (!this.document) return '📄';

    const mimeType = (this.document.mimeType || '').toLowerCase();
    const fileName = (this.document.name || '').toLowerCase();

    if (mimeType.includes('pdf') || fileName.endsWith('.pdf')) return '📕';
    if (mimeType.includes('word') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) return '📘';
    if (mimeType.includes('excel') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) return '📗';
    if (mimeType.includes('text') || fileName.endsWith('.txt')) return '📄';
    if (mimeType.includes('image')) return '🖼️';
    return '📎';
  }

  formatFileSize(): string {
    if (!this.document) return '';
    const bytes = this.document.size;
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  ngOnDestroy(): void {
    const data = this.previewData();
    if (data?.url) {
      this.previewService.revokeUrl(data.url);
    }
  }
}
