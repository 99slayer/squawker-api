import mongoose, { AnyObject, FilterQuery, UpdateQuery, Types } from 'mongoose';
import { PostInterface } from '../types';
import { CommentSchema } from './comment';
const Schema = mongoose.Schema;

const PostSchema = new Schema<PostInterface>(
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
			pfp: { type: String }
		},
		quoted_post: { type: this || CommentSchema },
		post_image: { type: String },
		comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
		comment_slice: [{ type: CommentSchema }],
		likes: [{ type: Schema.Types.ObjectId, ref: 'Like' }],
		reposts: [{ type: Schema.Types.ObjectId, ref: 'Post' }]
	},
	{
		toJSON: { virtuals: true }
	}
);

// HOOKS
PostSchema.post('updateOne', async function () {
	const update: UpdateQuery<AnyObject> | null = this.getUpdate();

	if (!update || !update['$push']?.comments) return;

	const query: FilterQuery<AnyObject> = this.getQuery();
	const post = await this.model.findOne(query).populate('comments');

	if (!post || post.comments.length === 0) return;

	const commentData = [...post.comments.slice(0, 10)];
	post.comment_slice = commentData;
	await post.save();
});

// VIRTUALS
PostSchema.virtual('comment_count').get(function () {
	const count: number = this.comments.length;
	return count;
});

PostSchema.virtual('repost_count').get(function () {
	const count: number = this.reposts.length;
	return count;
});

PostSchema.virtual('like_count').get(function () {
	const count: number = this.likes.length;
	return count;
});

export default mongoose.model<PostInterface>('Post', PostSchema);
