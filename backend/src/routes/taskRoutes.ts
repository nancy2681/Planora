import { Router } from 'express';
import {
  createTask,
  getProjectTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getDashboardStats,
  uploadAttachment,
  generateAITask,
} from '../controllers/taskController';
import { protect } from '../middleware/authMiddleware';
import { upload } from '../config/multer';

const router = Router();

router.use(protect); // Secure all task routes

router.route('/')
  .post(createTask);

router.post('/ai-generate', generateAITask);
router.get('/dashboard/stats', getDashboardStats);
router.get('/project/:projectId', getProjectTasks);

router.post('/:id/attachments', upload.single('file'), uploadAttachment);

router.route('/:id')
  .get(getTaskById)
  .put(updateTask)
  .delete(deleteTask);

export default router;
