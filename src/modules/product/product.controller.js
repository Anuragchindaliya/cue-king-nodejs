import * as productService from './product.service';
import { sendResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
export const createProduct = asyncHandler(async (req, res) => {
    const clubId = req.params.clubId;
    if (typeof clubId !== "string") {
        return sendResponse(res, 400, false, 'Club ID is required');
    }
    const imagePath = req.file ? `/uploads/${req.file.filename}` : undefined;
    const product = await productService.createProduct(clubId, req.body, imagePath);
    sendResponse(res, 201, true, 'Product created successfully', product);
});
export const getProducts = asyncHandler(async (req, res) => {
    const clubId = req.params.clubId;
    if (typeof clubId !== "string") {
        return sendResponse(res, 400, false, 'Club ID is required');
    }
    const products = await productService.getProductsByClub(clubId);
    sendResponse(res, 200, true, 'Products fetched successfully', products);
});
export const getAllProducts = asyncHandler(async (req, res) => {
    const filters = {
        name: req.query.name,
        minPrice: req.query.minPrice,
        maxPrice: req.query.maxPrice,
        clubId: req.query.clubId,
    };
    const products = await productService.getAllProducts(filters);
    sendResponse(res, 200, true, 'Products fetched successfully', products);
});
//# sourceMappingURL=product.controller.js.map