import express, { Router } from 'express';
import {
	auth,
	user,
	post,
	comment,
	like
} from '../controllers/controllers';
import err from '../handleError';

const router: Router = express.Router();

// AUTH ROUTES
router.post(
	'/login',
	auth.login,
	err
);
router.delete(
	'/logout',
	auth.logout,
	err
);

// USER ROUTES
router.get(
	'/user/:username',
	user.getUser,
	err
);
router.post(
	'/signup',
	user.createUser,
	err
);
router.put(
	'/:username/update-:update',
	user.updateUser,
	err
);

// POST ROUTES
router.get(
	'/home',
	post.home,
	err
);
router.get(
	'/:username/posts',
	post.getUserPosts,
	err
);
router.get(
	'/:username/post/:postId',
	post.getPost,
	err
);
router.post(
	'/publish-post/:quotedPostId?',
	post.createPost,
	err
);
router.put(
	'/edit-post/:postId',
	post.updatePost,
	err
);
router.delete(
	'/delete-post/:postId',
	post.deletePost,
	err
);

// COMMENT ROUTES
router.get(
	'/:username/comments',
	comment.getUserComments,
	err
);
router.get(
	'/:username/comment/:commentId',
	comment.getComment,
	err
);
router.post(
	'/publish-comment/:parentType-:parentId',
	comment.createComment,
	err
);
router.put('/edit-comment/:commentId',
	comment.updateComment,
	err
);
router.delete(
	'/delete-comment/:commentId',
	comment.deleteComment,
	err
);

// LIKE ROUTES
router.get(
	'/:username/likes',
	like.getUserLikes,
	err
);
router.post(
	'/publish-like/:postId',
	like.createLike,
	err
);
router.delete(
	'/delete-like/:likeId',
	like.deleteLike,
	err
);

export default router;
