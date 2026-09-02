import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DisputesPanelComponent } from './panels/disputes-panel.component';
import { ClubsPanelComponent } from './panels/clubs-panel.component';
import { LevelsPanelComponent } from './panels/levels-panel.component';
import { MembersPanelComponent } from './panels/members-panel.component';
import { PushPanelComponent } from './panels/push-panel.component';
import { NewsPanelComponent } from './panels/news-panel.component';

type Tab = 'disputes' | 'clubs' | 'levels' | 'members' | 'push' | 'news';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [DisputesPanelComponent, ClubsPanelComponent, LevelsPanelComponent, MembersPanelComponent, PushPanelComponent, NewsPanelComponent],
  template: `
    <div class="admin-page">
      <header class="admin-header">
        <h1>Administration</h1>
        <p class="text-muted">Litiges, clubs, niveaux et rôles des membres.</p>
      </header>

      <nav class="tabs">
        <button class="tab-btn" [class.active]="tab() === 'disputes'" (click)="tab.set('disputes')">Litiges</button>
        <button class="tab-btn" [class.active]="tab() === 'clubs'" (click)="tab.set('clubs')">Clubs</button>
        <button class="tab-btn" [class.active]="tab() === 'levels'" (click)="tab.set('levels')">Niveaux</button>
        <button class="tab-btn" [class.active]="tab() === 'members'" (click)="tab.set('members')">Membres</button>
        <button class="tab-btn" [class.active]="tab() === 'push'" (click)="tab.set('push')">Notifications</button>
        <button class="tab-btn" [class.active]="tab() === 'news'" (click)="tab.set('news')">Actualité</button>
      </nav>

      @switch (tab()) {
        @case ('disputes') { <app-disputes-panel /> }
        @case ('clubs') { <app-clubs-panel /> }
        @case ('levels') { <app-levels-panel /> }
        @case ('members') { <app-members-panel /> }
        @case ('push') { <app-push-panel /> }
        @case ('news') { <app-news-panel /> }
      }
    </div>
  `,
  styleUrl: './admin-shared.css',
})
export class AdminComponent {
  readonly tab = signal<Tab>('disputes');

  constructor() {
    const t = inject(ActivatedRoute).snapshot.queryParamMap.get('tab');
    const valid: Tab[] = ['disputes', 'clubs', 'levels', 'members', 'push', 'news'];
    if (t && (valid as string[]).includes(t)) this.tab.set(t as Tab);
  }
}
