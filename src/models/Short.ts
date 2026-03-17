import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IShort extends Document {
  title: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ShortSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    youtubeUrl: {
      type: String,
      required: true,
      trim: true,
    },
    thumbnailUrl: {
      type: String,
      required: false,
      default: '',
      trim: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

ShortSchema.index({ isActive: 1, sortOrder: 1 });

const Short: Model<IShort> = mongoose.models.Short || mongoose.model<IShort>('Short', ShortSchema);

export default Short;
