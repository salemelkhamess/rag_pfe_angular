import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Fournisseur LLM (OpenAI, Ollama, etc.) */
export interface LlmProviderConfig {
  id: string;
  code: string;
  name: string;
  displayName?: string;
  baseUrl?: string;
  apiKeyConfigured?: boolean;
  active: boolean;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Modèle associé à un provider */
export interface LlmModelConfig {
  id: string;
  providerId: string;
  providerName?: string;
  name: string;
  modelId: string;
  active: boolean;
  isDefault: boolean;
  contextWindow?: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProviderRequest {
  code: string;
  name: string;
  displayName?: string;
  baseUrl?: string;
  apiKey?: string;
  active?: boolean;
  description?: string;
}

export interface ModelRequest {
  providerId: string;
  name: string;
  modelId: string;
  active?: boolean;
  isDefault?: boolean;
  contextWindow?: number;
  description?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ParametrageService {
  private http = inject(HttpClient);
  private readonly providersUrl = `${environment.baseApi}/parametrage/providers`;
  private readonly modelsUrl = `${environment.baseApi}/parametrage/models`;

  // ── Providers ─────────────────────────────────────────────────────────────

  getAllProviders(): Observable<LlmProviderConfig[]> {
    return this.http.get<LlmProviderConfig[]>(this.providersUrl);
  }

  getProviderById(id: string): Observable<LlmProviderConfig> {
    return this.http.get<LlmProviderConfig>(`${this.providersUrl}/${id}`);
  }

  createProvider(request: ProviderRequest): Observable<LlmProviderConfig> {
    return this.http.post<LlmProviderConfig>(this.providersUrl, request);
  }

  updateProvider(id: string, request: ProviderRequest): Observable<LlmProviderConfig> {
    return this.http.put<LlmProviderConfig>(`${this.providersUrl}/${id}`, request);
  }

  deleteProvider(id: string): Observable<void> {
    return this.http.delete<void>(`${this.providersUrl}/${id}`);
  }

  toggleProviderStatus(id: string): Observable<LlmProviderConfig> {
    return this.http.patch<LlmProviderConfig>(`${this.providersUrl}/${id}/toggle`, {});
  }

  // ── Models ────────────────────────────────────────────────────────────────

  getAllModels(): Observable<LlmModelConfig[]> {
    return this.http.get<LlmModelConfig[]>(this.modelsUrl);
  }

  getModelsByProvider(providerId: string): Observable<LlmModelConfig[]> {
    return this.http.get<LlmModelConfig[]>(`${this.providersUrl}/${providerId}/models`);
  }

  getModelById(id: string): Observable<LlmModelConfig> {
    return this.http.get<LlmModelConfig>(`${this.modelsUrl}/${id}`);
  }

  createModel(request: ModelRequest): Observable<LlmModelConfig> {
    return this.http.post<LlmModelConfig>(this.modelsUrl, request);
  }

  updateModel(id: string, request: ModelRequest): Observable<LlmModelConfig> {
    return this.http.put<LlmModelConfig>(`${this.modelsUrl}/${id}`, request);
  }

  deleteModel(id: string): Observable<void> {
    return this.http.delete<void>(`${this.modelsUrl}/${id}`);
  }

  toggleModelStatus(id: string): Observable<LlmModelConfig> {
    return this.http.patch<LlmModelConfig>(`${this.modelsUrl}/${id}/toggle`, {});
  }

  setDefaultModel(id: string): Observable<LlmModelConfig> {
    return this.http.patch<LlmModelConfig>(`${this.modelsUrl}/${id}/default`, {});
  }
}
