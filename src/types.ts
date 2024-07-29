import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';

export type req = Request;
export type res = Response;
export type next = NextFunction;

export interface UserInterface {
	username: string;
	password: string;
	email: string;
	nickname: string;
	join_date: Date;
	pfp?: string;
	profile: {
		header_image?: string;
		text?: string;
	};
	following: Types.ObjectId[];
	followers: Types.ObjectId[];
	posts: Types.ObjectId[];
	comments: Types.ObjectId[];
	likes: Types.ObjectId[];
}

export interface PostInterface {
	text: string;
	timestamp: Date;
	user: {
		id: Types.ObjectId;
		username: string;
		nickname: string;
		pfp?: string;
	};
	quoted_post?: CommentInterface | PostInterface,
	post_image?: string;
	comments: Types.ObjectId[];
	comment_slice: CommentInterface[];
	likes: Types.ObjectId[];
	reposts: Types.ObjectId[];
}

export interface CommentInterface {
	text: string;
	timestamp: Date;
	user: {
		id: Types.ObjectId;
		username: string;
		nickname: string;
		pfp: string;
	};
	parent_post: {
		post_id: Types.ObjectId;
		doc_model: string;
	};
	post_image?: string;
	comments: Types.ObjectId[];
	likes: Types.ObjectId[];
	reposts: Types.ObjectId[];
}

export interface LikeInterface {
	user: Types.ObjectId;
	post: Types.ObjectId;
	doc_model: string;
}
