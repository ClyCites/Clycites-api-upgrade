import { Response, NextFunction } from 'express';
import OrderService from './order.service';
import { ResponseHandler } from '../../common/utils/response';
import { AuthRequest } from '../../common/middleware/auth';

export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  createOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const order = await this.orderService.createOrder({
        ...req.body,
        buyer: req.user?.id,
      });
      ResponseHandler.created(res, order, 'Order created successfully');
    } catch (error) {
      next(error);
    }
  };

  getOrderById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const order = await this.orderService.getOrderById(id, req.user!.id, req.user!.role);
      ResponseHandler.success(res, order, 'Order retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getMyOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.orderService.getMyOrders(req.user!.id, req.query);
      ResponseHandler.paginated(
        res,
        result.data,
        result.pagination,
        'Orders retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  getFarmerOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.orderService.getFarmerOrders(req.user!.id, req.query);
      ResponseHandler.paginated(
        res,
        result.data,
        result.pagination,
        'Farmer orders retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  updateOrderStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const order = await this.orderService.updateOrderStatus(
        id,
        status,
        req.user!.id,
        req.user!.role
      );
      ResponseHandler.success(res, order, 'Order status updated successfully');
    } catch (error) {
      next(error);
    }
  };

  cancelOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const order = await this.orderService.cancelOrder(id, req.user!.id, req.user!.role, reason);
      ResponseHandler.success(res, order, 'Order cancelled successfully');
    } catch (error) {
      next(error);
    }
  };

  getOrderStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await this.orderService.getOrderStats(req.user!.id, req.user!.role);
      ResponseHandler.success(res, stats, 'Order stats retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}

export default new OrderController();
