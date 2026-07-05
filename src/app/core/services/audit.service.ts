import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { PageResponse } from './document.service';

export interface AuditEvent {
  id: string;
  eventType: string;
  serviceName: string;
  userId: string;
  userName: string;
  resourceId: string;
  resourceType: string;
  action: string;
  status: string;
  ipAddress: string;
  details: Record<string, any> | null;
  errorMessage: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuditService {
  private apiUrl = `${environment.baseApi}/audit`;

  constructor(private http: HttpClient) {}

  getEvents(filters: {
    userId?: string;
    serviceName?: string;
    resourceType?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
  }): Observable<PageResponse<AuditEvent>> {
    let params = new HttpParams()
      .set('page', (filters.page ?? 0).toString())
      .set('size', (filters.size ?? 20).toString());

    if (filters.userId)       params = params.set('userId', filters.userId);
    if (filters.serviceName)  params = params.set('serviceName', filters.serviceName);
    if (filters.resourceType) params = params.set('resourceType', filters.resourceType);
    if (filters.status)       params = params.set('status', filters.status);
    if (filters.from)         params = params.set('from', filters.from);
    if (filters.to)           params = params.set('to', filters.to);

    return this.http.get<PageResponse<AuditEvent>>(`${this.apiUrl}/events`, { params });
  }
}
