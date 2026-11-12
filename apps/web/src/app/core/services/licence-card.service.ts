import { Injectable } from '@angular/core';
import type { MyLicence } from './licence.service';

const W = 1600;
const H = 1000;

const C = {
  ink: '#10243D',
  inkLight: '#16304f',
  surface: '#F4F5F1',
  accent: '#D9EC3C',
  accentDark: '#10243D',
  muted: 'rgba(244,245,241,0.62)',
  border: 'rgba(244,245,241,0.18)',
};

export type LicenceActive = Extract<MyLicence, { active: true }>;

@Injectable({ providedIn: 'root' })
export class LicenceCardService {
  /** Génère le document (carte) et déclenche le téléchargement en PNG. */
  async download(licence: LicenceActive, holderName: string): Promise<void> {
    const canvas = await this.render(licence, holderName);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob null'))), 'image/png');
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `licence-tenci-${licence.licenceNumber}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  private async render(licence: LicenceActive, holderName: string): Promise<HTMLCanvasElement> {
    await this.ensureFonts();
    const [photo, qr] = await Promise.all([this.loadImage(licence.photoUrl), this.loadImage(licence.qrCode)]);

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.textBaseline = 'alphabetic';

    // Fond
    this.roundRect(ctx, 0, 0, W, H, 40);
    ctx.fillStyle = C.ink;
    ctx.fill();
    this.drawWatermark(ctx);

    // Bande d'accent (bord gauche)
    ctx.fillStyle = C.accent;
    ctx.fillRect(0, 0, 14, H);

    // En-tête
    ctx.textAlign = 'left';
    ctx.fillStyle = C.accent;
    ctx.font = '800 46px "Space Grotesk", sans-serif';
    ctx.fillText('TenCI', 80, 108);
    ctx.fillStyle = C.muted;
    ctx.font = '600 22px Manrope, sans-serif';
    ctx.fillText('LICENCE FÉDÉRALE · FÉDÉRATION IVOIRIENNE DE TENNIS', 80, 142);

    // Photo (gauche)
    const photoD = 300;
    const photoX = 80;
    const photoY = 200;
    this.roundRect(ctx, photoX, photoY, photoD, photoD, 24);
    ctx.save();
    ctx.clip();
    if (photo) {
      const s = Math.max(photoD / photo.width, photoD / photo.height);
      const dw = photo.width * s;
      const dh = photo.height * s;
      ctx.drawImage(photo, photoX + photoD / 2 - dw / 2, photoY + photoD / 2 - dh / 2, dw, dh);
    } else {
      ctx.fillStyle = C.inkLight;
      ctx.fillRect(photoX, photoY, photoD, photoD);
    }
    ctx.restore();

    // Statut actif
    const chipY = photoY + photoD + 40;
    this.roundRect(ctx, photoX, chipY, 300, 54, 27);
    ctx.fillStyle = 'rgba(217,236,60,0.14)';
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = C.accent;
    ctx.font = '700 24px Manrope, sans-serif';
    ctx.fillText('● LICENCE ACTIVE', photoX + 150, chipY + 35);

    // Colonne droite — identité
    const colX = 440;
    ctx.textAlign = 'left';
    ctx.fillStyle = C.muted;
    ctx.font = '600 22px Manrope, sans-serif';
    ctx.fillText('TITULAIRE', colX, 232);
    ctx.fillStyle = C.surface;
    ctx.font = '700 60px "Space Grotesk", sans-serif';
    ctx.fillText(this.clip(ctx, holderName, W - colX - 400), colX, 290);

    ctx.fillStyle = C.muted;
    ctx.font = '600 22px Manrope, sans-serif';
    ctx.fillText('NUMÉRO DE LICENCE', colX, 350);
    ctx.fillStyle = C.accent;
    ctx.font = '700 36px "Space Grotesk", sans-serif';
    ctx.fillText(licence.licenceNumber, colX, 392);

    // Grille d'infos
    const fields: [string, string][] = [
      ['CATÉGORIE', licence.categoryLabel],
      ['DISCIPLINE', licence.disciplines.join(' · ')],
      ['SAISON', licence.season],
      ['VALABLE JUSQU\'AU', this.formatDate(licence.expiresAt)],
    ];
    const fieldTop = 460;
    const colW = (W - colX - 80 - 260) / 2;
    fields.forEach(([label, value], i) => {
      const fx = colX + (i % 2) * (colW + 40);
      const fy = fieldTop + Math.floor(i / 2) * 110;
      ctx.fillStyle = C.muted;
      ctx.font = '600 20px Manrope, sans-serif';
      ctx.fillText(label, fx, fy);
      ctx.fillStyle = C.surface;
      ctx.font = '700 32px Manrope, sans-serif';
      ctx.fillText(this.clip(ctx, value, colW), fx, fy + 42);
    });

    // QR — coin bas droit, fond blanc pour le contraste
    const qrD = 220;
    const qrX = W - 80 - qrD;
    const qrY = H - 80 - qrD;
    this.roundRect(ctx, qrX - 20, qrY - 20, qrD + 40, qrD + 40, 24);
    ctx.fillStyle = C.surface;
    ctx.fill();
    if (qr) ctx.drawImage(qr, qrX, qrY, qrD, qrD);
    ctx.textAlign = 'center';
    ctx.fillStyle = C.muted;
    ctx.font = '500 18px Manrope, sans-serif';
    ctx.fillText('Scanner pour vérifier', qrX + qrD / 2, qrY + qrD + 50);

    return canvas;
  }

  private drawWatermark(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    this.roundRect(ctx, 0, 0, W, H, 40);
    ctx.clip();
    ctx.translate(W / 2, H / 2);
    ctx.rotate((-18 * Math.PI) / 180);
    ctx.fillStyle = 'rgba(244,245,241,0.035)';
    ctx.font = '700 40px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    for (let y = -H; y < H; y += 90) {
      ctx.fillText('TENCI · DOCUMENT OFFICIEL · FIT 2026'.repeat(3), 0, y);
    }
    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  private clip(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (maxWidth <= 0 || ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
    return t + '…';
  }

  private formatDate(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  private loadImage(src?: string | null): Promise<HTMLImageElement | null> {
    if (!src) return Promise.resolve(null);
    return new Promise((resolve) => {
      const img = new Image();
      if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  private async ensureFonts(): Promise<void> {
    const faces = ['800 46px "Space Grotesk"', '700 60px "Space Grotesk"', '600 22px Manrope', '700 32px Manrope'];
    try {
      await Promise.all(faces.map((f) => (document as Document).fonts.load(f)));
      await (document as Document).fonts.ready;
    } catch {
      /* on dessine quand même, avec les polices système en repli */
    }
  }
}
