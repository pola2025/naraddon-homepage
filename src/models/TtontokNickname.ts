import mongoose from 'mongoose';

export interface ITtontokNickname {
  _id?: string;
  nickname: string;
  role: 'general' | 'certified_examiner' | 'expert';
  isActive: boolean;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const TtontokNicknameSchema = new mongoose.Schema<ITtontokNickname>(
  {
    nickname: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['general', 'certified_examiner', 'expert'],
      required: true,
      default: 'general',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'ttontokNicknames',
  }
);

// 인덱스 생성
TtontokNicknameSchema.index({ role: 1, sortOrder: 1 });
TtontokNicknameSchema.index({ nickname: 1 });
TtontokNicknameSchema.index({ isActive: 1 });

export default mongoose.models.TtontokNickname ||
  mongoose.model<ITtontokNickname>('TtontokNickname', TtontokNicknameSchema);
