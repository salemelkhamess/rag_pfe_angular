// src/app/core/services/document.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { CategoryService } from './category.service';

export interface Document {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  size: number;
  mimeType: string;
  ownerId: string;
  ownerName: string;
  metadata: string;
  categoryId: string | null;
  categoryName: string | null;
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
}

export interface DocumentStats {
  totalDocuments: number;
  statusDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
  totalStorageBytes: number;
}

export interface PageResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: { sorted: boolean; empty: boolean; unsorted: boolean };
  };
  totalPages: number;
  totalElements: number;
  last: boolean;
  first: boolean;
  empty: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private apiUrl = `${environment.baseApi}/documents`;

  constructor(
    private http: HttpClient,
    private categoryService: CategoryService
  ) {}

  uploadDocument(file: File, name: string, description: string, type: string, categoryId?: string): Observable<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('description', description);
    formData.append('type', type);
    if (categoryId) {
      formData.append('categoryId', categoryId);
    }

    return this.http.post<Document>(this.apiUrl, formData);
  }

  getDocuments(page: number = 0, size: number = 10): Observable<PageResponse<Document>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PageResponse<Document>>(this.apiUrl, { params })
      .pipe(
        switchMap(response => {
          if (!response.content || response.content.length === 0) {
            return [response];
          }

          // Récupérer les noms des catégories pour chaque document
          const categoryRequests = response.content
            .filter(doc => doc.categoryId)
            .map(doc => this.categoryService.getCategoryById(doc.categoryId!)
              .pipe(
                map(category => ({ docId: doc.id, categoryName: category.name }))
              ));

          if (categoryRequests.length === 0) {
            return [response];
          }

          return forkJoin(categoryRequests).pipe(
            map(categoryResults => {
              const categoryMap = new Map();
              categoryResults.forEach(result => {
                categoryMap.set(result.docId, result.categoryName);
              });

              response.content = response.content.map(doc => ({
                ...doc,
                categoryName: doc.categoryId ? categoryMap.get(doc.id) || null : null
              }));

              return response;
            })
          );
        })
      );
  }

  getDocument(id: string): Observable<Document> {
    return this.http.get<Document>(`${this.apiUrl}/${id}`);
  }

  downloadDocument(id: string, fileName: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/download`, { responseType: 'blob' });
  }

  previewDocument(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/preview`, { responseType: 'blob' });
  }

  reindexDocument(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/reindex`, {});
  }

  deleteDocument(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getStats(): Observable<DocumentStats> {
    return this.http.get<DocumentStats>(`${this.apiUrl}/stats`);
  }
}
