import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { AvailabilitySlot } from '../models/availability.model';

const API = '/api/v1';

export interface SlotPayload {
  startsAt: string;
  endsAt: string;
  status: 'free' | 'busy';
}

@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private readonly http = inject(HttpClient);

  getWeekSlots(week: string) {
    return this.http.get<AvailabilitySlot[]>(`${API}/availability/me`, { params: { week } });
  }

  upsertSlot(dto: SlotPayload) {
    return this.http.put<AvailabilitySlot>(`${API}/availability/me/slot`, dto);
  }

  deleteSlot(id: string) {
    return this.http.delete<{ message: string }>(`${API}/availability/me/slot/${id}`);
  }
}
