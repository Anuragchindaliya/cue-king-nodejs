import { Request, Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import * as productService from './product.service';
import { sendResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

// Create a product (P2P or Club)
export const createProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
  const ownerId = req.user.id;
  // multer-storage-cloudinary stores the secure HTTPS url in path
  const imagePath = req.file ? (req.file as any).path : undefined;

  const product = await productService.createProduct(ownerId, req.body, imagePath);
  sendResponse(res, 201, true, 'Product created successfully', product);
});

// Get all products (with filters)
export const getAllProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const filters = {
    name: req.query.name as string,
    minPrice: req.query.minPrice as string,
    maxPrice: req.query.maxPrice as string,
    clubId: req.query.clubId as string,
    condition: req.query.condition as string,
    status: req.query.status as string,
    excludeOwnerId: req.query.excludeMyProducts === 'true' && req.user ? req.user.id : undefined,
  };

  const products = await productService.getAllProducts(filters);
  sendResponse(res, 200, true, 'Products fetched successfully', products);
});

// Get a single product details
export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const product = await productService.getProductById(id);
  if (!product) {
    return sendResponse(res, 404, false, 'Product not found');
  }
  sendResponse(res, 200, true, 'Product fetched successfully', product);
});

// Get current user's products
export const getMyProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user.id as string;
  const products = await productService.getProductsByOwner(userId);
  sendResponse(res, 200, true, 'My products fetched successfully', products);
});

// Get products by Club
export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const clubId = req.params.clubId;
  if (typeof clubId !== 'string') {
    return sendResponse(res, 400, false, 'Club ID is required');
  }
  const products = await productService.getProductsByClub(clubId);
  sendResponse(res, 200, true, 'Products fetched successfully', products);
});

// Update product
export const updateProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user.id as string;
  const userRole = req.user.role as string;
  const imagePath = req.file ? (req.file as any).path : undefined;

  try {
    const updated = await productService.updateProduct(id, userId, userRole, req.body, imagePath);
    sendResponse(res, 200, true, 'Product updated successfully', updated);
  } catch (error: any) {
    sendResponse(res, 400, false, error.message || 'Failed to update product');
  }
});

// Delete product
export const deleteProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user.id as string;
  const userRole = req.user.role as string;

  try {
    await productService.deleteProduct(id, userId, userRole);
    sendResponse(res, 200, true, 'Product deleted successfully');
  } catch (error: any) {
    sendResponse(res, 400, false, error.message || 'Failed to delete product');
  }
});

// Update product status
export const updateProductStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user.id as string;
  const userRole = req.user.role as string;
  const { status } = req.body;

  if (!status) {
    return sendResponse(res, 400, false, 'Status is required');
  }

  try {
    const updated = await productService.updateProductStatus(id, userId, userRole, status);
    sendResponse(res, 200, true, 'Product status updated successfully', updated);
  } catch (error: any) {
    sendResponse(res, 400, false, error.message || 'Failed to update product status');
  }
});
