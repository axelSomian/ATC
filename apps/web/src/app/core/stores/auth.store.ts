import { Injectable, signal, computed } from '@angular/core';
import type { AuthUser } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly _user = signal<AuthUser | null>(null);
  private readonly _accessToken = signal<string | null>(this.loadToken());
  private readonly _loading = signal(false);

  readonly user = this._user.asReadonly();
  readonly accessToken = this._accessToken.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly isAuthenticated = computed(() => this._accessToken() !== null);
  readonly isAdmin = computed(() => this._user()?.role === 'admin');

  setAuth(user: AuthUser, accessToken: string): void {
    this._user.set(user);
    this._accessToken.set(accessToken);
    localStorage.setItem('atc_token', accessToken);
  }

  setUser(user: AuthUser): void {
    this._user.set(user);
  }

  updateToken(accessToken: string): void {
    this._accessToken.set(accessToken);
    localStorage.setItem('atc_token', accessToken);
  }

  clear(): void {
    this._user.set(null);
    this._accessToken.set(null);
    localStorage.removeItem('atc_token');
  }

  setLoading(v: boolean): void {
    this._loading.set(v);
  }

  private loadToken(): string | null {
    try {
      return localStorage.getItem('atc_token');
    } catch {
      return null;
    }
  }
}
