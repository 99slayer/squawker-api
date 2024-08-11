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
router.get('/user/:username', userController.getUser);
router.post('/signup', userController.createUser);
router.put('/:username/update-:update', userController.updateUser);

// POST ROUTES
router.get('/home', postController.home);
router.get('/:username/posts', postController.getUserPosts);
router.get('/:username/status/:postId', postController.getPost);
router.post('/publish-post', postController.createPost);
router.put('/edit-post/:postId', postController.updatePost);
router.delete('/delete-post/:postId', postController.deletePost);

// COMMENT ROUTES
router.get('/:username/comments', commentController.getUserComments);
router.get('/:username/status/:commentId', commentController.getComment);
router.post('/:username/publish-comment', commentController.createComment);
router.put('/:username/edit-:commentId', commentController.updateComment);
router.delete('/:username/delete-:commentId', commentController.deleteComment);

// LIKE ROUTES
router.get('/:username/likes', likeController.getUserLikes);
router.post('/:username/like', likeController.createLike);
router.delete('/:username/delete-:likeId', likeController.deleteLike);

export default router;
