// src/app/core/services/document.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment.development';

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
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
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

  constructor(private http: HttpClient) {}

  getDocuments(page: number = 0, size: number = 10): Observable<PageResponse<Document>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    console.log('Fetching documents from:', this.apiUrl, 'with params:', params);

    return this.http.get<PageResponse<Document>>(this.apiUrl, { params })
      .pipe(
        timeout(30000), // 30 secondes timeout
        map(response => {
          console.log('Documents response:', response);
          return response;
        }),
        catchError(error => {
          console.error('Error fetching documents:', error);
          // Retourner une réponse vide en cas d'erreur
          return of({
            content: [],
            pageable: { pageNumber: page, pageSize: size, sort: { sorted: false, empty: true, unsorted: true } },
            totalPages: 0,
            totalElements: 0,
            last: true,
            first: true,
            empty: true
          } as PageResponse<Document>);
        })
      );
  }

  uploadDocument(file: File, name: string, description: string, type: string): Observable<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('description', description);
    formData.append('type', type);

    return this.http.post<Document>(this.apiUrl, formData)
      .pipe(
        timeout(60000), // 60 secondes timeout pour l'upload
        catchError(error => {
          console.error('Error uploading document:', error);
          throw error;
        })
      );
  }

  getDocument(id: string): Observable<Document> {
    return this.http.get<Document>(`${this.apiUrl}/${id}`)
      .pipe(
        timeout(10000),
        catchError(error => {
          console.error('Error getting document:', error);
          throw error;
        })
      );
  }

  downloadDocument(id: string, fileName: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/download`, {
      responseType: 'blob'
    }).pipe(
      timeout(60000),
      catchError(error => {
        console.error('Error downloading document:', error);
        throw error;
      })
    );
  }

  deleteDocument(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(
        timeout(10000),
        catchError(error => {
          console.error('Error deleting document:', error);
          throw error;
        })
      );
  }
}
