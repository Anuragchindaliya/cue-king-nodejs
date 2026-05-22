import { Router } from 'express';
import { createReview, getClubReviews, deleteReview } from './reviews.controller';
import { protect } from '../../middlewares/auth.middleware';

const router = Router();

router.post('/', protect, createReview);
router.get('/club/:clubId', getClubReviews);
router.delete('/:id', protect, deleteReview);

export default router;
