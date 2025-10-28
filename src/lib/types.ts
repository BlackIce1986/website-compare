/**
 * Permission levels for website sharing
 */
export enum Permission {
  VIEW = 'VIEW',
  EDIT = 'EDIT'
}

/**
 * Invitation status types
 */
export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired'
}

/**
 * Comparison status types
 */
export enum ComparisonStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Type definitions for better development experience
 */
export type WebsiteShareData = {
  id: string;
  websiteId: string;
  userId: string;
  permission: Permission;
  createdAt: Date;
};

export type WebsiteInvitationData = {
  id: string;
  websiteId: string;
  inviterId: string;
  inviteeId?: string;
  inviteeEmail?: string;
  token: string;
  permission: Permission;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
  acceptedAt?: Date;
};