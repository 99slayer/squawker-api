import mongoose from 'mongoose';
import { LikeInterface } from '../types';
const Schema = mongoose.Schema;

const LikeSchema = new Schema<LikeInterface>(
	{
		timestamp: { type: Date, required: true },
		user: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true
		},
		post: {
			type: Schema.Types.ObjectId,
			ref: 'Base',
			required: true
		}
	}
);

export default mongoose.model<LikeInterface>('Like', LikeSchema);
