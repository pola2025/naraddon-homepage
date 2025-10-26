import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ExaminerActivityStats {
  totalAnswers: number;
  helpfulCount: number;
  averageResponseMinutes: number | null;
  lastActiveAt: Date | null;
}

/**
 * 브랜드 페이지 - 경력 정보
 */
export interface ExaminerCareer {
  period: string;           // 기간 (예: 2020.01 - 2022.12)
  company: string;          // 회사/기관명
  position: string;         // 직책
  description?: string;     // 업무 내용
}

/**
 * 브랜드 페이지 - 성공 케이스/포트폴리오
 * @note 심사관이 직접 작성하는 케이스 전달 공간 (고객 리뷰 아님)
 */
export interface ExaminerSuccessCase {
  title: string;            // 케이스 제목
  client?: string;          // 고객사명 (선택)
  content: string;          // 케이스 내용
  date: Date;               // 작성일
}

/**
 * 브랜드 페이지 - 연락처 정보
 */
export interface ExaminerContactInfo {
  website?: string;         // 웹사이트 URL
  consultationHours?: string; // 상담 가능 시간
  address?: string;         // 주소
}

/**
 * 브랜드 페이지 전체 정보
 * @purpose 심사관 개별 브랜드 페이지 데이터 관리
 * @context 각 심사관은 본인 페이지를 편집할 수 있으며, 관리자는 모든 페이지 관리 가능
 */
export interface ExaminerBrandPage {
  // 회사소개
  companyLogo?: string;           // 회사 로고 URL
  companyIntro?: string;          // 회사 소개 (직접 작성)
  useDefaultIntro: boolean;       // 나라똔 기본 소개 사용 여부

  // 정보 이미지 (1개, 10MB 이하, 자동 압축)
  infoImage?: string;

  // 경력
  careers: ExaminerCareer[];

  // 성공 케이스 (심사관이 직접 작성)
  successCases: ExaminerSuccessCase[];

  // 연락처 정보
  contactInfo: ExaminerContactInfo;
}

export interface IExpertExaminer extends Document {
  name: string;
  position: string;
  companyName?: string;
  category?: string;
  specialties: string[];
  imageUrl?: string;
  imageAlt?: string;
  sortOrder: number;
  legacyKey?: string;
  isPublished: boolean;
  headline?: string;
  bio?: string;
  profileHighlights: string[];
  focusAreas: string[];
  activityStats: ExaminerActivityStats;
  brandPage?: ExaminerBrandPage;
  views: number;
  likes: number;

  // 사용자 연결 정보
  email?: string;           // users 컬렉션과 동기화된 이메일
  userId?: string;          // 연결된 사용자 ObjectId (문자열)

  createdAt: Date;
  updatedAt: Date;
}

const toUniqueStringArray = (values: unknown): string[] => {
  if (typeof values === 'string') {
    return values
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  if (!Array.isArray(values)) {
    return [];
  }

  const normalized = values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(normalized));
};

const expertExaminerSchema = new Schema<IExpertExaminer>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    position: {
      type: String,
      required: true,
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      default: 'funding',
    },
    specialties: {
      type: [String],
      default: [],
      set: toUniqueStringArray,
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    imageAlt: {
      type: String,
      trim: true,
      default: '',
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    legacyKey: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    headline: {
      type: String,
      trim: true,
      default: '',
    },
    bio: {
      type: String,
      trim: true,
      default: '',
    },
    profileHighlights: {
      type: [String],
      default: [],
      set: toUniqueStringArray,
    },
    focusAreas: {
      type: [String],
      default: [],
      set: toUniqueStringArray,
    },
    activityStats: {
      totalAnswers: { type: Number, default: 0, min: 0 },
      helpfulCount: { type: Number, default: 0, min: 0 },
      averageResponseMinutes: { type: Number, default: null },
      lastActiveAt: { type: Date, default: null },
    },
    brandPage: {
      companyLogo: { type: String, trim: true, default: '' },
      companyIntro: { type: String, trim: true, default: '' },
      useDefaultIntro: { type: Boolean, default: true },
      infoImage: { type: String, trim: true, default: '' },
      careers: {
        type: [{
          period: { type: String, required: true },
          company: { type: String, required: true },
          position: { type: String, required: true },
          description: { type: String, default: '' },
        }],
        default: [],
      },
      successCases: {
        type: [{
          title: { type: String, required: true },
          client: { type: String, default: '' },
          content: { type: String, required: true },
          date: { type: Date, default: Date.now },
        }],
        default: [],
      },
      contactInfo: {
        website: { type: String, trim: true, default: '' },
        consultationHours: { type: String, trim: true, default: '' },
        address: { type: String, trim: true, default: '' },
      },
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },
    email: {
      type: String,
      trim: true,
      default: '',
    },
    userId: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

expertExaminerSchema.index({ sortOrder: 1, createdAt: -1 });
expertExaminerSchema.index({ isPublished: 1 });
expertExaminerSchema.index({ category: 1, sortOrder: 1, createdAt: -1 });
expertExaminerSchema.index({ legacyKey: 1 }, { unique: true, sparse: true });
expertExaminerSchema.index({ email: 1 });
expertExaminerSchema.index({ userId: 1 });

const ExpertExaminer: Model<IExpertExaminer> =
  mongoose.models.ExpertExaminer ||
  mongoose.model<IExpertExaminer>('ExpertExaminer', expertExaminerSchema);

export default ExpertExaminer;
