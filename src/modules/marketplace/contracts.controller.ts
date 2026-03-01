import mongoose from 'mongoose';
import { NextFunction, Response } from 'express';
import { AuthRequest } from '../../common/middleware/auth';
import { BadRequestError } from '../../common/errors/AppError';
import { ResponseHandler } from '../../common/utils/response';
import MarketplaceContractsService from './contracts.service';
import { MarketplaceContractStatus } from './contract.model';

class MarketplaceContractsController {
  private toObjectId(value: string, fieldName: string): mongoose.Types.ObjectId {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new BadRequestError(`${fieldName} must be a valid MongoDB ObjectId`);
    }

    return new mongoose.Types.ObjectId(value);
  }

  private getActor(req: AuthRequest) {
    if (!req.user?.id || !req.user?.role) {
      throw new BadRequestError('Authentication context is missing');
    }

    return {
      userId: this.toObjectId(req.user.id, 'userId'),
      role: req.user.role,
      orgId: req.user.orgId,
    };
  }

  listContracts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const result = await MarketplaceContractsService.listContracts(actor, {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        status: req.query.status as MarketplaceContractStatus | undefined,
        organizationId: typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
      });

      ResponseHandler.success(
        res,
        result.contracts.map((contract) => ({ ...contract.toObject(), uiStatus: contract.status })),
        'Contracts retrieved successfully',
        200,
        {
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages,
          },
        }
      );
    } catch (error) {
      next(error);
    }
  };

  createContract = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const created = await MarketplaceContractsService.createContract(actor, req.body);

      ResponseHandler.created(
        res,
        { ...created.toObject(), uiStatus: created.status },
        'Contract created successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  getContract = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const contractId = this.toObjectId(req.params.contractId, 'contractId');
      const contract = await MarketplaceContractsService.getContract(contractId, actor);

      ResponseHandler.success(
        res,
        { ...contract.toObject(), uiStatus: contract.status },
        'Contract retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  updateContract = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const contractId = this.toObjectId(req.params.contractId, 'contractId');
      const contract = await MarketplaceContractsService.updateContract(contractId, actor, req.body);

      ResponseHandler.success(
        res,
        { ...contract.toObject(), uiStatus: contract.status },
        'Contract updated successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  deleteContract = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const contractId = this.toObjectId(req.params.contractId, 'contractId');
      await MarketplaceContractsService.deleteContract(contractId, actor);

      ResponseHandler.success(res, null, 'Contract deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  signContract = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const contractId = this.toObjectId(req.params.contractId, 'contractId');
      const contract = await MarketplaceContractsService.signContract(
        contractId,
        actor,
        req.body.note
      );

      ResponseHandler.success(
        res,
        { ...contract.toObject(), uiStatus: contract.status },
        'Contract signed successfully'
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new MarketplaceContractsController();
