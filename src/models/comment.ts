import mongoose from 'mongoose';
import { CommentInterface } from '../types';
import Base, { BaseSchema } from './base';
const Schema = mongoose.Schema;

export const CommentSchema = new Schema<CommentInterface>({
	root_post: { type: BaseSchema, default: null },
	parent_post: { type: BaseSchema || this, required: true }
});

export default Base.discriminator<CommentInterface>('Comment', CommentSchema);
