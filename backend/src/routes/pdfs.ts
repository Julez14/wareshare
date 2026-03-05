import { Hono } from 'hono';
import { ulid } from 'ulid';
import type { Booking, Env, Listing, StorageAgreement, User } from '../types';
import { requireAuth, requireApproved } from '../middleware/auth';
import { requireBookingParticipant } from '../middleware/permissions';
import { notFound } from '../lib/errors';
import { renderAgreementPdf } from '../lib/pdf-renderer';

interface BookingDetailsRow extends Booking {
  listing_title: string;
  listing_address: string;
  listing_city: string;
  listing_province: string;
  listing_postal_code: string | null;
  listing_country: string;
  listing_size_sqft: number;
  listing_currency: string;
  listing_fulfillment_available: number;
  listing_fulfillment_description: string | null;
  renter_email: string;
  renter_name: string;
  renter_phone: string | null;
  host_email: string;
  host_name: string;
  host_phone: string | null;
}

const pdfs = new Hono<{ Bindings: Env }>();

pdfs.use('/*', requireAuth);

pdfs.get('/bookings/:id/agreement/pdf', requireApproved, requireBookingParticipant, async (c) => {
  const bookingId = c.req.param('id');

  const row = await c.env.DB.prepare(
    `SELECT b.*, 
      l.title as listing_title, l.address as listing_address, l.city as listing_city, 
      l.province as listing_province, l.postal_code as listing_postal_code, l.country as listing_country,
      l.size_sqft as listing_size_sqft, l.currency as listing_currency,
      l.fulfillment_available as listing_fulfillment_available,
      l.fulfillment_description as listing_fulfillment_description,
      renter.full_name as renter_name, renter.email as renter_email, renter.phone as renter_phone,
      host.full_name as host_name, host.email as host_email, host.phone as host_phone
    FROM bookings b
    JOIN listings l ON l.id = b.listing_id
    JOIN users renter ON renter.id = b.renter_id
    JOIN users host ON host.id = b.host_id
    WHERE b.id = ?`
  ).bind(bookingId).first<BookingDetailsRow>();

  if (!row) {
    return notFound('Booking not found');
  }

  const agreement = await c.env.DB.prepare(
    'SELECT * FROM storage_agreements WHERE booking_id = ?'
  ).bind(bookingId).first<StorageAgreement>();

  if (!agreement) {
    return notFound('Agreement not found');
  }

  const booking: Booking = {
    id: row.id,
    listing_id: row.listing_id,
    renter_id: row.renter_id,
    host_id: row.host_id,
    start_date: row.start_date,
    end_date: row.end_date,
    space_requested_sqft: row.space_requested_sqft,
    monthly_rate: row.monthly_rate,
    status: row.status,
    rejected_reason: row.rejected_reason,
    cancelled_by: row.cancelled_by,
    cancelled_at: row.cancelled_at,
    confirmed_at: row.confirmed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  const listing: Listing = {
    id: row.listing_id,
    host_id: row.host_id,
    title: row.listing_title,
    description: null,
    address: row.listing_address,
    city: row.listing_city,
    province: row.listing_province,
    postal_code: row.listing_postal_code,
    country: row.listing_country,
    lat: null,
    lng: null,
    size_sqft: row.listing_size_sqft,
    price_per_month: row.monthly_rate,
    currency: row.listing_currency,
    features: '[]',
    availability_status: 'available',
    fulfillment_available: row.listing_fulfillment_available,
    fulfillment_description: row.listing_fulfillment_description,
    min_rental_months: 1,
    max_rental_months: null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  const host: User = {
    id: row.host_id,
    clerk_id: '',
    email: row.host_email,
    full_name: row.host_name,
    role: 'host',
    approval_status: 'approved',
    business_reg_number: null,
    website: null,
    address: null,
    city: null,
    province: null,
    postal_code: null,
    phone: row.host_phone,
    profile_photo_key: null,
    verification_doc_key: null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  const renter: User = {
    id: row.renter_id,
    clerk_id: '',
    email: row.renter_email,
    full_name: row.renter_name,
    role: 'renter',
    approval_status: 'approved',
    business_reg_number: null,
    website: null,
    address: null,
    city: null,
    province: null,
    postal_code: null,
    phone: row.renter_phone,
    profile_photo_key: null,
    verification_doc_key: null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  const bytes = await renderAgreementPdf({ booking, listing, agreement, host, renter });
  const versionSuffix = agreement.updated_at.replace(/[:.]/g, '-');
  const key = `pdf/agreements/${booking.id}-${versionSuffix}.pdf`;
  const fileName = `wareshare-agreement-${booking.id}.pdf`;

  await c.env.STORAGE.put(key, bytes, {
    httpMetadata: {
      contentType: 'application/pdf',
      contentDisposition: `attachment; filename="${fileName}"`,
      cacheControl: 'private, max-age=0, no-store',
    },
    customMetadata: {
      booking_id: booking.id,
      agreement_status: agreement.status,
      agreement_updated_at: agreement.updated_at,
    },
  });

  const headers = new Headers();
  headers.set('X-R2-Key', key);
  headers.set('Content-Type', 'application/pdf');
  headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
  headers.set('Cache-Control', 'private, max-age=0, no-store');
  return new Response(bytes, { headers });
});

export default pdfs;
