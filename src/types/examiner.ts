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
}

export interface ExaminersData {
  examiners: Examiner[];
}