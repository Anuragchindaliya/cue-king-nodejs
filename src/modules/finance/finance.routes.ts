import { Router } from 'express';
import { logExpense, getExpenses, deleteExpense, getFinancialAnalytics } from './finance.controller';
import { protect } from '../../middlewares/auth.middleware';

const router = Router();

router.use(protect);

router.post('/expense', logExpense);
router.get('/expense', getExpenses);
router.delete('/expense/:id', deleteExpense);
router.get('/analytics', getFinancialAnalytics);

export default router;
