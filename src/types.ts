import { Request, Response, NextFunction } from 'express';
import { Document, PopulatedDoc, Types } from 'mongoose';

export type req = Request;
export type res = Response;
export type next = NextFunction;

export type doc<I> = (Document<unknown, object, I> & I & { _id: Types.ObjectId }) | null;

export interface UserInterface {
	_id: Types.ObjectId;
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
	post_count?: number;
	comment_count?: number;
	like_count?: number;
}

type BasePost = {
	timestamp: string;
	text: string;
	post_image?: string;
	user: {
		id: Types.ObjectId;
		username: string;
		nickname: string;
		pfp?: string;
	}
}

type BaseData = {
	timestamp: Date;
	user: {
		id: Types.ObjectId;
		username: string;
		nickname: string;
		pfp: string;
	}
}

type Repost = {
	repost: Types.ObjectId;
}

type PostData = BaseData & Repost;

export interface BaseInterface {
	_id: Types.ObjectId;
	post_type: 'Post' | 'Comment';
	post_data: BaseData;
	post: BasePost;
	quoted_post?: BaseInterface;
	comments?: PopulatedDoc<CommentInterface>[];
	reposts?: PopulatedDoc<PostInterface>[];
	likes?: PopulatedDoc<LikeInterface>[];
	direct_replies?: CommentInterface[];
	quoted?: PostInterface[];
}

export interface PostInterface extends BaseInterface {
	post_type: 'Post';
	post_data: PostData;
	quoted_post?: BaseInterface;
	direct_replies?: CommentInterface[];
	quoted?: PostInterface[];
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
