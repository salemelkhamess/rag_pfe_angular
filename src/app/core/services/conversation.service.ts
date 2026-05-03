import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { TokenService } from './token.service';

export interface Conversation {
  id: string;
  title: string;
  userId: string;
  userName: string;
  agentType: string;
  summary: string;
  messageCount: number;
  status: string;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string;
  metadata?: any;
  tokensUsed?: number;
  processingTimeMs?: number;
  createdAt: string;
  feedback?: Feedback;
}

export interface Feedback {
  id: string;
  messageId: string;
  feedbackType: string;
  comment: string;
  rating: number;
  createdAt: string;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  totalCount: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface CreateConversationRequest {
  title: string;
  agentType?: string;
  metadata?: any;
}

export interface CreateMessageRequest {
  content: string;
  sources?: string;
  metadata?: any;
  llmProvider?: string;
  llmModel?: string;
}

export interface CreateFeedbackRequest {
  feedbackType: string;
  comment?: string;
  rating?: number;
}

export interface StreamCallbacks {
  onUserSaved?: (msg: Message) => void;
  onToken: (token: string) => void;
  onDone: (msg: Message) => void;
  onError?: (err: string) => void;
}

@Injectable({ providedIn: 'root' })
export class ConversationService {
  private http = inject(HttpClient);
  private tokenService = inject(TokenService);
  private baseUrl = `${environment.baseApi}/conversations`;

  createConversation(request: CreateConversationRequest): Observable<Conversation> {
    return this.http.post<Conversation>(this.baseUrl, request);
  }

  getConversations(page = 0, size = 20): Observable<ConversationListResponse> {
    return this.http.get<ConversationListResponse>(`${this.baseUrl}?page=${page}&size=${size}`);
  }

  getConversation(id: string): Observable<Conversation> {
    return this.http.get<Conversation>(`${this.baseUrl}/${id}`);
  }

  updateConversation(id: string, request: CreateConversationRequest): Observable<Conversation> {
    return this.http.put<Conversation>(`${this.baseUrl}/${id}`, request);
  }

  deleteConversation(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getMessages(conversationId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.baseUrl}/${conversationId}/messages`);
  }

  addMessage(conversationId: string, request: CreateMessageRequest): Observable<Message> {
    return this.http.post<Message>(`${this.baseUrl}/${conversationId}/messages`, request);
  }

  getMessage(conversationId: string, messageId: string): Observable<Message> {
    return this.http.get<Message>(`${this.baseUrl}/${conversationId}/messages/${messageId}`);
  }

  deleteMessage(conversationId: string, messageId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${conversationId}/messages/${messageId}`);
  }

  streamMessage(conversationId: string, request: CreateMessageRequest, callbacks: StreamCallbacks): AbortController {
    const controller = new AbortController();
    const token = this.tokenService.getAccessToken();

    fetch(`${this.baseUrl}/${conversationId}/messages/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(request),
      signal: controller.signal
    }).then(async (response) => {
      if (!response.ok || !response.body) {
        callbacks.onError?.(`HTTP ${response.status}`);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = 'token'; // DOIT être dehors du while — persiste entre les chunks
      let doneReceived = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trimEnd(); // retire \r éventuel
          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.slice(6).trim();
          } else if (trimmed.startsWith('data:')) {
            // Spring SseEmitter writes "data:<value>" (no separator space).
            // The value starts immediately after "data:", so slice(5) is the full token.
            const data = trimmed.slice(5);
            // Ne pas utiliser trim() pour les tokens : le LLM envoie souvent les espaces
            // comme deltas seuls ; les ignorer colle tous les mots ("Bonjourlemonde").
            if (currentEvent === 'token') {
              if (data.length > 0) {
                // data is JSON-encoded from the backend to survive SSE's leading-space stripping
                let token = data;
                try { token = JSON.parse(data); } catch { /* fallback: use raw data */ }
                callbacks.onToken(token);
              }
            } else if (currentEvent === 'user_saved') {
              if (data.trim()) {
                try { callbacks.onUserSaved?.(JSON.parse(data)); } catch { /* ignore */ }
              }
            } else if (currentEvent === 'done') {
              doneReceived = true;
              try { callbacks.onDone(JSON.parse(data)); } catch {
                callbacks.onError?.('Erreur de parsing de la réponse finale.');
              }
            } else if (currentEvent === 'error') {
              callbacks.onError?.(data);
            }
            // Reset après chaque data: (un événement SSE = event: + data:)
            currentEvent = 'token';
          }
        }
      }

      // Si le stream s'est fermé sans event:done (ex: broken pipe côté serveur)
      if (!doneReceived) {
        callbacks.onError?.('La connexion a été interrompue.');
      }
    }).catch(err => {
      if (err.name !== 'AbortError') callbacks.onError?.(err.message ?? 'Erreur réseau.');
    });

    return controller;
  }

  addFeedback(conversationId: string, messageId: string, request: CreateFeedbackRequest): Observable<Feedback> {
    return this.http.post<Feedback>(`${this.baseUrl}/${conversationId}/messages/${messageId}/feedback`, request);
  }

  getFeedback(conversationId: string, messageId: string): Observable<Feedback> {
    return this.http.get<Feedback>(`${this.baseUrl}/${conversationId}/messages/${messageId}/feedback`);
  }
}
