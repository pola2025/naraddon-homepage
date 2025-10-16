import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * UserRole 모델 - 사용자와 역할의 매핑
 *
 * @purpose 사용자에게 어떤 역할이 부여되었는지 관리
 * @context 다대다 관계 (User ↔ Role)
 */

export interface IUserRole extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  roleId: mongoose.Types.ObjectId;
  grantedBy: mongoose.Types.ObjectId | null;
  grantedAt: Date;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserRoleSchema = new Schema<IUserRole>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      description: '사용자 ID (NextAuth users collection)',
    },
    roleId: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: true,
      index: true,
      description: '역할 ID',
    },
    grantedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      description: '역할을 부여한 관리자 ID (감사 로그용)',
    },
    grantedAt: {
      type: Date,
      default: Date.now,
      description: '역할 부여 시각',
    },
    expiresAt: {
      type: Date,
      default: null,
      description: '역할 만료 시각 (null이면 무기한)',
    },
  },
  {
    timestamps: true,
    collection: 'user_roles',
  }
);

// 복합 인덱스 - 중복 방지 및 조회 성능
UserRoleSchema.index({ userId: 1, roleId: 1 }, { unique: true });
UserRoleSchema.index({ roleId: 1 });
UserRoleSchema.index({ expiresAt: 1 });

const UserRole: Model<IUserRole> =
  mongoose.models.UserRole ||
  mongoose.model<IUserRole>('UserRole', UserRoleSchema);

export default UserRole;
