import { Router } from 'express';
import { AuthController } from './auth.controller';
import { protect } from '../../middlewares/auth.middleware';
import { loginRateLimiter } from '../../middlewares/security.middleware';

const router = Router();

router.post('/register-super-admin', AuthController.registerSuperAdmin);
router.post('/login', loginRateLimiter, AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.get('/me', protect, AuthController.getMe);

export default router;
