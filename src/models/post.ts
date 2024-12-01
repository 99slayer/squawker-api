import mongoose from 'mongoose';
import { PostInterface } from '../types';
import Base, { BaseSchema } from './base';
import { CommentSchema } from './comment';
const Schema = mongoose.Schema;

const PostSchema = new Schema<PostInterface>({
	quoted_post: {
		type: this || CommentSchema,
		required: false
	}
});

export default Base.discriminator<PostInterface>('Post', PostSchema);
