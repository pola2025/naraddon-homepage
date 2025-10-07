import mongoose, { Document, Model, Schema } from 'mongoose';

export interface INaraddonTubeVideo {
  title: string;
  description?: string;
  youtubeId: string;
  url: string;
  customThumbnail?: string;
}

export interface INaraddonTubeEntry extends Document {
  videos: INaraddonTubeVideo[]; // 1개만 저장
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
    description: {
      type: String,
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
  },
  { _id: false }
);

const naraddonTubeEntrySchema = new Schema<INaraddonTubeEntry>(
  {
    videos: {
      type: [naraddonTubeVideoSchema],
      required: true,
      validate: {
        validator: function(v: INaraddonTubeVideo[]) {
          return v && v.length === 1; // 정확히 1개만 허용
        },
        message: 'videos 배열은 정확히 1개의 영상만 포함해야 합니다.'
      }
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

naraddonTubeEntrySchema.index({ sortOrder: 1, createdAt: -1 });
naraddonTubeEntrySchema.index({ isPublished: 1 });

const NaraddonTubeEntry: Model<INaraddonTubeEntry> =
  mongoose.models.NaraddonTubeEntry ||
  mongoose.model<INaraddonTubeEntry>('NaraddonTubeEntry', naraddonTubeEntrySchema);

export default NaraddonTubeEntry;
