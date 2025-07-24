// backend/models/userValidation.js
const Joi = require('joi');

// 회원가입 검증 스키마
const registerSchema = {
  admin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    name: Joi.string().min(2).max(50).required(),
    phone: Joi.string().pattern(/^[0-9-]+$/).required(),
    profileImage: Joi.string().uri().optional()
  }),
  
  examiner: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    name: Joi.string().min(2).max(50).required(),
    phone: Joi.string().pattern(/^[0-9-]+$/).required(),
    profileImage: Joi.string().uri().optional(),
    activeRegions: Joi.array().items(Joi.string()).min(1).required(),
    specialties: Joi.array().items(Joi.string()).min(1).required(),
    website: Joi.string().uri().optional()
  }),
  
  company: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    name: Joi.string().min(2).max(50).required(),
    phone: Joi.string().pattern(/^[0-9-]+$/).required(),
    profileImage: Joi.string().uri().optional(),
    businessNumber: Joi.string().pattern(/^[0-9-]+$/).required(),
    companyName: Joi.string().min(2).max(100).required(),
    region: Joi.string().required()
  })
};

// 로그인 검증 스키마
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// 프로필 업데이트 검증 스키마
const updateProfileSchema = {
  admin: Joi.object({
    name: Joi.string().min(2).max(50).optional(),
    phone: Joi.string().pattern(/^[0-9-]+$/).optional(),
    profileImage: Joi.string().uri().optional()
  }),
  
  examiner: Joi.object({
    name: Joi.string().min(2).max(50).optional(),
    phone: Joi.string().pattern(/^[0-9-]+$/).optional(),
    profileImage: Joi.string().uri().optional(),
    activeRegions: Joi.array().items(Joi.string()).optional(),
    specialties: Joi.array().items(Joi.string()).optional(),
    website: Joi.string().uri().allow('').optional()
  }),
  
  company: Joi.object({
    name: Joi.string().min(2).max(50).optional(),
    phone: Joi.string().pattern(/^[0-9-]+$/).optional(),
    profileImage: Joi.string().uri().optional(),
    companyName: Joi.string().min(2).max(100).optional(),
    region: Joi.string().optional()
  })
};

// 비밀번호 변경 검증 스키마
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema
};