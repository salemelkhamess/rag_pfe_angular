import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

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

@Injectable({ providedIn: 'root' })
export class ConversationService {
  private http = inject(HttpClient);
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

  addFeedback(conversationId: string, messageId: string, request: CreateFeedbackRequest): Observable<Feedback> {
    return this.http.post<Feedback>(`${this.baseUrl}/${conversationId}/messages/${messageId}/feedback`, request);
  }

  getFeedback(conversationId: string, messageId: string): Observable<Feedback> {
    return this.http.get<Feedback>(`${this.baseUrl}/${conversationId}/messages/${messageId}/feedback`);
  }
}
