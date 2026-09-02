import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const API = '/api/v1/push';

type PushState = 'unsupported' | 'default' | 'granted' | 'denied' | 'disabled';

/**
 * Notifications push (Web Push / VAPID). Le service worker (`sw.js`) affiche les
 * notifications ; ici on gère l'abonnement de l'appareil.
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly http = inject(HttpClient);

  readonly state = signal<PushState>('default');
  /** true une fois que init() a fini de déterminer l'état. */
  readonly ready = signal(false);
  private vapidKey = '';

  /** Registration du service worker, ou null (dev sans SW, ou SW pas encore actif). */
  private async swReady(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null;
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing?.active) return existing;
    return Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((r) => setTimeout(() => r(null), 3000)),
    ]);
  }

  /** À appeler au démarrage (après login). Détecte l'état sans rien demander. */
  async init(): Promise<void> {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        this.state.set('unsupported');
        return;
      }
      if (!(await this.swReady())) {
        this.state.set('disabled'); // pas de service worker (ex. dev)
        return;
      }

      try {
        const { key, enabled } = await firstValueFrom(
          this.http.get<{ key: string; enabled: boolean }>(`${API}/vapid-public-key`),
        );
        if (!enabled || !key) { this.state.set('disabled'); return; }
        this.vapidKey = key;
      } catch {
        this.state.set('disabled');
        return;
      }

      const perm = Notification.permission;
      this.state.set(perm === 'granted' ? 'granted' : perm === 'denied' ? 'denied' : 'default');

      // Si déjà autorisé, s'assurer que l'abonnement est bien enregistré côté serveur.
      if (perm === 'granted') this.subscribe().catch(() => {});
    } finally {
      this.ready.set(true);
    }
  }

  /** Demande la permission puis abonne l'appareil. */
  async enable(): Promise<boolean> {
    if (this.state() === 'unsupported' || this.state() === 'disabled') return false;
    const perm = await Notification.requestPermission();
    this.state.set(perm === 'granted' ? 'granted' : perm === 'denied' ? 'denied' : 'default');
    if (perm !== 'granted') return false;
    return this.subscribe();
  }

  private async subscribe(): Promise<boolean> {
    const reg = await this.swReady();
    if (!reg) return false;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(this.vapidKey),
      });
    }
    await firstValueFrom(this.http.post(`${API}/subscribe`, sub.toJSON()));
    return true;
  }

  async disable(): Promise<void> {
    const reg = await this.swReady();
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await firstValueFrom(this.http.post(`${API}/unsubscribe`, { endpoint: sub.endpoint })).catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
    if (Notification.permission === 'granted') this.state.set('default');
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
