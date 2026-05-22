import { Router } from 'express';
import { createTable, getClubTables, updateTable, deleteTable } from './table.controller';
import { protect } from '../../middlewares/auth.middleware';

const router = Router();

router.post('/', protect, createTable);
router.get('/club/:clubId', getClubTables);
router.put('/:id', protect, updateTable);
router.delete('/:id', protect, deleteTable);

export default router;
