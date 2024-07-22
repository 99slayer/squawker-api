import express from 'express';
import { authController } from '../controllers/controllers';

const router = express.Router();

// AUTH
router.post('/login', authController.login);
router.delete('/logout', authController.logout);

module.exports = router;
