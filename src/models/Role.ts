import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Role 모델 - RBAC 역할 정의
 *
 * @purpose 역할 기반 접근 제어 (RBAC) 시스템의 역할 정의
 * @context 역할 상속 구조: admin > examiner > user
 */

export interface IRole extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  displayName: string;
  description: string;
  inheritsFrom: mongoose.Types.ObjectId | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
      description: '역할 식별자 (예: admin, examiner, user)',
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      description: '표시용 역할 이름 (예: 관리자, 기업심사관, 일반회원)',
    },
    description: {
      type: String,
      default: '',
      description: '역할 설명',
    },
    inheritsFrom: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      default: null,
      description: '상속받을 상위 역할 (예: admin은 examiner를 상속)',
    },
    isSystem: {
      type: Boolean,
      default: false,
      description: '시스템 기본 역할 여부 (삭제 불가)',
    },
  },
  {
    timestamps: true,
    collection: 'roles',
  }
);

// 인덱스 설정
RoleSchema.index({ name: 1 });
RoleSchema.index({ inheritsFrom: 1 });

const Role: Model<IRole> =
  mongoose.models.Role || mongoose.model<IRole>('Role', RoleSchema);

export default Role;
