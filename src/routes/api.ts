import express, { Router } from 'express';
import {
	authController,
	userController,
	postController,
	commentController,
	likeController
} from '../controllers/controllers';

const router: Router = express.Router();

// AUTH ROUTES
router.post('/login', authController.login);
router.delete('/logout', authController.logout);

// USER ROUTES
router.get('/:username', userController.getUser);
router.post('/signup', userController.createUser);
router.put('/:username/:update', userController.updateUser);

// POST ROUTES
router.get('/home', postController.home);
router.get('/:username/posts', postController.getUserPosts);
router.get('/:username/:postId', postController.getPost);
router.post('/:username/:postId', postController.createPost);
router.put('/:username/:postId', postController.updatePost);
router.delete('/:username/:postId', postController.deletePost);

// COMMENT ROUTES
router.get('/:username/comments', commentController.getUserComments);
router.get('/:username/:commentId', commentController.getComment);
router.post('/:username/:commentId', commentController.createComment);
router.put('/:username/:commentId', commentController.updateComment);
router.delete('/:username/:commentId', commentController.deleteComment);

// LIKE ROUTES
router.get('/:username/likes', likeController.getUserLikes);
router.post('/:username/:likeId', likeController.createLike);
router.delete('/:username/:likeId', likeController.deleteLike);

export default router;
