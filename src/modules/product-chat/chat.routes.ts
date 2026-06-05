import { Router } from 'express';
import {
  startChat,
  getRooms,
  getRoomDetails,
  sendMessage,
} from './chat.controller';
import { protect } from '../../middlewares/auth.middleware';

const router = Router();

// All chat routes are protected
router.use(protect);

router.post('/', startChat);
router.get('/', getRooms);
router.get('/:roomId', getRoomDetails);
router.post('/:roomId/messages', sendMessage);

export default router;
