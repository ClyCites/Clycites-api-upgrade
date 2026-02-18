/**
 * Order & Dispute Resolution Types
 *
 * State machines:
 *
 * Order:  pending → confirmed → processing → in_transit → delivered → completed
 *                 ↘ cancelled (allowed from any state before delivered)
 *
 * Dispute: open → under_review → awaiting_evidence → in_mediation
 *               → resolved | escalated | closed
 */

import { Document, Types } from 'mongoose';

// ── Dispute enums ─────────────────────────────────────────────────────────────

export enum DisputeStatus {
  OPEN               = 'open',
  UNDER_REVIEW       = 'under_review',
  AWAITING_EVIDENCE  = 'awaiting_evidence',
  IN_MEDIATION       = 'in_mediation',
  RESOLVED           = 'resolved',
  ESCALATED          = 'escalated',
  CLOSED             = 'closed',
}

export enum DisputeReason {
  ITEM_NOT_RECEIVED   = 'item_not_received',
  ITEM_NOT_AS_DESCRIBED = 'item_not_as_described',
  QUALITY_ISSUE       = 'quality_issue',
  QUANTITY_MISMATCH   = 'quantity_mismatch',
  PAYMENT_ISSUE       = 'payment_issue',
  DAMAGED_IN_TRANSIT  = 'damaged_in_transit',
  FRAUD               = 'fraud',
  OTHER               = 'other',
}

export enum ResolutionType {
  FULL_REFUND      = 'full_refund',
  PARTIAL_REFUND   = 'partial_refund',
  RESHIP           = 'reship',
  CANCEL_NO_CHARGE = 'cancel_no_charge',
  DISMISS          = 'dismiss',
  ESCALATE_TO_ADMIN = 'escalate_to_admin',
}

export enum MediatorType {
  PLATFORM_ADMIN = 'platform_admin',
  EXPERT         = 'expert',
  AUTO           = 'auto',
}

// ── Evidence ──────────────────────────────────────────────────────────────────

export interface IDisputeEvidence {
  submittedBy:  Types.ObjectId;
  description:  string;
  mediaFiles:   Types.ObjectId[];  // MediaFile refs
  submittedAt:  Date;
}

// ── Timeline entry ─────────────────────────────────────────────────────────────

export interface IDisputeTimelineEntry {
  status:       DisputeStatus;
  changedBy:    Types.ObjectId;
  changedAt:    Date;
  note?:        string;
}

// ── Resolution ────────────────────────────────────────────────────────────────

export interface IDisputeResolution {
  type:           ResolutionType;
  resolvedBy:     Types.ObjectId;
  resolvedAt:     Date;
  refundAmount?:  number;
  note:           string;
  mediatorType:   MediatorType;
}

// ── Main dispute interface ─────────────────────────────────────────────────────

export interface IDispute {
  disputeNumber:     string;
  orderId:           Types.ObjectId;
  raisedBy:          Types.ObjectId;   // buyer or farmer
  respondent:        Types.ObjectId;   // the other party
  reason:            DisputeReason;
  description:       string;

  status:            DisputeStatus;
  timeline:          IDisputeTimelineEntry[];

  evidence:          IDisputeEvidence[];

  mediator?:         Types.ObjectId;   // User assigned as mediator
  mediatorType?:     MediatorType;

  resolution?:       IDisputeResolution;

  /** Platform-set deadline for evidence submission */
  evidenceDeadline?:  Date;
  /** Date after which dispute auto-closes if unresponded */
  responseDeadline?:  Date;

  /** Internal notes visible only to mediator/admin */
  internalNotes?:     string;

  closedAt?:          Date;
  createdAt:          Date;
  updatedAt:          Date;
}

export interface IDisputeDocument extends IDispute, Document {}

// ── Service DTOs ──────────────────────────────────────────────────────────────

export interface ICreateDisputeInput {
  orderId:      string;
  reason:       DisputeReason;
  description:  string;
  mediaFiles?:  string[];
}

export interface ISubmitEvidenceInput {
  description: string;
  mediaFiles?: string[];
}

export interface IResolveDisputeInput {
  type:           ResolutionType;
  refundAmount?:  number;
  note:           string;
}
