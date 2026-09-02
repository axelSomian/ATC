import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type {
  AdminPost, AdminPostPayload, PostCard, PostCategory, PostDetail, PostFeed, PostStatus, RssFeed,
} from '../models/news.model';

const PUB = '/api/v1/news';
const ADM = '/api/v1/admin/news';

@Injectable({ providedIn: 'root' })
export class NewsService {
  private readonly http = inject(HttpClient);

  // ── Public ──
  feed(opts: { category?: PostCategory; cursor?: string; limit?: number } = {}) {
    let params: Record<string, string> = {};
    if (opts.category) params['category'] = opts.category;
    if (opts.cursor) params['cursor'] = opts.cursor;
    if (opts.limit) params['limit'] = String(opts.limit);
    return this.http.get<PostFeed>(PUB, { params });
  }
  featured() { return this.http.get<PostCard[]>(`${PUB}/featured`); }
  upcomingEvents() { return this.http.get<PostCard[]>(`${PUB}/events/upcoming`); }
  allEvents() { return this.http.get<PostCard[]>(`${PUB}/events`); }
  partnerOfMonth() { return this.http.get<PostCard | null>(`${PUB}/partner-of-month`); }
  detail(slug: string) { return this.http.get<PostDetail>(`${PUB}/${slug}`); }

  // ── Admin ──
  adminList(filter: { status?: PostStatus; category?: PostCategory } = {}) {
    let params: Record<string, string> = {};
    if (filter.status) params['status'] = filter.status;
    if (filter.category) params['category'] = filter.category;
    return this.http.get<AdminPost[]>(ADM, { params });
  }
  adminGet(id: string) { return this.http.get<AdminPost>(`${ADM}/${id}`); }
  adminCreate(payload: AdminPostPayload) { return this.http.post<AdminPost>(ADM, payload); }
  adminUpdate(id: string, payload: Partial<AdminPostPayload>) {
    return this.http.patch<AdminPost>(`${ADM}/${id}`, payload);
  }
  adminRemove(id: string) { return this.http.delete<void>(`${ADM}/${id}`); }
  uploadImage(file: File, kind: 'cover' | 'gallery') {
    const fd = new FormData();
    fd.append('image', file);
    return this.http.post<{ url: string }>(`${ADM}/images?kind=${kind}`, fd);
  }

  // ── Flux RSS ──
  listFeeds() { return this.http.get<RssFeed[]>(`${ADM}/feeds`); }
  addFeed(payload: { url: string; label: string; autoPublish: boolean }) {
    return this.http.post<RssFeed>(`${ADM}/feeds`, payload);
  }
  updateFeed(id: string, payload: Partial<{ label: string; autoPublish: boolean; active: boolean }>) {
    return this.http.patch<RssFeed>(`${ADM}/feeds/${id}`, payload);
  }
  removeFeed(id: string) { return this.http.delete<void>(`${ADM}/feeds/${id}`); }
  syncFeeds() { return this.http.post<{ feeds: number; imported: number }>(`${ADM}/feeds/sync`, {}); }
}
