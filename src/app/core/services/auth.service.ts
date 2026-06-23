import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError, switchMap, timeout } from 'rxjs/operators';
import {
  LoginRequest,
  AuthResponse,
  UserInfoResponse,
  ApiResponse,
  RegisterRequest,
  UpdateUserRequest,
  ChangePasswordRequest
} from '../models/auth.models';
import { TokenService } from './token.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private readonly USER_API_URL = environment.apiUserUrl;
  private currentUserSubject = new BehaviorSubject<UserInfoResponse | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private tokenService: TokenService
  ) {
    this.loadCurrentUser();
  }

  login(credentials: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API_URL}/login`, credentials)
      .pipe(
        timeout(10000),
        tap(response => {
          if (response.success && response.data) {
            this.tokenService.setTokens(
              response.data.accessToken,
              response.data.refreshToken
            );
            this.loadCurrentUser();
          }
        }),
        catchError(this.handleError)
      );
  }

  register(userData: RegisterRequest): Observable<ApiResponse<UserInfoResponse>> {
    return this.http.post<ApiResponse<UserInfoResponse>>(`${this.USER_API_URL}/users/register`, userData)
      .pipe(
        catchError(this.handleError)
      );
  }

  refreshToken(): Observable<ApiResponse<AuthResponse>> {
    const refreshToken = this.tokenService.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<ApiResponse<AuthResponse>>(`${this.API_URL}/refresh`, { refreshToken })
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.tokenService.setTokens(
              response.data.accessToken,
              response.data.refreshToken
            );
          }
        }),
        catchError(this.handleError)
      );
  }

  logout(): Observable<ApiResponse<void>> {
    const refreshToken = this.tokenService.getRefreshToken();
    const accessToken = this.tokenService.getAccessToken();

    const headers = {
      'Authorization': `Bearer ${accessToken}`
    };

    return this.http.post<ApiResponse<void>>(
      `${this.API_URL}/logout`,
      { refreshToken },
      { headers }
    ).pipe(
      tap(() => {
        this.tokenService.clearTokens();
        this.currentUserSubject.next(null);
      }),
      catchError(error => {
        this.tokenService.clearTokens();
        this.currentUserSubject.next(null);
        return this.handleError(error);
      })
    );
  }

  getCurrentUser(): Observable<ApiResponse<UserInfoResponse>> {
    return this.http.get<ApiResponse<UserInfoResponse>>(`${this.USER_API_URL}/users/me`)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.currentUserSubject.next(response.data);
          }
        }),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 401) {
            this.tokenService.clearTokens();
          }
          return this.handleError(err);
        })
      );
  }

  updateCurrentUser(userData: UpdateUserRequest): Observable<ApiResponse<UserInfoResponse>> {
    return this.http.put<ApiResponse<UserInfoResponse>>(`${this.USER_API_URL}/users/me`, userData)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.currentUserSubject.next(response.data);
          }
        }),
        catchError(this.handleError)
      );
  }

  changePassword(request: ChangePasswordRequest): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(`${this.USER_API_URL}/users/me/password`, request)
      .pipe(catchError(this.handleError));
  }

  validateToken(): Observable<ApiResponse<boolean>> {
    const token = this.tokenService.getAccessToken();
    const headers = {
      'Authorization': `Bearer ${token}`
    };

    return this.http.get<ApiResponse<boolean>>(`${this.API_URL}/validate`, { headers })
      .pipe(
        catchError(this.handleError)
      );
  }

  private loadCurrentUser(): void {
    if (this.tokenService.hasValidToken()) {
      this.getCurrentUser().subscribe();
    }
  }

  isAuthenticated(): boolean {
    return this.tokenService.hasValidToken();
  }

  hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    return user?.roles?.includes(role) || false;
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.currentUserSubject.value;
    return roles.some(role => user?.roles?.includes(role));
  }

  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);
    let errorMessage = 'Une erreur est survenue. Veuillez réessayer.';

    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      errorMessage = 'Le service ne répond pas. Veuillez réessayer dans quelques instants.';
    } else if (error.status === 0) {
      errorMessage = 'Service temporairement indisponible. Vérifiez votre connexion.';
    } else if (error.status === 401) {
      errorMessage = 'Identifiant ou mot de passe incorrect.';
    } else if (error.status === 403) {
      errorMessage = 'Accès refusé.';
    } else if (error.status === 404) {
      errorMessage = 'Service introuvable.';
    } else if (error.status === 500) {
      errorMessage = 'Erreur serveur. Veuillez réessayer.';
    } else if (error.status === 503) {
      errorMessage = 'Service temporairement indisponible.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    return throwError(() => ({ message: errorMessage, status: error.status ?? 0 }));
  }
}
