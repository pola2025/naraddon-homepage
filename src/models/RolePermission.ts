import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * RolePermission 모델 - 역할과 퍼미션의 매핑
 *
 * @purpose 역할에 어떤 퍼미션이 부여되었는지 관리
 * @context 다대다 관계 (Role ↔ Permission)
 */

export interface IRolePermission extends Document {
  _id: mongoose.Types.ObjectId;
  roleId: mongoose.Types.ObjectId;
  permissionId: mongoose.Types.ObjectId;
  grantedBy: mongoose.Types.ObjectId | null;
  grantedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RolePermissionSchema = new Schema<IRolePermission>(
  {
    roleId: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: true,
      index: true,
      description: '역할 ID',
    },
    permissionId: {
      type: Schema.Types.ObjectId,
      ref: 'Permission',
      required: true,
      index: true,
      description: '퍼미션 ID',
    },
    grantedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      description: '권한을 부여한 사용자 ID (감사 로그용)',
    },
    grantedAt: {
      type: Date,
      default: Date.now,
      description: '권한 부여 시각',
    },
  },
  {
    timestamps: true,
    collection: 'role_permissions',
  }
);

// 복합 인덱스 - 중복 방지 및 조회 성능
RolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true });
RolePermissionSchema.index({ permissionId: 1 });

const RolePermission: Model<IRolePermission> =
  mongoose.models.RolePermission ||
  mongoose.model<IRolePermission>('RolePermission', RolePermissionSchema);

export default RolePermission;
