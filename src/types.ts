import { Request, Response, NextFunction } from 'express';
import { Document, PopulatedDoc, Types } from 'mongoose';

export type req = Request;
export type res = Response;
export type next = NextFunction;

export type doc<I> = (Document<unknown, object, I> & I & { _id: Types.ObjectId }) | null;

export interface UserInterface {
	username: string;
	password: string;
	email: string;
	nickname: string;
	join_date: Date;
	pfp?: string;
	profile_header?: string;
	profile_text?: string;
	following: PopulatedDoc<UserInterface>[];
	followers: PopulatedDoc<UserInterface>[];
	posts?: PopulatedDoc<PostInterface>[];
	comments?: PopulatedDoc<CommentInterface>[];
	likes?: PopulatedDoc<LikeInterface>[];
}

export interface BaseInterface {
	text: string;
	timestamp: Date;
	user: {
		id: Types.ObjectId;
		username: string;
		nickname: string;
		pfp?: string;
	};
	post_image?: string;
	comments?: PopulatedDoc<CommentInterface>[];
	reposts?: PopulatedDoc<PostInterface>[];
	likes?: PopulatedDoc<LikeInterface>[];
}

export interface PostInterface extends BaseInterface {
	post_type: 'Post';
	quoted_post?: {
		post_id: Types.ObjectId;
		doc_model: 'Post' | 'Comment';
	}
}

export interface CommentInterface extends BaseInterface {
	post_type: 'Comment';
	root_post: Types.ObjectId;
	parent_post: {
		post_id: Types.ObjectId;
		doc_model: 'Post' | 'Comment';
	};
}

export interface LikeInterface {
	timestamp: Date,
	user: Types.ObjectId;
	post: Types.ObjectId;
	doc_model: 'Post' | 'Comment';
}
