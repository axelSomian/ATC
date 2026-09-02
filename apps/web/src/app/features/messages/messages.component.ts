import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MessagesService } from '../../core/services/messages.service';
import { AuthStore } from '../../core/stores/auth.store';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <div class="msg-page">
      <header class="msg-head">
        <h1>Messages</h1>
        <p class="text-muted">Organisez vos matchs avec vos adversaires.</p>
      </header>

      @if (conversations().length === 0) {
        <div class="card empty-state">
          <div class="empty-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <p class="empty-title">Aucune conversation</p>
          <p class="text-muted" style="font-size:var(--text-sm)">
            Une conversation s'ouvre dès qu'une proposition de match est acceptée.
          </p>
        </div>
      } @else {
        <ul class="conv-list">
          @for (c of conversations(); track c.id) {
            <li>
              <a [routerLink]="['/messages', c.id]" class="conv-row" [class.unread]="c.unread > 0">
                <div class="avatar avatar-lg">
                  @if (c.otherUser?.avatarUrl) {
                    <img [src]="c.otherUser!.avatarUrl" [alt]="c.otherUser!.name" class="avatar-img" />
                  } @else {
                    {{ c.otherUser?.initials ?? '?' }}
                  }
                </div>
                <div class="conv-main">
                  <div class="conv-top">
                    <span class="conv-name">{{ c.otherUser?.name ?? 'Joueur' }}</span>
                    <span class="conv-time">{{ c.lastMessageAt | date: 'd MMM' }}</span>
                  </div>
                  <div class="conv-bottom">
                    <span class="conv-preview">
                      @if (c.lastMessage) {
                        @if (c.lastMessage.senderId === myId()) { <span class="conv-you">Vous : </span> }
                        {{ c.lastMessage.body }}
                      } @else {
                        <span class="text-muted">Démarrez la conversation</span>
                      }
                    </span>
                    @if (c.unread > 0) {
                      <span class="conv-badge">{{ c.unread > 9 ? '9+' : c.unread }}</span>
                    }
                  </div>
                </div>
              </a>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .msg-page { max-width: 640px; margin: 0 auto; padding: var(--space-5) var(--space-4) var(--space-12); }
    .msg-head { margin-bottom: var(--space-5); }
    .msg-head h1 { font-size: var(--text-2xl); font-weight: 700; margin: 0 0 var(--space-1); }
    .msg-head p { font-size: var(--text-sm); margin: 0; }

    .empty-state { text-align: center; padding: var(--space-10) var(--space-5); }
    .empty-icon { color: var(--color-accent); margin-bottom: var(--space-3); display: flex; justify-content: center; }
    .empty-title { font-weight: 600; margin: 0 0 var(--space-1); }

    .conv-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-1); }
    .conv-row {
      display: flex; align-items: center; gap: var(--space-3);
      padding: var(--space-3); border-radius: var(--radius-lg);
      text-decoration: none; color: var(--color-ink);
      transition: background var(--transition);
    }
    .conv-row:hover { background: var(--color-cream); }
    .conv-row.unread { background: var(--color-accent-alpha); }

    .conv-main { flex: 1; min-width: 0; }
    .conv-top { display: flex; justify-content: space-between; align-items: baseline; gap: var(--space-2); }
    .conv-name { font-weight: 600; font-size: var(--text-md); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .conv-time { font-size: var(--text-xs); color: var(--color-muted); flex-shrink: 0; }

    .conv-bottom { display: flex; align-items: center; gap: var(--space-2); margin-top: 2px; }
    .conv-preview {
      flex: 1; min-width: 0; font-size: var(--text-sm); color: var(--color-muted);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .conv-row.unread .conv-preview { color: var(--color-ink); font-weight: 500; }
    .conv-you { color: var(--color-muted); font-weight: 400; }

    .conv-badge {
      flex-shrink: 0; min-width: 18px; height: 18px; padding: 0 5px;
      background: var(--color-accent); color: #fff;
      font-size: var(--text-xs); font-weight: 700; border-radius: var(--radius-full);
      display: flex; align-items: center; justify-content: center;
    }
  `],
})
export class MessagesComponent {
  private readonly svc   = inject(MessagesService);
  private readonly store = inject(AuthStore);

  readonly conversations = this.svc.conversations;
  readonly myId = computed(() => this.store.user()?.id ?? '');

  constructor() {
    this.svc.refresh();
  }
}
