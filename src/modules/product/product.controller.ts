import { Request, Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import * as productService from './product.service';
import { sendResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

export const createProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { clubId } = req.params;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : undefined;

  const product = await productService.createProduct(clubId, req.body, imagePath);
  sendResponse(res, 201, true, 'Product created successfully', product);
});

export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const { clubId } = req.params;
  const products = await productService.getProductsByClub(clubId);
  sendResponse(res, 200, true, 'Products fetched successfully', products);
});
