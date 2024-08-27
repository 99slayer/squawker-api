import mongoose, { AnyObject, FilterQuery } from 'mongoose';
import Debug from 'debug';
const debug = Debug('model:comment');
import { doc, CommentInterface } from '../types';
import Base from './base';
import Like from './like';
const Schema = mongoose.Schema;

const CommentSchema = new Schema<CommentInterface>(
	{
		root_post: {
			type: Schema.Types.ObjectId,
			ref: 'Post',
			required: true
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
	}
);

// HOOKS
CommentSchema.pre('findOneAndDelete', async function (next) {
	const query: FilterQuery<AnyObject> = this.getQuery();
	const comment: doc<CommentInterface> = await this.model
		.findOne(query)
		.orFail(new Error('404'));

	const likesDeleted: mongoose.mongo.DeleteResult = await Like
		.deleteMany({ post: comment?._id });

	debug(likesDeleted);
	next();
});

CommentSchema.pre('deleteMany', async function (next) {
	const query: FilterQuery<AnyObject> = this.getQuery();
	const comment: doc<CommentInterface> = await this.model
		.findOne(query)
		.orFail(new Error('404'));

	const commentsDeleted: mongoose.mongo.DeleteResult =
		await mongoose.model<CommentInterface>('Comment', CommentSchema)
			.deleteMany({ parent_post: comment?._id });
	const likesDeleted: mongoose.mongo.DeleteResult = await Like
		.deleteMany({ post: comment?._id });

	debug(commentsDeleted);
	debug(likesDeleted);
	next();
});

export default Base.discriminator<CommentInterface>('Comment', CommentSchema);
