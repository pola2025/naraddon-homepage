import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPolicyNewsPost extends Document {
  title: string;
  content: string;
  category?: string;
  excerpt?: string;
  thumbnail?: string;
  tags: string[];
  isMain: boolean;      // 메인 노출 여부 (true: 활성화/노출, false: 비활성화)
  isPinned: boolean;
  isDraft: boolean;     // 임시저장 여부 (true: 임시저장, false: 정식 게시)
  badge?: string;
  views: number;
  likes: number;
  comments: number;
  author?: {
    email: string;
    name?: string;
    role?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const policyNewsSchema = new Schema<IPolicyNewsPost>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: '기타',
      trim: true,
    },
    excerpt: {
      type: String,
      default: '',
      trim: true,
    },
    thumbnail: {
      type: String,
      default: '',
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    isMain: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isDraft: {
      type: Boolean,
      default: false,
    },
    badge: {
      type: String,
      default: '',
      trim: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    comments: {
      type: Number,
      default: 0,
    },
    author: {
      type: {
        email: { type: String, required: true },
        name: { type: String },
        role: { type: String },
      },
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

policyNewsSchema.index({ createdAt: -1 });
policyNewsSchema.index({ isMain: 1, isPinned: 1 });
// 성능 최적화를 위한 추가 인덱스
policyNewsSchema.index({ views: -1, createdAt: -1 }); // views 정렬용
policyNewsSchema.index({ isMain: 1, isPinned: 1, createdAt: -1 }); // 복합 인덱스 개선

const PolicyNewsPost: Model<IPolicyNewsPost> =
  mongoose.models.PolicyNewsPost ||
  mongoose.model<IPolicyNewsPost>('PolicyNewsPost', policyNewsSchema);

export default PolicyNewsPost;
