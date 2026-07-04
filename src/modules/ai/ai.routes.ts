import { Router } from 'express';
import { playAiPlayground } from './ai.controller';

const router = Router();

// Route: POST /api/ai/playground
router.post('/playground', playAiPlayground);

export default router;
