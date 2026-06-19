// src/app/components/documents/document-list/document-list.component.ts
import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil, of, interval, timer } from 'rxjs';
import { catchError, finalize, retry, switchMap } from 'rxjs/operators';
import { DocumentService, PageResponse, Document } from '../../../core/services/document.service';
import { DocumentPreviewComponent } from '../document-preview/document-preview.component';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DocumentPreviewComponent, NgSelectModule],
  templateUrl: './document-list.component.html',
  styleUrls: ['./document-list.component.css']
})
export class DocumentListComponent implements OnInit, OnDestroy {
  readonly documents = signal<Document[]>([]);
  readonly loading = signal(true);
  readonly totalPages = signal(0);
  readonly totalElements = signal(0);
  readonly reindexingId = signal<string | null>(null);
  readonly searchQuery = signal('');

  selectedDocumentForPreview = signal<Document | null>(null);
  showPreview = signal(false);

  readonly hasDocuments = computed(() => this.documents().length > 0);

  readonly filteredDocuments = computed(() => {
    const term = this.searchQuery().toLowerCase().trim();
    if (!term) return this.documents();
    return this.documents().filter(doc =>
      doc.name.toLowerCase().includes(term) ||
      (doc.description || '').toLowerCase().includes(term) ||
      (doc.categoryName || '').toLowerCase().includes(term) ||
      doc.type.toLowerCase().includes(term)
    );
  });

  readonly hasFilteredResults = computed(() => this.filteredDocuments().length > 0);

  currentPage = 0;
  pageSize = 10;
  searchTerm = '';
  selectedDocument: Document | null = null;
  showDeleteModal = false;
  private destroy$ = new Subject<void>();
  private isLoading = false;

  constructor(private documentService: DocumentService) {}

  ngOnInit(): void {
    this.loadDocuments();
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private startPolling(): void {
    interval(5000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => {
          const hasPending = this.documents().some(
            d => d.status === 'PENDING' || d.status === 'PROCESSING'
          );
          if (!hasPending || this.isLoading) return of(null);
          return this.documentService.getDocuments(this.currentPage, this.pageSize).pipe(
            catchError(() => of(null))
          );
        })
      )
      .subscribe(response => {
        if (response) {
          this.documents.set(response.content || []);
          this.totalPages.set(response.totalPages || 0);
          this.totalElements.set(response.totalElements || 0);
        }
      });
  }

  loadDocuments(): void {
    if (this.isLoading) return;

    this.isLoading = true;
    this.loading.set(true);

    // When searching, load all documents to filter across all pages client-side
    const isSearchMode = !!this.searchQuery();
    const page = isSearchMode ? 0 : this.currentPage;
    const size = isSearchMode ? 9999 : this.pageSize;

    this.documentService
      .getDocuments(page, size)
      .pipe(
        takeUntil(this.destroy$),
        retry({ count: 3, delay: (_, i) => timer(i * 2000) }),
        catchError(error => {
          console.error('Error loading documents:', error);
          return of({
            content: [],
            pageable: {
              pageNumber: this.currentPage,
              pageSize: this.pageSize,
              sort: { sorted: false, empty: true, unsorted: true }
            },
            totalPages: 0,
            totalElements: 0,
            last: true,
            first: true,
            empty: true
          } as PageResponse<Document>);
        }),
        finalize(() => {
          this.loading.set(false);
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (response: PageResponse<Document>) => {
          this.documents.set(response.content || []);
          this.totalPages.set(response.totalPages || 0);
          this.totalElements.set(response.totalElements || 0);
        },
        error: (error: unknown) => {
          console.error('Error in subscription:', error);
          this.documents.set([]);
          this.totalPages.set(0);
          this.totalElements.set(0);
        }
      });
  }

  refresh(): void {
    if (this.isLoading) return;
    this.currentPage = 0;
    this.loadDocuments();
  }

  downloadDocument(doc: Document): void {
    this.documentService.downloadDocument(doc.id, doc.name).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.name;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error: unknown) => {
        console.error('Download error:', error);
      }
    });
  }

  reindexDocument(doc: Document): void {
    if (this.reindexingId()) return;
    this.reindexingId.set(doc.id);
    this.documentService.reindexDocument(doc.id).subscribe({
      next: () => {
        this.documents.update(docs =>
          docs.map(d => d.id === doc.id ? { ...d, status: 'PENDING' } : d)
        );
        this.reindexingId.set(null);
      },
      error: (err) => {
        console.error('Re-index error:', err);
        alert('Erreur lors du re-indexage.');
        this.reindexingId.set(null);
      }
    });
  }

  confirmDelete(doc: Document): void {
    this.selectedDocument = doc;
    this.showDeleteModal = true;
  }

  deleteDocument(): void {
    if (this.selectedDocument) {
      this.documentService.deleteDocument(this.selectedDocument.id).subscribe({
        next: () => {
          this.showDeleteModal = false;
          this.selectedDocument = null;
          this.refresh();
        },
        error: (error: unknown) => {
          console.error('Delete error:', error);
          this.showDeleteModal = false;
        }
      });
    }
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.selectedDocument = null;
  }

  previousPage(): void {
    if (this.currentPage > 0 && !this.isLoading) {
      this.currentPage--;
      this.loadDocuments();
    }
  }

  nextPage(): void {
    if (this.currentPage + 1 < this.totalPages() && !this.isLoading) {
      this.currentPage++;
      this.loadDocuments();
    }
  }

  onSearch(): void {
    this.searchQuery.set(this.searchTerm);
    this.currentPage = 0;
    this.loadDocuments();
  }

  getFileIcon(doc: Document): string {
    const mimeType = doc.mimeType;
    if (mimeType?.includes('pdf')) return 'PDF';
    if (mimeType?.includes('word')) return 'DOC';
    if (mimeType?.includes('excel')) return 'XLS';
    if (mimeType?.includes('text')) return 'TXT';
    if (mimeType?.includes('image')) return 'IMG';
    return 'FILE';
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'status-pending';
      case 'PROCESSING':
        return 'status-processing';
      case 'COMPLETED':
        return 'status-completed';
      case 'FAILED':
        return 'status-failed';
      default:
        return '';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  previewDocument(doc: Document): void {
    this.selectedDocumentForPreview.set(doc);
    this.showPreview.set(true);
  }

  closePreview(): void {
    this.showPreview.set(false);
    this.selectedDocumentForPreview.set(null);
  }
}
