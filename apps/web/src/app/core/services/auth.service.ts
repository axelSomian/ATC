import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, throwError } from 'rxjs';
import { AuthStore } from '../stores/auth.store';
import type { LoginResponse, UserMe } from '../models/user.model';

const API = '/api/v1';

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  level: number;
  phone?: string;
  city?: string;
  clubId?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);

  login(payload: LoginPayload) {
    return this.http.post<LoginResponse>(`${API}/auth/login`, payload, { withCredentials: true }).pipe(
      tap((res) => this.store.setAuth(res.user, res.accessToken)),
    );
  }

  signup(payload: SignupPayload) {
    return this.http.post<LoginResponse>(`${API}/auth/signup`, payload, { withCredentials: true }).pipe(
      tap((res) => this.store.setAuth(res.user, res.accessToken)),
    );
  }

  refresh() {
    return this.http
      .post<{ accessToken: string }>(`${API}/auth/refresh`, {}, { withCredentials: true })
      .pipe(tap((res) => this.store.updateToken(res.accessToken)));
  }

  logout() {
    return this.http.post(`${API}/auth/logout`, {}, { withCredentials: true }).pipe(
      tap(() => {
        this.store.clear();
        this.router.navigate(['/auth/login']);
      }),
    );
  }

  getMe() {
    return this.http.get<UserMe>(`${API}/auth/me`).pipe(
      tap((user) => this.store.setUser(user as any)),
    );
  }

  /** Try to restore session from stored token on app init */
  tryRestoreSession() {
    if (!this.store.accessToken()) return;
    this.getMe().pipe(catchError(() => throwError(() => null))).subscribe({
      error: () => this.store.clear(),
    });
  }
}
