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

export interface PostInterface {
	text: string;
	timestamp: Date;
	user: {
		id: Types.ObjectId;
		username: string;
		nickname: string;
		pfp?: string;
	};
	quoted_post?: {
		post_id: Types.ObjectId;
		doc_model: string
	}
	post_image?: string;
	comments?: PopulatedDoc<CommentInterface>[];
	reposts?: PopulatedDoc<PostInterface>[];
	likes?: PopulatedDoc<LikeInterface>[];
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
	root_post: Types.ObjectId;
	parent_post: {
		post_id: Types.ObjectId;
		doc_model: string;
	};
	post_image?: string;
	comments?: PopulatedDoc<CommentInterface>[];
	reposts?: PopulatedDoc<PostInterface>[];
	likes?: PopulatedDoc<LikeInterface>[];
}

export interface LikeInterface {
	user: Types.ObjectId;
	post: Types.ObjectId;
	doc_model: string;
}
