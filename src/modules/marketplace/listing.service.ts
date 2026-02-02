import Listing, { IListing } from './listing.model';
import Product from '../products/product.model';
import Farmer from '../farmers/farmer.model';
import { NotFoundError, BadRequestError } from '../../common/errors/AppError';
import { PaginationUtil } from '../../common/utils/pagination';

interface CreateListingData {
  farmer: string;
  product: string;
  title: string;
  description?: string;
  quantity: number;
  price: number;
  quality: 'premium' | 'standard' | 'economy';
  harvestDate?: Date;
  availableFrom?: Date;
  availableUntil?: Date;
  deliveryOptions: string[];
  location: {
    region: string;
    district: string;
    subcounty?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  images?: string[];
}

class ListingService {
  async createListing(data: CreateListingData): Promise<IListing> {
    // Verify product exists
    const product = await Product.findById(data.product);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Verify farmer exists
    const farmer = await Farmer.findById(data.farmer);
    if (!farmer) {
      throw new NotFoundError('Farmer not found');
    }

    const listing = await Listing.create({
      ...data,
      status: 'active',
    });

    return listing.populate(['product', 'farmer']);
  }

  async getListingById(listingId: string): Promise<IListing> {
    const listing = await Listing.findById(listingId)
      .populate('product')
      .populate('farmer', '-user');

    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    // Increment views
    listing.views = (listing.views || 0) + 1;
    await listing.save();

    return listing;
  }

  async getAllListings(query: any) {
    const { page, limit, sortBy, sortOrder } = PaginationUtil.getPaginationParams(query);
    const skip = PaginationUtil.getSkip(page, limit);
    const sort = PaginationUtil.getSortObject(sortBy, sortOrder);

    const filter: any = { status: 'active' };

    // Search by text
    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ];
    }

    // Filter by product
    if (query.product) {
      filter.product = query.product;
    }

    // Filter by farmer
    if (query.farmer) {
      filter.farmer = query.farmer;
    }

    // Filter by quality
    if (query.quality) {
      filter.quality = query.quality;
    }

    // Filter by region
    if (query.region) {
      filter['location.region'] = query.region;
    }

    // Filter by district
    if (query.district) {
      filter['location.district'] = query.district;
    }

    // Filter by price range
    if (query.minPrice || query.maxPrice) {
      filter.price = {};
      if (query.minPrice) {
        filter.price.$gte = parseFloat(query.minPrice);
      }
      if (query.maxPrice) {
        filter.price.$lte = parseFloat(query.maxPrice);
      }
    }

    // Filter by quantity range
    if (query.minQuantity) {
      filter.quantity = { $gte: parseFloat(query.minQuantity) };
    }

    // Filter by delivery options
    if (query.deliveryOption) {
      filter.deliveryOptions = query.deliveryOption;
    }

    // Filter by date available
    if (query.availableFrom || query.availableUntil) {
      filter.$and = filter.$and || [];
      if (query.availableFrom) {
        filter.$and.push({
          $or: [
            { availableFrom: { $lte: new Date(query.availableFrom) } },
            { availableFrom: { $exists: false } },
          ],
        });
      }
      if (query.availableUntil) {
        filter.$and.push({
          $or: [
            { availableUntil: { $gte: new Date(query.availableUntil) } },
            { availableUntil: { $exists: false } },
          ],
        });
      }
    }

    const [listings, total] = await Promise.all([
      Listing.find(filter)
        .populate('product')
        .populate('farmer', '-user')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Listing.countDocuments(filter),
    ]);

    return PaginationUtil.buildPaginationResult(listings, total, page, limit);
  }

  async getMyListings(farmerId: string, query: any) {
    const { page, limit, sortBy, sortOrder } = PaginationUtil.getPaginationParams(query);
    const skip = PaginationUtil.getSkip(page, limit);
    const sort = PaginationUtil.getSortObject(sortBy, sortOrder);

    const filter: any = { farmer: farmerId };

    if (query.status) {
      filter.status = query.status;
    }

    const [listings, total] = await Promise.all([
      Listing.find(filter)
        .populate('product')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Listing.countDocuments(filter),
    ]);

    return PaginationUtil.buildPaginationResult(listings, total, page, limit);
  }

  async updateListing(listingId: string, farmerId: string, updateData: Partial<CreateListingData>): Promise<IListing> {
    const listing = await Listing.findById(listingId);

    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    if (listing.farmer.toString() !== farmerId) {
      throw new BadRequestError('You can only update your own listings');
    }

    Object.assign(listing, updateData);
    await listing.save();

    return listing.populate(['product', 'farmer']);
  }

  async updateListingStatus(
    listingId: string,
    farmerId: string,
    status: 'active' | 'pending' | 'sold' | 'expired' | 'cancelled'
  ): Promise<IListing> {
    const listing = await Listing.findById(listingId);

    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    if (listing.farmer.toString() !== farmerId) {
      throw new BadRequestError('You can only update your own listings');
    }

    listing.status = status;
    await listing.save();

    return listing;
  }

  async deleteListing(listingId: string, farmerId: string): Promise<void> {
    const listing = await Listing.findById(listingId);

    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    if (listing.farmer.toString() !== farmerId) {
      throw new BadRequestError('You can only delete your own listings');
    }

    await listing.deleteOne();
  }

  async incrementInquiries(listingId: string): Promise<void> {
    await Listing.findByIdAndUpdate(listingId, {
      $inc: { inquiries: 1 },
    });
  }

  async getListingStats(farmerId: string) {
    const stats = await Listing.aggregate([
      { $match: { farmer: farmerId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalViews: { $sum: '$views' },
          totalInquiries: { $sum: '$inquiries' },
        },
      },
    ]);

    return stats;
  }
}

export default ListingService;
