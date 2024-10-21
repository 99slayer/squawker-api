import { Request, Response, NextFunction } from 'express';
import { Document, Types } from 'mongoose';

export type req = Request;
export type res = Response;
export type next = NextFunction;

export type doc<I> = (Document<unknown, object, I> & I & { _id: Types.ObjectId }) | null;

declare module 'express-serve-static-core' {
	interface Request {
		user: {
			_id: string;
			username: string;
			nickname: string;
			email: string;
			password: string;
			pfp: string;
			user_type?: string;
		}
	}
}

export interface LocalUser {
	_id: string;
	username: string;
	nickname: string;
	email: string;
	password: string;
	pfp: string;
}

export interface followData {
	username: string;
	nickname: string;
	pfp?: string;
	profileText?: string;
	isFollowing: boolean;
}

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
	following: Types.ObjectId[];
	followers: Types.ObjectId[];
	isFollowing?: boolean;
	posts?: PostInterface[];
	comments?: CommentInterface[];
	likes?: LikeInterface[];
	post_count?: number;
	comment_count?: number;
	like_count?: number;
	user_type?: string;
}

export interface GuestInterface extends UserInterface {
	expireAt: Date;
}

type BaseData = {
	post_id: Types.ObjectId;
	timestamp: Date;
	repost?: boolean;
	user: {
		id: Types.ObjectId;
		username: string;
		nickname: string;
		pfp: string;
	}
}

type BasePost = {
	timestamp: string;
	text?: string;
	post_image?: string;
	user: {
		id: Types.ObjectId;
		username: string;
		nickname: string;
		pfp?: string;
	}
}

export interface BaseInterface {
	liked: boolean;
	_id: Types.ObjectId;
	post_type: 'Post' | 'Comment';
	post_data: BaseData;
	post: BasePost;
	quoted_post?: BaseInterface;
	parent_post?: PostInterface | CommentInterface;
	root_post?: PostInterface | null;
	comments?: CommentInterface[];
	direct_comments?: CommentInterface[];
	reposts?: PostInterface[];
	likes?: LikeInterface[];
	comment_count: number;
	direct_comment_count: number;
	repost_count: number;
	like_count: number;
}

export interface PostInterface extends BaseInterface {
	post_type: 'Post';
	quoted_post?: BaseInterface;
}

export interface CommentInterface extends BaseInterface {
	post_type: 'Comment';
	root_post?: PostInterface | null;
	parent_post: PostInterface | CommentInterface;
}

export interface LikeInterface {
	timestamp: Date;
	user: Types.ObjectId;
	post: Types.ObjectId;
}
