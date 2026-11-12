import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const API = '/api/v1';

export type LicenceProfile = 'joueur' | 'coach' | 'ecole' | 'decouverte';
export type LicenceCategory =
  | 'adulte'
  | 'jeunes'
  | 'coach'
  | 'ecole'
  | 'decouverte_jeunes'
  | 'decouverte_adultes';
export type Discipline = 'tennis' | 'padel';

export interface LicenceQuote {
  category: LicenceCategory;
  label: string;
  amount: number;
  validity: string;
}

export type MyLicence =
  | { season: string; active: false }
  | {
      season: string;
      active: true;
      licenceNumber: string;
      category: LicenceCategory;
      categoryLabel: string;
      disciplines: Discipline[];
      cniUrl: string;
      photoUrl: string;
      amount: number;
      paidAt: string;
      expiresAt: string;
      verificationCode: string;
      qrCode: string;
      verifyUrl: string;
    };

export interface LicenceVerification {
  valid: true;
  licenceNumber: string;
  holderName: string;
  category: LicenceCategory;
  categoryLabel: string;
  disciplines: Discipline[];
  season: string;
  expiresAt: string;
  status: 'active' | 'expired';
}

export interface PayLicencePayload {
  profile: LicenceProfile;
  birthDate: string;
  birthPlace: string;
  disciplines: Discipline[];
  cni: File;
  photo: File;
}

@Injectable({ providedIn: 'root' })
export class LicenceService {
  private readonly http = inject(HttpClient);

  getMine() {
    return this.http.get<MyLicence>(`${API}/licence/me`);
  }

  quote(profile: LicenceProfile, birthDate: string) {
    return this.http.post<LicenceQuote>(`${API}/licence/quote`, { profile, birthDate });
  }

  pay(payload: PayLicencePayload) {
    const fd = new FormData();
    fd.append('profile', payload.profile);
    fd.append('birthDate', payload.birthDate);
    fd.append('birthPlace', payload.birthPlace);
    fd.append('disciplines', JSON.stringify(payload.disciplines));
    fd.append('cni', payload.cni);
    fd.append('photo', payload.photo);
    return this.http.post<MyLicence>(`${API}/licence/pay`, fd);
  }

  verify(code: string) {
    return this.http.get<LicenceVerification>(`${API}/licence/verify/${code}`);
  }
}
