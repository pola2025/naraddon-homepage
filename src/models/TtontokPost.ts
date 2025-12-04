import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type TtontokCategory =
  | 'funding'
  | 'tax'
  | 'hr'
  | 'marketing'
  | 'strategy'
  | 'tech'
  | 'legal'
  | 'etc';

export interface ITtontokPost extends Document {
  title: string;
  category: TtontokCategory;
  content: string;
  nickname: string;
  memberId?: Types.ObjectId | null;
  tags: string[];
  viewCount: number;
  likeCount: number;
  replyCount: number;
  isBest: boolean;
  isArchived: boolean;
  isDraft: boolean;           // 임시저장 여부
  draftExpiresAt?: Date;      // 임시저장 만료 시간 (2일 후 자동 삭제)
  createdAt: Date;
  updatedAt: Date;
}

const TtontokPostSchema = new Schema<ITtontokPost>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    category: {
      type: String,
      required: true,
      enum: ['funding', 'tax', 'hr', 'marketing', 'strategy', 'tech', 'legal', 'etc'],
      lowercase: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    nickname: {
      type: String,
      required: true,
      trim: true,
    },
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      set: (values: unknown) => {
        if (!Array.isArray(values)) {
          return [];
        }
        const normalized = values
          .map((value) => (typeof value === 'string' ? value.trim() : ''))
          .filter((value) => value.length > 0);
        return Array.from(new Set(normalized));
      },
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    replyCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isBest: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    isDraft: {
      type: Boolean,
      default: false,
      index: true,
    },
    draftExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false,
  }
);

TtontokPostSchema.index({ createdAt: -1 });
TtontokPostSchema.index({ category: 1, createdAt: -1 });
TtontokPostSchema.index({ viewCount: -1 });
TtontokPostSchema.index({ likeCount: -1 });

const TtontokPost: Model<ITtontokPost> =
  mongoose.models.TtontokPost || mongoose.model<ITtontokPost>('TtontokPost', TtontokPostSchema);

export default TtontokPost;
