export interface UserPublic {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string;
  level: number;
  city?: string;
  club?: string;
  online: boolean;
  joinedAt: string;
}

export interface UserProfile extends UserPublic {
  bio?: string;
  age?: number;
  racquet?: string;
  preferredCourts: string[];
  preferredTimes: string[];
}

export interface UserMe extends UserProfile {
  email: string;
  phone?: string;
}
