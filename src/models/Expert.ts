import mongoose, { Model } from 'mongoose';

export interface IExpert {
  _id?: string;
  name: string;
  position: string;
  companyName: string;
  specialties: string[];
  imageKey: string;
  imageUrl?: string;
  cardImageUrl?: string;
  order: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const ExpertSchema = new mongoose.Schema<IExpert>(
  {
    name: {
      type: String,
      required: true,
    },
    position: {
      type: String,
      required: true,
    },
    companyName: {
      type: String,
      required: true,
    },
    specialties: {
      type: [String],
      required: true,
    },
    imageKey: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: false,
    },
    cardImageUrl: {
      type: String,
      required: false,
    },
    order: {
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

ExpertSchema.index({ name: 1, _id: 1 });
ExpertSchema.index({ isActive: 1, order: 1, _id: 1 });

const Expert: Model<IExpert> =
  mongoose.models.Expert || mongoose.model<IExpert>('Expert', ExpertSchema);

export default Expert;
