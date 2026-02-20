export interface Env {
  DB: D1Database;
  STORAGE: R2Bucket;
  ENVIRONMENT: string;
  CLERK_SECRET_KEY: string;
}

export type UserRole = 'renter' | 'host' | 'admin';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type BookingStatus = 
  | 'pending_review'
  | 'agreement_draft'
  | 'host_edited'
  | 'renter_accepted'
  | 'confirmed'
  | 'rejected'
  | 'cancelled';

export type AgreementStatus = 'draft' | 'host_edited' | 'fully_accepted';
export type ListingAvailability = 'available' | 'unavailable' | 'rented';
export type InventoryType = 'pallet' | 'box' | 'item';
export type ShipRequestStatus = 'pending' | 'acknowledged' | 'received';
export type NotificationType = 
  | 'booking_request'
  | 'booking_approved'
  | 'booking_rejected'
  | 'booking_cancelled'
  | 'agreement_ready'
  | 'agreement_signed'
  | 'message_received'
  | 'ship_request_created'
  | 'ship_request_updated'
  | 'account_approved'
  | 'account_rejected'
  | 'system';

export interface User {
  id: string;
  clerk_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  approval_status: ApprovalStatus;
  business_reg_number: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  phone: string | null;
  profile_photo_key: string | null;
  verification_doc_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface Listing {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  address: string;
  city: string;
  province: string;
  postal_code: string | null;
  country: string;
  lat: number | null;
  lng: number | null;
  size_sqft: number;
  price_per_month: number;
  currency: string;
  features: string;
  availability_status: ListingAvailability;
  fulfillment_available: number;
  fulfillment_description: string | null;
  min_rental_months: number;
  max_rental_months: number | null;
  created_at: string;
  updated_at: string;
}

export interface ListingPhoto {
  id: string;
  listing_id: string;
  r2_key: string;
  sort_order: number;
  created_at: string;
}

export interface Booking {
  id: string;
  listing_id: string;
  renter_id: string;
  host_id: string;
  start_date: string;
  end_date: string;
  space_requested_sqft: number | null;
  monthly_rate: number;
  status: BookingStatus;
  rejected_reason: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StorageAgreement {
  id: string;
  booking_id: string;
  content: string;
  status: AgreementStatus;
  host_accepted_at: string | null;
  renter_accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  booking_id: string;
  renter_id: string;
  name: string;
  type: InventoryType;
  sku: string | null;
  quantity: number;
  category: string | null;
  dimensions: string | null;
  weight_kg: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShipRequest {
  id: string;
  booking_id: string;
  renter_id: string;
  carrier_name: string | null;
  tracking_number: string | null;
  expected_arrival_date: string | null;
  description: string | null;
  status: ShipRequestStatus;
  acknowledged_at: string | null;
  received_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: number;
  created_at: string;
}

export interface BookingMessage {
  id: string;
  booking_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface CalendarBlock {
  id: string;
  listing_id: string;
  booking_id: string | null;
  start_date: string;
  end_date: string;
  reason: string;
  created_at: string;
}

export interface AuthUser {
  id: string;
  clerk_id: string;
  email: string;
  role: UserRole;
  approval_status: ApprovalStatus;
}

export interface ApiError {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

export const ErrorCode = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  REJECTED_ACCOUNT: 'REJECTED_ACCOUNT',
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];
