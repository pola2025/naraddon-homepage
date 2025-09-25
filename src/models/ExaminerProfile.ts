import mongoose from 'mongoose';

const ExaminerProfileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  organization: {
    type: String,
    required: true
  },
  profileImage: {
    type: String,
    required: true
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

ExaminerProfileSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const ExaminerProfile = mongoose.models.ExaminerProfile || mongoose.model('ExaminerProfile', ExaminerProfileSchema);

export default ExaminerProfile;