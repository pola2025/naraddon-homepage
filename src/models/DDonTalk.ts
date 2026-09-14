import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDDonTalk extends Document {
  title: string;
  content: string;
  author: string;
  company: string;
  category: string;
  viewCount: number;
  likes: number;
  comments: IDDonTalkComment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IDDonTalkComment {
  _id?: string;
  author: string;
  content: string;
  createdAt: Date;
}

const DDonTalkCommentSchema = new Schema({
  author: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const DDonTalkSchema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true }, // 실제 회원 작성 시 글자 수 제한 없음
  author: { type: String, required: true },
  company: { type: String, required: true },
  category: { type: String, required: true },
  viewCount: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  comments: [DDonTalkCommentSchema]
}, {
  timestamps: true
});

// 댓글 수 가상 필드
DDonTalkSchema.virtual('commentCount').get(function() {
  return this.comments ? this.comments.length : 0;
});

// JSON 변환 시 가상 필드 포함
DDonTalkSchema.set('toJSON', { virtuals: true });
DDonTalkSchema.index({ createdAt: -1, _id: -1 });
DDonTalkSchema.index({ likes: -1, _id: -1 });

const DDonTalk: Model<IDDonTalk> =
  mongoose.models.DDonTalk || mongoose.model<IDDonTalk>('DDonTalk', DDonTalkSchema);

export default DDonTalk;
