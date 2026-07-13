// src/app/core/services/category.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  active: boolean;
  parentId: string | null;
  parentName: string | null;
  level: number;
  displayOrder: number;
  children: Category[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CategoryRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string | null;
  displayOrder?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private apiUrl = `${environment.baseApi}/categories`;

  constructor(private http: HttpClient) {}

  // Créer une catégorie
  createCategory(category: CategoryRequest): Observable<Category> {
    return this.http.post<Category>(this.apiUrl, category);
  }

  // Récupérer toutes les catégories
  getAllCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(this.apiUrl);
  }

  // Récupérer une catégorie par ID
  getCategoryById(id: string): Observable<Category> {
    return this.http.get<Category>(`${this.apiUrl}/${id}`);
  }

  // Récupérer les catégories racines
  getRootCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/root`);
  }

  // Récupérer les sous-catégories
  getSubCategories(parentId: string): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/parent/${parentId}/sub`);
  }

  // Mettre à jour une catégorie
  updateCategory(id: string, category: CategoryRequest): Observable<Category> {
    return this.http.put<Category>(`${this.apiUrl}/${id}`, category);
  }

  // Supprimer une catégorie
  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Activer/Désactiver une catégorie
  toggleCategoryStatus(id: string): Observable<Category> {
    return this.http.patch<Category>(`${this.apiUrl}/${id}/toggle`, {});
  }
}
