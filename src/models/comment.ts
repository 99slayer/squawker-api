import mongoose from 'mongoose';
import { CommentInterface } from '../types';
const Schema = mongoose.Schema;

export const CommentSchema = new Schema<CommentInterface>(
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
			pfp: { type: String },
		},
		parent_post: {
			_id: false,
			type: {
				post_id: {
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
			required: true
		},
		post_image: { type: String },
		comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
		likes: [{ type: Schema.Types.ObjectId, ref: 'Like' }],
		reposts: [{ type: Schema.Types.ObjectId, ref: 'Post' }]
	},
	{
		toJSON: { virtuals: true }
	}
);

// VIRTUALS
CommentSchema.virtual('comment_count').get(function () {
	const count: number = this.comments.length;
	return count;
});

CommentSchema.virtual('repost_count').get(function () {
	const count: number = this.reposts.length;
	return count;
});

CommentSchema.virtual('like_count').get(function () {
	const count: number = this.likes.length;
	return count;
});

export default mongoose.model<CommentInterface>('Comment', CommentSchema);
