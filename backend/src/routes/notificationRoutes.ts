import { Router } from 'express';
import { getNotifications, markNotificationsRead } from '../controllers/notificationController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect); // Secure notification routes

router.route('/')
  .get(getNotifications);

router.put('/mark-read', markNotificationsRead);

export default router;
