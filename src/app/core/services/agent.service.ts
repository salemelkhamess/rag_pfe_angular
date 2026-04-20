// src/app/core/services/agent.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export interface AgentRequest {
  query: string;
  conversationId?: string;
  agentType?: string;
  parameters?: Record<string, any>;
}

export interface AgentResponse {
  answer: string;
  agentType: string;
  sources: string[];
  metadata: any;
  processingTimeMs: number;
  conversationId: string;
}

@Injectable({
  providedIn: 'root'
})
export class AgentService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.baseApi}/agent`;

  executeQuery(query: string, conversationId?: string, agentType: string = 'document_qa'): Observable<AgentResponse> {
    const request: AgentRequest = {
      query,
      conversationId,
      agentType,
      parameters: {}
    };

    if (conversationId) {
      return this.http.post<AgentResponse>(`${this.baseUrl}/execute/${conversationId}`, request);
    }
    return this.http.post<AgentResponse>(`${this.baseUrl}/execute`, request);
  }
}
