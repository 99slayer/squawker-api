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
router.get(
	'/users',
	user.getUsers,
	err
);
router.get(
	'/user/:username/followers',
	user.getFollowers,
	err
);
router.get(
	'/user/:username/following',
	user.getFollowing,
	err
);
router.put(
	'/user/follow/:username',
	user.follow,
	err
);
router.put(
	'/user/unfollow/:username',
	user.unfollow,
	err
);
router.post(
	'/signup',
	user.createUser,
	err
);
router.put(
	'/:username/account-update',
	user.updateUserAccount,
	err
);
router.put(
	'/:username/security-update',
	user.updateUserSecurity,
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
	'/post/:postId',
	post.getPost,
	err
);
router.post(
	'/publish-post/:quotedPostId?',
	post.createPost,
	err
);
router.post(
	'/publish-post-repost/:postId',
	post.createRepost,
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
	'/:postId/post-replies',
	comment.getPostReplies,
	err
);
router.get(
	'/:postId/comment-replies',
	comment.getCommentReplies,
	err
);
router.get(
	'/comment-group/:commentId',
	comment.getCommentGroup,
	err
);
router.post(
	'/publish-comment/:parentId',
	comment.createComment,
	err
);
router.post(
	'/publish-comment-repost/:commentId',
	comment.createRepost,
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
router.post(
	'/publish-like/:postId',
	like.createLike,
	err
);
router.delete(
	'/delete-like/:postId',
	like.deleteLike,
	err
);

export default router;
