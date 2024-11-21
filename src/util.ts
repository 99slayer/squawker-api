import { Result, ValidationError } from 'express-validator';
import Like from './models/like';
import { BaseInterface, CommentInterface, LikeInterface, PostInterface } from './types';

export async function checkPostLikes(
	doc:
		PostInterface |
		BaseInterface |
		PostInterface[] |
		BaseInterface[],
	id: string
) {
	if (Array.isArray(doc)) {
		for (let i = 0; i < doc.length; i++) {
			await addPostLikes(doc[i], id);
		}
	} else {
		await addPostLikes(doc, id);
	}
}

export async function checkCommentLikes(
	doc: CommentInterface | CommentInterface[],
	id: string
) {
	if (Array.isArray(doc)) {
		for (let i = 0; i < doc.length; i++) {
			await addCommentLikes(doc[i], id);
		}
	} else {
		await addCommentLikes(doc, id);
	}
}

async function addPostLikes(
	post: PostInterface | BaseInterface,
	id: string
) {
	const liked: LikeInterface | null = await Like
		.findOne({
			user: id,
			post: post.post_data.post_id
		});

	if (liked) {
		post.liked = true;
	} else post.liked = false;
}

async function addCommentLikes(
	comment: CommentInterface,
	id: string
) {
	const commentId: string = comment.post_data.post_id.toString();
	const parentId: string = comment.parent_post?.post_data?.post_id.toString();
	const rootId: string = comment.root_post?.post_data?.post_id.toString() as string;
	const ids: string[] = [commentId, parentId, rootId];

	const likes: string[] = await Like
		.find({
			post: { $in: ids },
			user: id
		})
		.transform(doc => {
			const ids = [];
			for (let i = 0; i < doc.length; i++) {
				ids.push(doc[i].post.toString());
			}

			return ids;
		});

	if (likes.includes(commentId)) {
		comment.liked = true;
	} else comment.liked = false;
	if (ids[1] && likes.includes(parentId)) {
		comment.parent_post.liked = true;
	} else comment.parent_post.liked = false;
	if (ids[2]) {
		if (likes.includes(rootId)) {
			comment.root_post!.liked = true;
		} else comment.root_post!.liked = false;
	}
}

export function getValidationErrors(arr: Result<ValidationError>): Record<string, string[]> {
	const errors: Record<string, string[]> = {};
	arr.array().map((err) => {
		if (err.type === 'field') {
			errors[`${err.path}Errors`] =
				errors[`${err.path}Errors`] ?
					[...errors[`${err.path}Errors`], err.msg] :
					[err.msg];
		}
	});

	return errors;
}
