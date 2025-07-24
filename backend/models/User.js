// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// 기본 사용자 스키마
const userSchema = new mongoose.Schema({
  // 공통 필드
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  profileImage: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['admin', 'examiner', 'company'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // 기업심사관 전용 필드
  examinerInfo: {
    activeRegions: [{
      type: String
    }], // 주요 활동 지역
    specialties: [{
      type: String
    }], // 전문분야
    website: {
      type: String,
      default: null
    }
  },
  
  // 기업회원 전용 필드
  companyInfo: {
    businessNumber: {
      type: String,
      sparse: true // 기업회원만 필수
    },
    companyName: {
      type: String
    },
    region: {
      type: String
    }
  },
  
  // 권한 관리
  permissions: {
    canAccessDashboard: {
      type: Boolean,
      default: false
    },
    canWritePosts: {
      type: Boolean,
      default: false
    },
    canViewBlacklist: {
      type: Boolean,
      default: false
    },
    canWriteComments: {
      type: Boolean,
      default: false
    },
    canWriteInquiries: {
      type: Boolean,
      default: false
    }
  },
  
  lastLogin: {
    type: Date,
    default: null
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 비밀번호 해싱 미들웨어
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 권한 자동 설정 미들웨어
userSchema.pre('save', function(next) {
  // 역할에 따른 기본 권한 설정
  switch(this.role) {
    case 'admin':
      this.permissions = {
        canAccessDashboard: true,
        canWritePosts: true,
        canViewBlacklist: true,
        canWriteComments: true,
        canWriteInquiries: true
      };
      break;
    case 'examiner':
      this.permissions = {
        canAccessDashboard: false,
        canWritePosts: true,
        canViewBlacklist: true,
        canWriteComments: true,
        canWriteInquiries: true
      };
      break;
    case 'company':
      this.permissions = {
        canAccessDashboard: false,
        canWritePosts: false,
        canViewBlacklist: false,
        canWriteComments: true,
        canWriteInquiries: true
      };
      break;
  }
  next();
});

// 업데이트 시간 자동 갱신
userSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// 비밀번호 검증 메서드
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 공개 정보만 반환하는 메서드
userSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  
  // role에 따라 불필요한 정보 제거
  if (this.role !== 'examiner') {
    delete obj.examinerInfo;
  }
  if (this.role !== 'company') {
    delete obj.companyInfo;
  }
  
  return obj;
};

// 가상 필드: 사용자 타입에 따른 표시 이름
userSchema.virtual('displayName').get(function() {
  if (this.role === 'company' && this.companyInfo.companyName) {
    return `${this.companyInfo.companyName} (${this.name})`;
  }
  return this.name;
});

// 인덱스 설정
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'companyInfo.businessNumber': 1 });

module.exports = mongoose.model('User', userSchema);