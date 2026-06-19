import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export interface ProviderInfo {
  name: string;
  available: boolean;
  defaultModel: string;
  models: string[];
}

@Injectable({ providedIn: 'root' })
export class LlmService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.baseApi}/conversations/llm`;

  /** Providers et modèles depuis parametrage-service (via conversation-service). */
  getProviders(): Observable<ProviderInfo[]> {
    return this.http.get<ProviderInfo[]>(`${this.baseUrl}/providers`);
  }
}
