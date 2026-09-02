import {
  Component, DestroyRef, ElementRef, OnDestroy, ViewChild,
  computed, effect, inject, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MessagesService } from '../../core/services/messages.service';
import { CourtMapService } from '../../core/services/court-map.service';
import { SocketService } from '../../core/services/socket.service';
import { AuthStore } from '../../core/stores/auth.store';
import type {
  ChatMessage, ConversationDetail, ConvParticipant,
} from '../../core/models/conversation.model';

const TYPE_LABELS: Record<string, string> = { simple: 'Simple', double: 'Double', mixte: 'Mixte' };

@Component({
  selector: 'app-conversation',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <div class="chat">
      <header class="chat-head">
        <a routerLink="/messages" class="back-btn" aria-label="Retour">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        </a>
        @if (other(); as o) {
          <a [routerLink]="['/members', o.id]" class="chat-peer">
            <div class="avatar avatar-sm">
              @if (o.avatarUrl) { <img [src]="o.avatarUrl" [alt]="o.name" class="avatar-img" /> }
              @else { {{ o.initials }} }
            </div>
            <div>
              <span class="peer-name">{{ o.name }}</span>
              <span class="level-dots">
                @for (d of [1,2,3,4,5]; track d) {
                  <span class="level-dot" [class.active]="d <= o.level"></span>
                }
              </span>
            </div>
          </a>
        } @else {
          <span class="peer-name">Conversation</span>
        }
      </header>

      @if (detail()?.match; as m) {
        <div class="match-reminder">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20"/><path d="M2 12h20"/></svg>
          <span>{{ m.when | date: 'EEE d MMM' }} · {{ m.when | date: 'HH\\'h\\'mm' }}</span>
          <span class="dot-sep">·</span>
          <button type="button" class="court-link" (click)="openMap(m.court)">{{ m.court }}</button>
          <span class="dot-sep">·</span>
          <span>{{ typeLabel(m.type) }}</span>
        </div>
      }

      <div class="chat-scroll" #scrollBox>
        @if (loading()) {
          <p class="chat-hint">Chargement…</p>
        } @else if (error()) {
          <p class="chat-hint">{{ error() }}</p>
        } @else {
          @if (hasMore()) {
            <button class="load-more" (click)="loadMore()" [disabled]="loadingMore()">
              {{ loadingMore() ? 'Chargement…' : 'Voir les messages précédents' }}
            </button>
          }
          @if (messages().length === 0) {
            <p class="chat-hint">Aucun message. Dites bonjour 👋</p>
          }
          @for (msg of messages(); track msg.id; let i = $index) {
            @if (showDaySep(i)) {
              <div class="day-sep"><span>{{ msg.createdAt | date: 'EEEE d MMMM' }}</span></div>
            }
            <div class="bubble-row" [class.mine]="msg.senderId === meId()">
              <div class="bubble">
                <p>{{ msg.body }}</p>
                <span class="bubble-meta">
                  {{ msg.createdAt | date: 'HH:mm' }}
                  @if (msg.senderId === meId() && msg.id === lastMineId()) {
                    · {{ msg.readAt ? 'Lu' : 'Envoyé' }}
                  }
                </span>
              </div>
            </div>
          }
        }
      </div>

      <form class="composer" (submit)="send(); $event.preventDefault()">
        <input
          type="text"
          class="composer-input"
          placeholder="Votre message…"
          [value]="draft()"
          (input)="draft.set($any($event.target).value)"
          [disabled]="loading() || !!error()"
          maxlength="2000"
        />
        <button type="submit" class="btn btn-primary btn-sm" [disabled]="!draft().trim() || sending()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </form>
    </div>
  `,
  styles: [`
    .chat {
      max-width: 640px; margin: 0 auto;
      display: flex; flex-direction: column;
      background: var(--color-surface);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-xl);
      overflow: hidden;
    }

    .chat-head {
      display: flex; align-items: center; gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--color-border-light);
    }
    .back-btn {
      display: flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; flex-shrink: 0;
      border-radius: var(--radius-md); color: var(--color-ink);
      text-decoration: none;
    }
    .back-btn:hover { background: var(--color-cream); }
    .chat-peer { display: flex; align-items: center; gap: var(--space-2); text-decoration: none; color: var(--color-ink); }
    .peer-name { display: block; font-weight: 600; font-size: var(--text-md); }
    .level-dots { display: inline-flex; gap: 2px; margin-top: 2px; }
    .level-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--color-border); }
    .level-dot.active { background: var(--color-accent); }

    .match-reminder {
      display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2);
      padding: var(--space-2) var(--space-4);
      background: var(--color-cream);
      font-size: var(--text-xs); color: var(--color-muted);
      border-bottom: 1px solid var(--color-border-light);
    }
    .dot-sep { opacity: 0.5; }
    .court-link {
      background: none; border: none; padding: 0; cursor: pointer;
      font: inherit; color: var(--color-accent); text-decoration: underline;
    }

    .chat-scroll {
      height: 52vh; min-height: 220px; overflow-y: auto;
      padding: var(--space-4);
      display: flex; flex-direction: column; gap: var(--space-2);
      background: var(--color-bg);
    }
    .chat-hint { text-align: center; color: var(--color-muted); font-size: var(--text-sm); margin: auto 0; }

    .load-more {
      align-self: center; background: none; border: 1px solid var(--color-border);
      border-radius: var(--radius-full); padding: 4px 12px; margin-bottom: var(--space-2);
      font-size: var(--text-xs); color: var(--color-muted); cursor: pointer;
    }
    .load-more:hover { background: var(--color-cream); }

    .day-sep { text-align: center; margin: var(--space-3) 0 var(--space-1); }
    .day-sep span {
      font-size: var(--text-xs); color: var(--color-muted);
      background: var(--color-cream); padding: 2px 10px; border-radius: var(--radius-full);
    }

    .bubble-row { display: flex; }
    .bubble-row.mine { justify-content: flex-end; }
    .bubble {
      max-width: 78%;
      background: var(--color-surface);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg);
      padding: var(--space-2) var(--space-3);
    }
    .bubble-row.mine .bubble {
      background: var(--color-accent); border-color: var(--color-accent); color: #fff;
    }
    .bubble p { margin: 0; font-size: var(--text-sm); line-height: 1.45; white-space: pre-wrap; word-break: break-word; }
    .bubble-meta { display: block; margin-top: 3px; font-size: 10px; opacity: 0.65; text-align: right; }

    .composer {
      display: flex; align-items: center; gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      border-top: 1px solid var(--color-border-light);
    }
    .composer-input {
      flex: 1; height: 38px; padding: 0 var(--space-3);
      border: 1px solid var(--color-border); border-radius: var(--radius-full);
      background: var(--color-bg); font: inherit; font-size: 16px;
    }
    .composer-input:focus { outline: none; border-color: var(--color-accent); }
    .composer .btn { flex-shrink: 0; width: 38px; height: 38px; padding: 0; border-radius: 50%; }
  `],
})
export class ConversationComponent implements OnDestroy {
  private readonly route     = inject(ActivatedRoute);
  private readonly svc       = inject(MessagesService);
  private readonly courtMap  = inject(CourtMapService);
  private readonly socket    = inject(SocketService);
  private readonly store     = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('scrollBox') scrollBox?: ElementRef<HTMLDivElement>;

  readonly convId      = signal('');
  readonly detail      = signal<ConversationDetail | null>(null);
  readonly messages    = signal<ChatMessage[]>([]);
  readonly loading     = signal(true);
  readonly hasMore     = signal(false);
  readonly loadingMore = signal(false);
  readonly sending     = signal(false);
  readonly draft       = signal('');
  readonly error       = signal('');

  readonly meId  = computed(() => this.store.user()?.id ?? '');
  readonly other = computed<ConvParticipant | null>(() => {
    const d = this.detail();
    return d ? d.participants.find((p) => p.id !== this.meId()) ?? null : null;
  });
  readonly lastMineId = computed(() => {
    const mine = this.messages().filter((m) => m.senderId === this.meId());
    return mine.length ? mine[mine.length - 1].id : null;
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pm) => {
      const id = pm.get('id');
      if (id) this.load(id);
    });

    effect(() => {
      const ev = this.svc.incoming();
      if (!ev || ev.conversationId !== this.convId()) return;
      this.mergeMessage(ev.message);
      if (ev.message.senderId !== this.meId()) this.svc.markRead(this.convId());
      this.scrollSoon();
    }, { allowSignalWrites: true });

    effect(() => {
      const ev = this.svc.readEvent();
      if (!ev || ev.conversationId !== this.convId()) return;
      this.messages.update((list) =>
        list.map((m) => (m.senderId === this.meId() && !m.readAt ? { ...m, readAt: ev.readAt } : m)),
      );
    }, { allowSignalWrites: true });
  }

  ngOnDestroy(): void {
    this.svc.activeId.set(null);
    this.socket.emit('conversation:leave');
  }

  typeLabel(t: string): string { return TYPE_LABELS[t] ?? t; }
  openMap(court: string): void { this.courtMap.open(court); }

  showDaySep(i: number): boolean {
    const list = this.messages();
    if (i === 0) return true;
    return new Date(list[i].createdAt).toDateString() !== new Date(list[i - 1].createdAt).toDateString();
  }

  private load(id: string): void {
    this.convId.set(id);
    this.svc.activeId.set(id);
    this.socket.emit('conversation:enter', id);
    this.loading.set(true);
    this.detail.set(null);
    this.messages.set([]);
    this.error.set('');

    this.svc.getConversation(id).subscribe({
      next: (d) => this.detail.set(d),
      error: () => { this.error.set('Conversation introuvable'); this.loading.set(false); },
    });
    this.svc.listMessages(id).subscribe({
      next: (page) => {
        this.messages.set(page.data);
        this.hasMore.set(page.hasMore);
        this.loading.set(false);
        this.svc.markRead(id);
        this.scrollSoon();
      },
      error: () => this.loading.set(false),
    });
  }

  loadMore(): void {
    if (!this.hasMore() || this.loadingMore()) return;
    const oldest = this.messages()[0];
    if (!oldest) return;
    this.loadingMore.set(true);
    this.svc.listMessages(this.convId(), oldest.createdAt).subscribe({
      next: (page) => {
        this.messages.update((list) => [...page.data, ...list]);
        this.hasMore.set(page.hasMore);
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false),
    });
  }

  send(): void {
    const body = this.draft().trim();
    if (!body || this.sending()) return;
    this.sending.set(true);
    this.error.set('');
    this.svc.send(this.convId(), body).subscribe({
      next: (msg) => {
        this.mergeMessage(msg);
        this.draft.set('');
        this.sending.set(false);
        this.scrollSoon();
      },
      error: (e: { error?: { error?: string } }) => {
        this.error.set(e?.error?.error ?? "Échec de l'envoi, réessayez");
        this.sending.set(false);
      },
    });
  }

  private mergeMessage(m: ChatMessage): void {
    this.messages.update((list) => {
      if (list.some((x) => x.id === m.id)) return list;
      return [...list, m].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    });
  }

  private scrollSoon(): void {
    setTimeout(() => {
      const el = this.scrollBox?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 40);
  }
}
