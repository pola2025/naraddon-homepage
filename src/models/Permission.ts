import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Permission 모델 - RBAC 퍼미션 정의
 *
 * @purpose 세밀한 권한 제어를 위한 퍼미션 정의
 * @context resource:action 형식 (예: policy:analysis:write)
 */

export interface IPermission extends Document {
  _id: mongoose.Types.ObjectId;
  resource: string;
  action: string;
  code: string;
  displayName: string;
  description: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSchema = new Schema<IPermission>(
  {
    resource: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      description: '리소스 타입 (예: policy, user, admin)',
    },
    action: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      description: '액션 타입 (예: read, write, delete, manage)',
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
      description: '퍼미션 코드 (resource:action 형식, 예: policy:analysis:write)',
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      description: '표시용 퍼미션 이름 (예: 정책분석 작성 권한)',
    },
    description: {
      type: String,
      default: '',
      description: '퍼미션 설명',
    },
    isSystem: {
      type: Boolean,
      default: false,
      description: '시스템 기본 퍼미션 여부 (삭제 불가)',
    },
  },
  {
    timestamps: true,
    collection: 'permissions',
  }
);

// 인덱스 설정
PermissionSchema.index({ code: 1 });
PermissionSchema.index({ resource: 1, action: 1 });

// code 자동 생성
PermissionSchema.pre('validate', function (next) {
  if (!this.code && this.resource && this.action) {
    this.code = `${this.resource}:${this.action}`;
  }
  next();
});

const Permission: Model<IPermission> =
  mongoose.models.Permission ||
  mongoose.model<IPermission>('Permission', PermissionSchema);

export default Permission;
