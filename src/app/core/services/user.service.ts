import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment.development';
import { ApiResponse, RegisterRequest, UpdateUserRequest, UserInfoResponse } from '../models/auth.models';

export interface UserListResponse {
  users: UserInfoResponse[];
  totalCount: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface UserSearchParams {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled?: boolean;
  page?: number;
  size?: number;
}

export interface CreateUserRequest extends RegisterRequest {
  role?: string;
}

export interface AdminResetPasswordRequest {
  newPassword: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUserUrl}/users`;

  listUsers(params: UserSearchParams = {}): Observable<UserListResponse> {
    let httpParams = new HttpParams()
      .set('page', String(params.page ?? 0))
      .set('size', String(params.size ?? 20));
    if (params.username) httpParams = httpParams.set('username', params.username);
    if (params.email) httpParams = httpParams.set('email', params.email);
    if (params.firstName) httpParams = httpParams.set('firstName', params.firstName);
    if (params.lastName) httpParams = httpParams.set('lastName', params.lastName);
    if (params.enabled !== undefined) httpParams = httpParams.set('enabled', String(params.enabled));

    return this.http
      .get<ApiResponse<UserListResponse>>(this.baseUrl, { params: httpParams })
      .pipe(
        map((r) => r.data ?? { users: [], totalCount: 0, page: 0, size: 20, totalPages: 0 }),
        catchError((err) => {
          const msg = err.error?.message || (err.status === 403
            ? 'Accès refusé : rôle administrateur requis.'
            : 'Impossible de charger les utilisateurs.');
          return throwError(() => new Error(msg));
        })
      );
  }

  getUserById(userId: string): Observable<UserInfoResponse> {
    return this.http
      .get<ApiResponse<UserInfoResponse>>(`${this.baseUrl}/${userId}`)
      .pipe(map((r) => r.data));
  }

  createUser(request: CreateUserRequest): Observable<UserInfoResponse> {
    return this.http
      .post<ApiResponse<UserInfoResponse>>(this.baseUrl, request)
      .pipe(map((r) => r.data));
  }

  updateUser(userId: string, request: UpdateUserRequest): Observable<UserInfoResponse> {
    return this.http
      .put<ApiResponse<UserInfoResponse>>(`${this.baseUrl}/${userId}`, request)
      .pipe(map((r) => r.data));
  }

  deleteUser(userId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${userId}`)
      .pipe(map(() => undefined));
  }

  enableUser(userId: string): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.baseUrl}/${userId}/enable`, {})
      .pipe(map(() => undefined));
  }

  disableUser(userId: string): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.baseUrl}/${userId}/disable`, {})
      .pipe(map(() => undefined));
  }

  resetPassword(userId: string, newPassword: string): Observable<void> {
    return this.http
      .put<ApiResponse<void>>(`${this.baseUrl}/${userId}/password`, { newPassword })
      .pipe(map(() => undefined));
  }

  getRoles(): Observable<string[]> {
    return this.http
      .get<ApiResponse<string[]>>(`${this.baseUrl}/roles`)
      .pipe(map((r) => r.data ?? []));
  }

  assignRole(userId: string, roleName: string): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.baseUrl}/${userId}/roles/${roleName}`, {})
      .pipe(map(() => undefined));
  }

  removeRole(userId: string, roleName: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${userId}/roles/${roleName}`)
      .pipe(map(() => undefined));
  }
}
