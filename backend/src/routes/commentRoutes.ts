import { Router } from 'express';
import { createComment, getTaskComments } from '../controllers/commentController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect); // Secure comments routes

router.route('/')
  .post(createComment);

router.get('/task/:taskId', getTaskComments);

export default router;
