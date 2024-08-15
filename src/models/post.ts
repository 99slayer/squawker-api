import mongoose, { AnyObject, FilterQuery } from 'mongoose';
import Debug from 'debug';
const debug = Debug('model:post');
import { doc, PostInterface } from '../types';
import Base from './base';
import Comment from './comment';
import Like from './like';
const Schema = mongoose.Schema;

const PostSchema = new Schema<PostInterface>(
	{
		quoted_post: {
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
			required: false
		},
	}
);

// HOOKS
PostSchema.pre('findOneAndDelete', async function (next) {
	const query: FilterQuery<AnyObject> = this.getQuery();
	const post: doc<PostInterface> = await this.model.findOne(query);

	const likesDeleted: mongoose.mongo.DeleteResult = await Like
		.deleteMany({ post: post?._id });

	debug(likesDeleted);
	next();
});

PostSchema.pre('deleteMany', async function (next) {
	const query: FilterQuery<AnyObject> = this.getQuery();
	const post: doc<PostInterface> = await this.model.findOne(query);

	const commentsDeleted: mongoose.mongo.DeleteResult = await Comment
		.deleteMany({ root_post: post?._id });
	const likesDeleted: mongoose.mongo.DeleteResult = await Like
		.deleteMany({ post: post?._id });

	debug(commentsDeleted);
	debug(likesDeleted);
	next();
});

// VIRTUALS
PostSchema.virtual('direct_replies', {
	ref: 'Comment',
	localField: '_id',
	foreignField: 'parent_post.post_id'
});

export default Base.discriminator<PostInterface>('Post', PostSchema);
