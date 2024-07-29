import express from 'express';
import {
	authController,
	userController,
	postController,
	commentController,
	likeController
} from '../controllers/controllers';

const router = express.Router();

// AUTH ROUTES
router.post('/login', authController.login);
router.delete('/logout', authController.logout);

// USER ROUTES
router.get('/:username',);
router.post('/:username',);
router.put('/:username',);

// POST ROUTES
router.get('/home',);
router.get('/:username/posts');
router.get('/:username/:postId',);
router.post('/:username/:postId',);
router.put('/:username/:postId',);
router.delete('/:username/:postId',);

// COMMENT ROUTES
router.get('/:username/comments');
router.get('/:username/:commentId',);
router.post('/:username/:commentId',);
router.put('/:username/:commentId',);
router.delete('/:username/:commentId',);

// LIKE ROUTES
router.get('/:username/likes');
router.post('/:username/:likeId',);
router.delete('/:username/:likeId',);

module.exports = router;
