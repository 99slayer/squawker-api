import mongoose from 'mongoose';
import { BaseInterface } from '../types';
const Schema = mongoose.Schema;

const BaseSchema = new Schema<BaseInterface>(
	{
		text: { type: String, required: true },
		timestamp: { type: Date, required: true },
		user: {
			id: {
				type: Schema.Types.ObjectId,
				ref: 'User',
				required: true
			},
			username: { type: String, required: true },
			nickname: { type: String, required: true },
			pfp: { type: String, required: false }
		},
		post_image: { type: String, required: false }
	},
	{
		discriminatorKey: 'post_type',
		collection: 'posts',
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
		id: false
	}
);

// VIRTUALS
BaseSchema.virtual('comments', {
	ref: 'Comment',
	localField: '_id',
	foreignField: 'root_post'
});

BaseSchema.virtual('reposts', {
	ref: 'Post',
	localField: '_id',
	foreignField: 'quoted_post.post_id'
});

BaseSchema.virtual('likes', {
	ref: 'Like',
	localField: '_id',
	foreignField: 'post'
});

BaseSchema.virtual('comment_count', {
	ref: 'Comment',
	localField: '_id',
	foreignField: 'root_post',
	count: true
});

BaseSchema.virtual('repost_count', {
	ref: 'Post',
	localField: '_id',
	foreignField: 'quoted_post.post_id',
	count: true
});

BaseSchema.virtual('like_count', {
	ref: 'Like',
	localField: '_id',
	foreignField: 'post',
	count: true
});

export default mongoose.model<BaseInterface>('Base', BaseSchema);
