import mongoose, { Document, Model, Schema } from 'mongoose';

export interface INaraddonTubeVideo extends Document {
  title: string;
  youtubeId: string;
  url: string;
  customThumbnail?: string;
  isPublished: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const naraddonTubeVideoSchema = new Schema<INaraddonTubeVideo>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    youtubeId: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    customThumbnail: {
      type: String,
      trim: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

naraddonTubeVideoSchema.index({ sortOrder: 1, createdAt: -1 });
naraddonTubeVideoSchema.index({ isPublished: 1 });

const NaraddonTubeVideo: Model<INaraddonTubeVideo> =
  mongoose.models.NaraddonTubeVideo ||
  mongoose.model<INaraddonTubeVideo>('NaraddonTubeVideo', naraddonTubeVideoSchema);

export default NaraddonTubeVideo;
