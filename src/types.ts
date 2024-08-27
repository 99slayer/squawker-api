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
	post_type: 'Post' | 'Comment';
	post?: {
		text: string;
		timestamp: Date;
		user: {
			id: Types.ObjectId;
			username: string;
			nickname: string;
			pfp?: string;
		};
		post_image?: string;
	}
	comments?: PopulatedDoc<CommentInterface>[];
	reposts?: PopulatedDoc<PostInterface>[];
	likes?: PopulatedDoc<LikeInterface>[];
}

export interface PostInterface extends BaseInterface {
	post_type: 'Post';
	repost: boolean;
	quoted_post?: {
		post_id: PopulatedDoc<BaseInterface>,
		post: {
			text: string;
			timestamp: Date;
			user: {
				id: Types.ObjectId;
				username: string;
				nickname: string;
				pfp?: string;
			};
			post_image?: string;
		}
	}
}

export interface CommentInterface extends BaseInterface {
	post_type: 'Comment';
	root_post: PopulatedDoc<PostInterface>;
	parent_post: {
		post_id: PopulatedDoc<BaseInterface>;
		doc_model: 'Post' | 'Comment';
	};
}

export interface LikeInterface {
	timestamp: Date;
	user: PopulatedDoc<UserInterface>;
	post: PopulatedDoc<PostInterface>;
	doc_model: 'Post' | 'Comment';
}
