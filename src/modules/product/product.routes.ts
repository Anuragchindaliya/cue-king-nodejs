import { Router, Request, Response, NextFunction } from 'express';
import {
  createProduct,
  getAllProducts,
  getProductById,
  getMyProducts,
  getProducts,
  updateProduct,
  deleteProduct,
  updateProductStatus,
} from './product.controller';
import { protect, AuthRequest } from '../../middlewares/auth.middleware';
import { upload } from '../../middlewares/upload.middleware';
import jwt from 'jsonwebtoken';
import prisma from '../../config/db';

// Inline middleware for optional authentication (to detect user in public routes)
const optionalProtect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    if (!decoded.isGuest) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, role: true },
      });
      if (user) {
        req.user = user;
      }
    }
  } catch (error) {
    // Ignore invalid token and proceed anonymously
  }
  next();
};

const router = Router();

// Get products
router.get('/', optionalProtect, getAllProducts);
router.get('/my', protect, getMyProducts);
router.get('/:id', getProductById);
router.get('/club/:clubId', getProducts);

// Write products (CRUD)
router.post('/', protect, upload.single('image'), createProduct);
router.put('/:id', protect, upload.single('image'), updateProduct);
router.delete('/:id', protect, deleteProduct);
router.patch('/:id/status', protect, updateProductStatus);

export default router;
