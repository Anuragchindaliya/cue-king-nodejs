import { Router } from 'express';
import { createClub, getClubs, getClubById, addTableCategory, getMyClubs, updateClub, getSuggestions } from './club.controller';
import { protect } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';

const router = Router();

router.get('/my-clubs', protect, authorize('CLUB_OWNER', 'ADMIN'), getMyClubs);

/**
 * @swagger
 * /api/clubs/suggestions:
 *   get:
 *     summary: Get club name suggestions
 */
router.get('/suggestions', getSuggestions);

/**
 * @swagger
 * /api/clubs:
 *   get:
 *     summary: Retrieve a list of clubs
 *     description: Retrieve a list of clubs from the database. Can be filtered by locationId or sorted by distance if lat and lng are provided.
 *     responses:
 *       200:
 *         description: A list of clubs.
 */
router.get('/', getClubs);

/**
 * @swagger
 * /api/clubs/{id}:
 *   get:
 *     summary: Get a club by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The club ID
 *     responses:
 *       200:
 *         description: The club details
 *       404:
 *         description: Club not found
 */
router.get('/:id', getClubById);

import { upload } from '../../middlewares/upload.middleware';

// Protected routes
router.post(
  '/', 
  protect, 
  authorize('CLUB_OWNER', 'ADMIN'), 
  upload.fields([{ name: 'coverImage', maxCount: 1 }, { name: 'interiorImages', maxCount: 5 }]),
  createClub
);
router.put('/:id', protect, authorize('CLUB_OWNER', 'ADMIN'), updateClub);
router.post('/:id/table-categories', protect, authorize('CLUB_OWNER', 'ADMIN'), addTableCategory);

export default router;
