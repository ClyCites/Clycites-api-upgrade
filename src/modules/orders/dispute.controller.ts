import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import disputeService from './dispute.service';
import { sendSuccess } from '../../common/utils/response';
import { BadRequestError } from '../../common/errors/AppError';
import { MediatorType } from './dispute.types';
import OrderService from './order.service';

const orderService = new OrderService();

function validateRequest(req: Request): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new BadRequestError(errors.array()[0].msg as string);
  }
}

export async function createDispute(req: Request, res: Response, next: NextFunction) {
  try {
    validateRequest(req);
    const dispute = await disputeService.createDispute(req.body, req.user!.id);
    sendSuccess(res, dispute, 'Dispute created successfully', 201);
  } catch (err) { next(err); }
}

export async function getDisputeById(req: Request, res: Response, next: NextFunction) {
  try {
    validateRequest(req);
    const dispute = await disputeService.getDisputeById(req.params.id, req.user!.id, req.user!.role);
    sendSuccess(res, dispute, 'Dispute retrieved');
  } catch (err) { next(err); }
}

export async function getMyDisputes(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await disputeService.getMyDisputes(req.user!.id, req.query);
    sendSuccess(res, result, 'Disputes retrieved');
  } catch (err) { next(err); }
}

export async function getAdminDisputes(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await disputeService.getAdminDisputes(req.query);
    sendSuccess(res, result, 'Disputes retrieved');
  } catch (err) { next(err); }
}

export async function getDisputeStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await disputeService.getDisputeStats();
    sendSuccess(res, stats, 'Dispute statistics retrieved');
  } catch (err) { next(err); }
}

export async function submitEvidence(req: Request, res: Response, next: NextFunction) {
  try {
    validateRequest(req);
    const dispute = await disputeService.submitEvidence(req.params.id, req.user!.id, req.body);
    sendSuccess(res, dispute, 'Evidence submitted successfully');
  } catch (err) { next(err); }
}

export async function reviewDispute(req: Request, res: Response, next: NextFunction) {
  try {
    validateRequest(req);
    const dispute = await disputeService.reviewDispute(req.params.id, req.user!.id, req.body.note);
    sendSuccess(res, dispute, 'Dispute moved to under review');
  } catch (err) { next(err); }
}

export async function assignMediator(req: Request, res: Response, next: NextFunction) {
  try {
    validateRequest(req);
    const { mediatorId, mediatorType } = req.body;
    const dispute = await disputeService.assignMediator(
      req.params.id,
      mediatorId,
      mediatorType as MediatorType,
      req.user!.id
    );
    sendSuccess(res, dispute, 'Mediator assigned successfully');
  } catch (err) { next(err); }
}

export async function resolveDispute(req: Request, res: Response, next: NextFunction) {
  try {
    validateRequest(req);
    const dispute = await disputeService.resolveDispute(req.params.id, req.body, req.user!.id);
    sendSuccess(res, dispute, 'Dispute resolved');
  } catch (err) { next(err); }
}

export async function escalateDispute(req: Request, res: Response, next: NextFunction) {
  try {
    validateRequest(req);
    const dispute = await disputeService.escalateDispute(req.params.id, req.body.note ?? '', req.user!.id);
    sendSuccess(res, dispute, 'Dispute escalated');
  } catch (err) { next(err); }
}

export async function closeDispute(req: Request, res: Response, next: NextFunction) {
  try {
    validateRequest(req);
    const dispute = await disputeService.closeDispute(req.params.id, req.body.note ?? '', req.user!.id);
    sendSuccess(res, dispute, 'Dispute closed');
  } catch (err) { next(err); }
}

// ── Order: confirm delivery ───────────────────────────────────────────────────

export async function confirmDelivery(req: Request, res: Response, next: NextFunction) {
  try {
    validateRequest(req);
    const { quantityDelivered, deliveryPhotos } = req.body;
    const order = await orderService.confirmDelivery(
      req.params.id,
      req.user!.id,
      Number(quantityDelivered),
      deliveryPhotos
    );
    sendSuccess(res, order, 'Delivery confirmed');
  } catch (err) { next(err); }
}

export async function getOrderTimeline(req: Request, res: Response, next: NextFunction) {
  try {
    const timeline = await orderService.getOrderTimeline(req.params.id, req.user!.id, req.user!.role);
    sendSuccess(res, timeline, 'Order timeline retrieved');
  } catch (err) { next(err); }
}
