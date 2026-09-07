import { Injectable } from '@angular/core';

/** Un joueur tel qu'il apparaît sur la carte. */
export interface CardPlayer {
  name: string;
  initials: string;
  avatarUrl?: string | null;
  level: number;
  won: boolean;
  /** Jeux gagnés par set, de son point de vue. Ex. [6, 7]. */
  sets: number[];
}

export interface MatchCardData {
  playedAt: string | Date;
  court: string;
  type: string;
  players: [CardPlayer, CardPlayer];
  siteUrl: string;
}

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled';

const W = 1080;
const H = 1920;

const C = {
  forest: '#163F32',
  panel: '#F8F6F1',
  cream: '#EDE5D8',
  ink: '#1C1C1A',
  accent: '#1F5A45',
  sage: '#8FAE9B',
  sand: '#CDBDA7',
  muted: '#6E695C',
  heroInk: '#F4EFE3',
};

const TYPE_LABELS: Record<string, string> = { simple: 'Simple', double: 'Double', mixte: 'Mixte' };

@Injectable({ providedIn: 'root' })
export class MatchCardService {
  /** Construit la carte, tente le partage natif, retombe sur le téléchargement. */
  async share(data: MatchCardData): Promise<ShareOutcome> {
    const blob = await this.buildBlob(data);
    const stamp = new Date(data.playedAt).toISOString().slice(0, 10);
    const file = new File([blob], `match-atc-${stamp}.png`, { type: 'image/png' });

    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    const payload: ShareData = { files: [file], title: 'Mon match sur ATC' };
    if (nav.canShare?.(payload)) {
      try {
        await nav.share(payload);
        return 'shared';
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') return 'cancelled';
        // sinon on retombe sur le téléchargement
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return 'downloaded';
  }

  async buildBlob(data: MatchCardData): Promise<Blob> {
    const canvas = await this.render(data);
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob null'))), 'image/png');
    });
  }

  // ── Rendu ────────────────────────────────────────────────────────────────

  private async render(data: MatchCardData): Promise<HTMLCanvasElement> {
    await this.ensureFonts();

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.textBaseline = 'alphabetic';

    const [pa, pb] = data.players;
    // Le vainqueur en haut du scoreboard.
    const winner = pa.won ? pa : pb;
    const loser = pa.won ? pb : pa;

    const [avA, avB] = await Promise.all([
      this.loadImage(pa.avatarUrl),
      this.loadImage(pb.avatarUrl),
    ]);

    const mid = W / 2;

    // Fond + filigrane « lignes de court »
    ctx.fillStyle = C.forest;
    ctx.fillRect(0, 0, W, H);
    this.drawBlueprint(ctx);

    // Bandeau de marque (haut)
    ctx.textAlign = 'center';
    ctx.fillStyle = C.sage;
    ctx.font = '800 62px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('ATC', mid, 168);
    ctx.fillStyle = 'rgba(244,239,227,0.62)';
    ctx.font = '500 22px Inter, sans-serif';
    ctx.fillText('C O M M U N A U T É   T E N N I S   D ’ A B I D J A N', mid, 214);

    // Panneau
    const px = 56;
    const pw = W - px * 2;
    const py = 300;
    const ph = 1120;
    this.roundRect(ctx, px, py, pw, ph, 48);
    ctx.fillStyle = C.panel;
    ctx.fill();

    // Eyebrow + date
    ctx.textAlign = 'center';
    ctx.fillStyle = C.accent;
    ctx.font = '600 23px Inter, sans-serif';
    ctx.fillText('R É S U L T A T   D U   M A T C H', mid, py + 88);
    ctx.fillStyle = C.muted;
    ctx.font = '500 27px Inter, sans-serif';
    ctx.fillText(this.formatDate(data.playedAt), mid, py + 132);

    // Joueurs
    const colL = px + pw * 0.28;
    const colR = px + pw * 0.72;
    const avTop = py + 196;
    const avD = 210;

    this.drawAvatar(ctx, colL, avTop, avD, avA, pa.initials, pa.won);
    this.drawAvatar(ctx, colR, avTop, avD, avB, pb.initials, pb.won);

    ctx.textAlign = 'center';
    ctx.fillStyle = C.sand;
    ctx.font = '600 34px Inter, sans-serif';
    ctx.fillText('vs', mid, avTop + avD / 2 + 12);

    ctx.fillStyle = C.ink;
    const nameY = avTop + avD + 82;
    this.fitText(ctx, pa.name, colL, nameY, pw * 0.42, '700 46px Inter, sans-serif');
    this.fitText(ctx, pb.name, colR, nameY, pw * 0.42, '700 46px Inter, sans-serif');

    this.drawDots(ctx, colL, nameY + 44, pa.level);
    this.drawDots(ctx, colR, nameY + 44, pb.level);

    // Scoreboard
    const sbW = pw - 190;
    const sbX = mid - sbW / 2;
    const sbY = nameY + 116;
    const rowH = 118;
    this.roundRect(ctx, sbX, sbY, sbW, rowH * 2, 32);
    ctx.fillStyle = C.cream;
    ctx.fill();

    const nSets = Math.max(winner.sets.length, loser.sets.length, 1);
    const cellArea = sbW * 0.44;
    const cellW = cellArea / nSets;
    const cellsStart = sbX + sbW - 40 - cellArea;

    const drawScoreRow = (p: CardPlayer, opp: CardPlayer, top: number, isWinner: boolean) => {
      if (isWinner) {
        this.roundRect(ctx, sbX + 10, top + 9, sbW - 20, rowH - 14, 24);
        ctx.fillStyle = C.accent;
        ctx.fill();
      }
      const baseline = top + rowH / 2;

      ctx.textAlign = 'left';
      ctx.fillStyle = isWinner ? '#fff' : C.ink;
      ctx.font = '600 32px Inter, sans-serif';
      ctx.fillText(this.clip(ctx, p.name, sbW * 0.42), sbX + 40, baseline + 11);

      ctx.textAlign = 'center';
      ctx.font = '700 58px "Plus Jakarta Sans", sans-serif';
      for (let i = 0; i < nSets; i++) {
        const v = p.sets[i];
        const cx = cellsStart + cellW * (i + 0.5);
        ctx.fillStyle = isWinner
          ? '#fff'
          : (v ?? -1) > (opp.sets[i] ?? -1) ? C.ink : C.muted;
        ctx.fillText(v == null ? '·' : String(v), cx, baseline + 20);
      }
    };

    drawScoreRow(winner, loser, sbY, true);
    drawScoreRow(loser, winner, sbY + rowH, false);

    // Récit
    ctx.textAlign = 'center';
    ctx.fillStyle = C.accent;
    const narrativeY = sbY + rowH * 2 + 128;
    this.fitText(ctx, this.narrative(winner, loser), mid, narrativeY, pw - 130, '700 44px Inter, sans-serif');

    // Meta
    ctx.fillStyle = C.muted;
    const metaBits = [data.court, TYPE_LABELS[data.type] ?? data.type].filter(Boolean);
    this.fitText(ctx, metaBits.join('   ·   '), mid, narrativeY + 58, pw - 130, '500 27px Inter, sans-serif');

    // Pied (sur le fond forêt)
    ctx.textAlign = 'center';
    ctx.fillStyle = C.sage;
    ctx.font = '600 25px Inter, sans-serif';
    ctx.fillText('R E J O I N S   L A   C O M M U N A U T É', mid, py + ph + 96);
    ctx.fillStyle = C.heroInk;
    ctx.font = '700 36px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(data.siteUrl, mid, py + ph + 148);

    return canvas;
  }

  // ── Helpers dessin ───────────────────────────────────────────────────────

  private drawBlueprint(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(143,174,155,0.12)';
    ctx.lineWidth = 3;
    const block = (y: number, h: number) => {
      const x = 90;
      const w = W - 180;
      ctx.strokeRect(x, y, w, h);
      ctx.beginPath();
      ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2);
      ctx.moveTo(x + w * 0.16, y); ctx.lineTo(x + w * 0.16, y + h);
      ctx.moveTo(x + w * 0.84, y); ctx.lineTo(x + w * 0.84, y + h);
      ctx.moveTo(x + w / 2, y + h * 0.28); ctx.lineTo(x + w / 2, y + h * 0.72);
      ctx.stroke();
    };
    block(70, 180);
    block(1710, 150);
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

  private drawAvatar(
    ctx: CanvasRenderingContext2D,
    cx: number, top: number, d: number,
    img: HTMLImageElement | null, initials: string, isWinner: boolean,
  ): void {
    const r = d / 2;
    const cy = top + r;

    if (isWinner) {
      ctx.beginPath();
      ctx.arc(cx, cy, r + 9, 0, Math.PI * 2);
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 6;
      ctx.stroke();
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (img) {
      const s = Math.max(d / img.width, d / img.height);
      const dw = img.width * s;
      const dh = img.height * s;
      ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
    } else {
      ctx.fillStyle = C.accent;
      ctx.fillRect(cx - r, cy - r, d, d);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = '700 70px Inter, sans-serif';
      ctx.fillText((initials || '?').slice(0, 2).toUpperCase(), cx, cy + 24);
    }
    ctx.restore();
  }

  private drawDots(ctx: CanvasRenderingContext2D, cx: number, y: number, level: number): void {
    const d = 16;
    const gap = 12;
    const total = d * 5 + gap * 4;
    let x = cx - total / 2 + d / 2;
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath();
      ctx.arc(x, y, d / 2, 0, Math.PI * 2);
      ctx.fillStyle = i <= level ? C.accent : 'rgba(28,28,26,0.16)';
      ctx.fill();
      x += d + gap;
    }
  }

  /** Tronque `text` (avec …) pour tenir dans `maxWidth` — la police courante doit être posée. */
  private clip(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (maxWidth <= 0 || ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
    return t + '…';
  }

  /** Écrit `text` centré en `x,y`, tronqué pour tenir dans `maxWidth`. */
  private fitText(
    ctx: CanvasRenderingContext2D,
    text: string, x: number, y: number, maxWidth: number, font: string,
  ): void {
    if (font) ctx.font = font;
    ctx.fillText(this.clip(ctx, text, maxWidth), x, y);
  }

  private narrative(winner: CardPlayer, loser: CardPlayer): string {
    const wg = winner.sets.reduce((s, n) => s + (n || 0), 0);
    const lg = loser.sets.reduce((s, n) => s + (n || 0), 0);
    const total = wg + lg;
    const dominance = total > 0 ? (wg - lg) / total : 0;
    const first = (winner.name.trim().split(/\s+/)[0]) || winner.name;

    if (winner.level < loser.level) return `${first} crée la surprise`;
    if (dominance >= 0.5) return `${first} déroule`;
    if (dominance <= 0.12) return 'Duel au bout du suspense';
    return `${first} s'impose`;
  }

  private formatDate(d: string | Date): string {
    return new Date(d)
      .toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
      .toUpperCase();
  }

  private loadImage(url?: string | null): Promise<HTMLImageElement | null> {
    if (!url) return Promise.resolve(null);
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  private async ensureFonts(): Promise<void> {
    const faces = [
      '800 62px "Plus Jakarta Sans"',
      '700 58px "Plus Jakarta Sans"',
      '500 27px Inter',
      '600 32px Inter',
      '700 46px Inter',
    ];
    try {
      await Promise.all(faces.map((f) => (document as Document).fonts.load(f)));
      await (document as Document).fonts.ready;
    } catch {
      /* on dessine quand même, avec les polices système en repli */
    }
  }
}
