export interface Examiner {
  _id: string;
  name: string;
  position: string;
  companyName: string;
  category: 'funding' | 'export' | 'certification' | 'manufacturing' | 'startup';
  specialties: string[];
  imageUrl: string;
  imageAlt: string;
  sortOrder: number;
  legacyKey: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  activityScore?: number;
  activityStats?: {
    loginCount: number;
    pageVisits: number;
    postsCreated: number;
    commentsCreated: number;
    lastActiveAt: string | null;
  } | null;
}

export interface ExaminersData {
  examiners: Examiner[];
}