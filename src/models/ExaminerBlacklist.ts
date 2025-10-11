/**
 * 기업심사관 블랙리스트 고객 관리 모델
 *
 * @purpose 문제 고객 정보를 심사관들이 공유하여 사전 예방
 * @access 기업심사관만 접근 가능
 * @features 등록, 조회, 수정, 삭제, 메모 추가
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * 메모 인터페이스
 */
interface IMemo {
  content: string;
  createdBy: mongoose.Types.ObjectId;
  createdByName: string;
  createdAt: Date;
}

/**
 * 블랙리스트 문서 인터페이스
 */
export interface IExaminerBlacklist extends Document {
  // 고객 정보
  customerName: string;
  phoneNumber: string;
  companyName?: string;
  businessNumber?: string;

  // 등록 정보
  reason?: string;
  registeredBy: mongoose.Types.ObjectId;
  registeredByName: string;
  registeredAt: Date;

  // 메모
  memos: IMemo[];

  // 수정 정보
  updatedAt?: Date;
  updatedBy?: mongoose.Types.ObjectId;
  updatedByName?: string;
}

/**
 * 메모 스키마
 */
const MemoSchema = new Schema<IMemo>({
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdByName: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * 블랙리스트 스키마
 */
const ExaminerBlacklistSchema = new Schema<IExaminerBlacklist>({
  // 고객 정보
  customerName: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  companyName: {
    type: String,
    trim: true,
    index: true,
  },
  businessNumber: {
    type: String,
    trim: true,
    index: true,
  },

  // 등록 정보
  reason: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  registeredBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  registeredByName: {
    type: String,
    required: true,
  },
  registeredAt: {
    type: Date,
    default: Date.now,
    index: true,
  },

  // 메모
  memos: {
    type: [MemoSchema],
    default: [],
  },

  // 수정 정보
  updatedAt: {
    type: Date,
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedByName: {
    type: String,
  },
});

// 복합 인덱스 생성 (검색 성능 향상)
ExaminerBlacklistSchema.index({
  customerName: 'text',
  phoneNumber: 'text',
  companyName: 'text',
  businessNumber: 'text',
});

// 모델 생성 (이미 존재하면 기존 모델 사용)
const ExaminerBlacklist: Model<IExaminerBlacklist> =
  mongoose.models.ExaminerBlacklist ||
  mongoose.model<IExaminerBlacklist>('ExaminerBlacklist', ExaminerBlacklistSchema);

export default ExaminerBlacklist;
