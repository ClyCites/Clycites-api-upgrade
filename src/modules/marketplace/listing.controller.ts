import { Request, Response, NextFunction } from 'express';
import ListingService from './listing.service';
import { ResponseHandler } from '../../common/utils/response';
import { AuthRequest } from '../../common/middleware/auth';

export class ListingController {
  private listingService: ListingService;

  constructor() {
    this.listingService = new ListingService();
  }

  createListing = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const listing = await this.listingService.createListing({
        ...req.body,
        farmer: req.body.farmer || req.user?.farmerId,
      });
      ResponseHandler.created(res, listing, 'Listing created successfully');
    } catch (error) {
      next(error);
    }
  };

  getListingById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const listing = await this.listingService.getListingById(id);
      ResponseHandler.success(res, listing, 'Listing retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getAllListings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.listingService.getAllListings(req.query);
      ResponseHandler.paginated(
        res,
        result.data,
        result.pagination,
        'Listings retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  getMyListings = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const farmerId = req.user?.farmerId;
      if (!farmerId) {
        return ResponseHandler.error(res, 'Farmer profile not found', 404);
      }

      const result = await this.listingService.getMyListings(farmerId, req.query);
      return ResponseHandler.paginated(
        res,
        result.data,
        result.pagination,
        'My listings retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  updateListing = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const farmerId = req.user?.farmerId;
      if (!farmerId) {
        return ResponseHandler.error(res, 'Farmer profile not found', 404);
      }

      const listing = await this.listingService.updateListing(id, farmerId, req.body);
      return ResponseHandler.success(res, listing, 'Listing updated successfully');
    } catch (error) {
      next(error);
    }
  };

  updateListingStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const farmerId = req.user?.farmerId;
      if (!farmerId) {
        return ResponseHandler.error(res, 'Farmer profile not found', 404);
      }

      const listing = await this.listingService.updateListingStatus(id, farmerId, status);
      return ResponseHandler.success(res, listing, 'Listing status updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteListing = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const farmerId = req.user?.farmerId;
      if (!farmerId) {
        return ResponseHandler.error(res, 'Farmer profile not found', 404);
      }

      await this.listingService.deleteListing(id, farmerId);
      return ResponseHandler.success(res, null, 'Listing deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  getMyStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const farmerId = req.user?.farmerId;
      if (!farmerId) {
        return ResponseHandler.error(res, 'Farmer profile not found', 404);
      }

      const stats = await this.listingService.getListingStats(farmerId);
      return ResponseHandler.success(res, stats, 'Listing stats retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  incrementInquiries = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.listingService.incrementInquiries(id);
      ResponseHandler.success(res, null, 'Inquiry recorded successfully');
    } catch (error) {
      next(error);
    }
  };
}

export default new ListingController();
