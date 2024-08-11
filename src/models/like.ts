import mongoose from 'mongoose';
import { LikeInterface } from '../types';
const Schema = mongoose.Schema;

const LikeSchema = new Schema<LikeInterface>(
	{
		user: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true
		},
		post: {
			type: Schema.Types.ObjectId,
			refPath: 'doc_model',
			required: true
		},
		doc_model: {
			type: String,
			enum: ['Post', 'Comment'],
			required: true
		}
	},
	{
		id: false
	}
);

export default mongoose.model<LikeInterface>('Like', LikeSchema);
