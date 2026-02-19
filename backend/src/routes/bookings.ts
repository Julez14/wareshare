import { Hono } from 'hono';
import type { Env, Booking, Listing, User, StorageAgreement, InventoryItem } from '../types';
import { requireAuth, getAuthUser, requireApproved } from '../middleware/auth';
import { requireBookingParticipant, requireBookingHost, requireBookingRenter } from '../middleware/permissions';
import { validationError, notFound, forbidden, conflict } from '../lib/errors';
import { generateAgreementContent, serializeAgreementContent, parseAgreementContent } from '../lib/storage-agreement';
import { ulid } from 'ulid';

const bookings = new Hono<{ Bindings: Env }>();

bookings.use('/*', requireAuth);

bookings.get('/', requireApproved, async (c) => {
  const user = getAuthUser(c);
  const { status, page = '1', per_page = '20' } = c.req.query();
  
  const pageNum = parseInt(page, 10);
  const perPage = Math.min(parseInt(per_page, 10), 100);
  const offset = (pageNum - 1) * perPage;
  
  let sql = `SELECT b.*, 
    l.title as listing_title, l.city as listing_city, l.province as listing_province,
    renter.full_name as renter_name, host.full_name as host_name
    FROM bookings b
    JOIN listings l ON b.listing_id = l.id
    JOIN users renter ON b.renter_id = renter.id
    JOIN users host ON b.host_id = host.id
    WHERE `;
  
  const params: unknown[] = [];
  
  if (user.role === 'renter') {
    sql += 'b.renter_id = ?';
    params.push(user.id);
  } else if (user.role === 'host') {
    sql += 'b.host_id = ?';
    params.push(user.id);
  } else {
    sql += '1=1';
  }
  
  if (status) {
    sql += ' AND b.status = ?';
    params.push(status);
  }
  
  const countResult = await c.env.DB.prepare(
    sql.replace(/SELECT b\..*FROM/, 'SELECT COUNT(*) as count FROM')
  ).bind(...params).first<{ count: number }>();
  
  sql += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
  params.push(perPage, offset);
  
  const result = await c.env.DB.prepare(sql).bind(...params).all();
  
  return c.json({
    bookings: result.results,
    pagination: {
      page: pageNum,
      per_page: perPage,
      total: countResult?.count || 0,
      total_pages: Math.ceil((countResult?.count || 0) / perPage),
    },
  });
});

bookings.get('/:id', requireApproved, requireBookingParticipant, async (c) => {
  const bookingId = c.req.param('id');
  
  const booking = await c.env.DB.prepare(
    `SELECT b.*, 
      l.id as listing_id, l.title as listing_title, l.address as listing_address, 
      l.city as listing_city, l.province as listing_province, l.size_sqft as listing_size,
      renter.full_name as renter_name, renter.email as renter_email,
      host.full_name as host_name, host.email as host_email
     FROM bookings b
     JOIN listings l ON b.listing_id = l.id
     JOIN users renter ON b.renter_id = renter.id
     JOIN users host ON b.host_id = host.id
     WHERE b.id = ?`
  ).bind(bookingId).first();
  
  if (!booking) {
    return notFound('Booking not found');
  }
  
  const agreement = await c.env.DB.prepare(
    'SELECT * FROM storage_agreements WHERE booking_id = ?'
  ).bind(bookingId).first<StorageAgreement>();
  
  const inventory = await c.env.DB.prepare(
    'SELECT * FROM inventory_items WHERE booking_id = ?'
  ).bind(bookingId).all<InventoryItem>();
  
  return c.json({
    booking,
    agreement: agreement || null,
    inventory: inventory.results,
  });
});

bookings.post('/', requireApproved, async (c) => {
  const user = getAuthUser(c);
  
  if (user.role !== 'renter') {
    return forbidden('Only renters can create booking requests');
  }
  
  const body = await c.req.json();
  
  if (!body.listing_id || !body.start_date || !body.end_date) {
    return validationError('Missing required fields: listing_id, start_date, end_date');
  }
  
  const listing = await c.env.DB.prepare(
    `SELECT l.*, u.approval_status as host_approval_status 
     FROM listings l 
     JOIN users u ON l.host_id = u.id 
     WHERE l.id = ?`
  ).bind(body.listing_id).first<Listing & { host_approval_status: string }>();
  
  if (!listing) {
    return notFound('Listing not found');
  }
  
  if (listing.availability_status !== 'available') {
    return conflict('This listing is not currently available');
  }
  
  if (listing.host_approval_status !== 'approved') {
    return conflict('This listing\'s host is not approved');
  }
  
  const bookingId = ulid();
  const agreementId = ulid();
  const now = new Date().toISOString();
  
  await c.env.DB.prepare(
    `INSERT INTO bookings (
      id, listing_id, renter_id, host_id, start_date, end_date,
      space_requested_sqft, monthly_rate, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', ?, ?)`
  ).bind(
    bookingId,
    body.listing_id,
    user.id,
    listing.host_id,
    body.start_date,
    body.end_date,
    body.space_requested_sqft || null,
    listing.price_per_month,
    now,
    now
  ).run();
  
  const inventory: InventoryItem[] = [];
  if (body.inventory && Array.isArray(body.inventory)) {
    for (const item of body.inventory) {
      const itemId = ulid();
      await c.env.DB.prepare(
        `INSERT INTO inventory_items (
          id, booking_id, renter_id, name, type, sku, quantity, category,
          dimensions, weight_kg, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        itemId, bookingId, user.id, item.name, item.type || 'item',
        item.sku || null, item.quantity || 1, item.category || null,
        item.dimensions || null, item.weight_kg || null, item.notes || null,
        now, now
      ).run();
      inventory.push({ id: itemId, booking_id: bookingId, renter_id: user.id, ...item } as InventoryItem);
    }
  }
  
  const agreementContent = generateAgreementContent(
    { id: bookingId, start_date: body.start_date, end_date: body.end_date, 
      space_requested_sqft: body.space_requested_sqft, monthly_rate: listing.price_per_month } as Booking,
    listing,
    inventory
  );
  
  await c.env.DB.prepare(
    `INSERT INTO storage_agreements (id, booking_id, content, status, created_at, updated_at)
     VALUES (?, ?, ?, 'draft', ?, ?)`
  ).bind(agreementId, bookingId, serializeAgreementContent(agreementContent), now, now).run();
  
  await c.env.DB.prepare(
    `INSERT INTO notifications (id, user_id, type, title, message, related_entity_type, related_entity_id, created_at)
     VALUES (?, ?, 'booking_request', 'New Booking Request', ?, 'booking', ?, ?)`
  ).bind(ulid(), listing.host_id, `New booking request for "${listing.title}"`, bookingId, now).run();
  
  await c.env.DB.prepare(
    "UPDATE bookings SET status = 'agreement_draft', updated_at = ? WHERE id = ?"
  ).bind(now, bookingId).run();
  
  const booking = await c.env.DB.prepare(
    'SELECT * FROM bookings WHERE id = ?'
  ).bind(bookingId).first<Booking>();
  
  const agreement = await c.env.DB.prepare(
    'SELECT * FROM storage_agreements WHERE booking_id = ?'
  ).bind(bookingId).first<StorageAgreement>();
  
  return c.json({ booking, agreement, inventory }, 201);
});

bookings.post('/:id/reject', requireApproved, requireBookingHost, async (c) => {
  const bookingId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const now = new Date().toISOString();
  
  const booking = await c.env.DB.prepare(
    'SELECT * FROM bookings WHERE id = ?'
  ).bind(bookingId).first<Booking>();
  
  if (!booking) {
    return notFound('Booking not found');
  }
  
  if (!['pending_review', 'agreement_draft', 'host_edited'].includes(booking.status)) {
    return conflict('Cannot reject a booking in this status');
  }
  
  await c.env.DB.prepare(
    `UPDATE bookings SET status = 'rejected', rejected_reason = ?, updated_at = ? WHERE id = ?`
  ).bind(body.reason || null, now, bookingId).run();
  
  await c.env.DB.prepare(
    `INSERT INTO notifications (id, user_id, type, title, message, related_entity_type, related_entity_id, created_at)
     VALUES (?, ?, 'booking_rejected', 'Booking Request Rejected', ?, 'booking', ?, ?)`
  ).bind(ulid(), booking.renter_id, body.reason || 'Your booking request has been declined.', bookingId, now).run();
  
  const updated = await c.env.DB.prepare(
    'SELECT * FROM bookings WHERE id = ?'
  ).bind(bookingId).first<Booking>();
  
  return c.json({ booking: updated });
});

bookings.put('/:id/agreement', requireApproved, requireBookingHost, async (c) => {
  const bookingId = c.req.param('id');
  const body = await c.req.json();
  const now = new Date().toISOString();
  
  const booking = await c.env.DB.prepare(
    'SELECT * FROM bookings WHERE id = ?'
  ).bind(bookingId).first<Booking>();
  
  if (!booking) {
    return notFound('Booking not found');
  }
  
  if (!['agreement_draft', 'host_edited'].includes(booking.status)) {
    return conflict('Cannot edit agreement in this booking status');
  }
  
  const agreement = await c.env.DB.prepare(
    'SELECT * FROM storage_agreements WHERE booking_id = ?'
  ).bind(bookingId).first<StorageAgreement>();
  
  if (!agreement) {
    return notFound('Agreement not found');
  }
  
  const content = parseAgreementContent(agreement.content);
  
  if (body.sections) {
    content.sections = body.sections;
  }
  
  if (body.special_conditions) {
    const specialSection = content.sections.find(s => s.key === 'special_conditions');
    if (specialSection) {
      specialSection.items = body.special_conditions.map((cond: string) => ({
        label: 'Condition',
        value: cond,
      }));
    }
  }
  
  if (body.notes !== undefined) {
    const notesSection = content.sections.find(s => s.key === 'notes');
    if (notesSection) {
      notesSection.content = body.notes;
    }
  }
  
  await c.env.DB.prepare(
    `UPDATE storage_agreements SET content = ?, status = 'host_edited', updated_at = ? WHERE booking_id = ?`
  ).bind(serializeAgreementContent(content), now, bookingId).run();
  
  await c.env.DB.prepare(
    "UPDATE bookings SET status = 'host_edited', updated_at = ? WHERE id = ?"
  ).bind(now, bookingId).run();
  
  await c.env.DB.prepare(
    `INSERT INTO notifications (id, user_id, type, title, message, related_entity_type, related_entity_id, created_at)
     VALUES (?, ?, 'agreement_ready', 'Storage Agreement Updated', 'The host has updated the storage agreement. Please review and sign.', 'booking', ?, ?)`
  ).bind(ulid(), booking.renter_id, bookingId, now).run();
  
  const updated = await c.env.DB.prepare(
    'SELECT * FROM storage_agreements WHERE booking_id = ?'
  ).bind(bookingId).first<StorageAgreement>();
  
  return c.json({ agreement: updated });
});

bookings.post('/:id/agreement/accept', requireApproved, requireBookingParticipant, async (c) => {
  const bookingId = c.req.param('id');
  const user = getAuthUser(c);
  const now = new Date().toISOString();
  
  const booking = await c.env.DB.prepare(
    'SELECT * FROM bookings WHERE id = ?'
  ).bind(bookingId).first<Booking>();
  
  if (!booking) {
    return notFound('Booking not found');
  }
  
  if (!['host_edited', 'renter_accepted'].includes(booking.status)) {
    return conflict('Cannot accept agreement in this booking status');
  }
  
  const agreement = await c.env.DB.prepare(
    'SELECT * FROM storage_agreements WHERE booking_id = ?'
  ).bind(bookingId).first<StorageAgreement>();
  
  if (!agreement) {
    return notFound('Agreement not found');
  }
  
  if (user.role === 'host' || user.id === booking.host_id) {
    if (agreement.host_accepted_at) {
      return conflict('Host has already signed this agreement');
    }
    
    await c.env.DB.prepare(
      "UPDATE storage_agreements SET host_accepted_at = ?, updated_at = ? WHERE booking_id = ?"
    ).bind(now, now, bookingId).run();
    
    await c.env.DB.prepare(
      `INSERT INTO notifications (id, user_id, type, title, message, related_entity_type, related_entity_id, created_at)
       VALUES (?, ?, 'agreement_signed', 'Agreement Signed', 'The host has signed the storage agreement.', 'booking', ?, ?)`
    ).bind(ulid(), booking.renter_id, bookingId, now).run();
  } else if (user.role === 'renter' || user.id === booking.renter_id) {
    if (agreement.renter_accepted_at) {
      return conflict('Renter has already signed this agreement');
    }
    
    await c.env.DB.prepare(
      "UPDATE storage_agreements SET renter_accepted_at = ?, updated_at = ? WHERE booking_id = ?"
    ).bind(now, now, bookingId).run();
    
    await c.env.DB.prepare(
      `INSERT INTO notifications (id, user_id, type, title, message, related_entity_type, related_entity_id, created_at)
       VALUES (?, ?, 'agreement_signed', 'Agreement Signed', 'The renter has signed the storage agreement.', 'booking', ?, ?)`
    ).bind(ulid(), booking.host_id, bookingId, now).run();
  }
  
  const updatedAgreement = await c.env.DB.prepare(
    'SELECT * FROM storage_agreements WHERE booking_id = ?'
  ).bind(bookingId).first<StorageAgreement>();
  
  if (updatedAgreement?.host_accepted_at && updatedAgreement?.renter_accepted_at) {
    await c.env.DB.prepare(
      `UPDATE storage_agreements SET status = 'fully_accepted', updated_at = ? WHERE booking_id = ?`
    ).bind(now, bookingId).run();
    
    await c.env.DB.prepare(
      "UPDATE bookings SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?"
    ).bind(now, now, bookingId).run();
    
    await c.env.DB.prepare(
      `INSERT INTO calendar_blocks (id, listing_id, booking_id, start_date, end_date, reason, created_at)
       VALUES (?, ?, ?, ?, ?, 'booking', ?)`
    ).bind(ulid(), booking.listing_id, bookingId, booking.start_date, booking.end_date, now).run();
    
    await c.env.DB.prepare(
      `INSERT INTO notifications (id, user_id, type, title, message, related_entity_type, related_entity_id, created_at)
       VALUES (?, ?, 'booking_approved', 'Booking Confirmed', 'Your booking has been confirmed. The storage agreement has been signed by both parties.', 'booking', ?, ?)`
    ).bind(ulid(), booking.renter_id, bookingId, now).run();
    
    await c.env.DB.prepare(
      `INSERT INTO notifications (id, user_id, type, title, message, related_entity_type, related_entity_id, created_at)
       VALUES (?, ?, 'booking_approved', 'Booking Confirmed', 'The booking has been confirmed. The storage agreement has been signed by both parties.', 'booking', ?, ?)`
    ).bind(ulid(), booking.host_id, bookingId, now).run();
  } else if (updatedAgreement?.renter_accepted_at && booking.status === 'host_edited') {
    await c.env.DB.prepare(
      "UPDATE bookings SET status = 'renter_accepted', updated_at = ? WHERE id = ?"
    ).bind(now, bookingId).run();
  }
  
  const finalAgreement = await c.env.DB.prepare(
    'SELECT * FROM storage_agreements WHERE booking_id = ?'
  ).bind(bookingId).first<StorageAgreement>();
  
  const finalBooking = await c.env.DB.prepare(
    'SELECT * FROM bookings WHERE id = ?'
  ).bind(bookingId).first<Booking>();
  
  return c.json({ booking: finalBooking, agreement: finalAgreement });
});

bookings.post('/:id/cancel', requireApproved, requireBookingParticipant, async (c) => {
  const bookingId = c.req.param('id');
  const user = getAuthUser(c);
  const now = new Date().toISOString();
  
  const booking = await c.env.DB.prepare(
    'SELECT * FROM bookings WHERE id = ?'
  ).bind(bookingId).first<Booking>();
  
  if (!booking) {
    return notFound('Booking not found');
  }
  
  if (!['agreement_draft', 'host_edited', 'renter_accepted', 'confirmed'].includes(booking.status)) {
    return conflict('Cannot cancel a booking in this status');
  }
  
  await c.env.DB.prepare(
    `UPDATE bookings SET status = 'cancelled', cancelled_by = ?, cancelled_at = ?, updated_at = ? WHERE id = ?`
  ).bind(user.id, now, now, bookingId).run();
  
  await c.env.DB.prepare(
    'DELETE FROM calendar_blocks WHERE booking_id = ?'
  ).bind(bookingId).run();
  
  const otherUserId = user.id === booking.renter_id ? booking.host_id : booking.renter_id;
  await c.env.DB.prepare(
    `INSERT INTO notifications (id, user_id, type, title, message, related_entity_type, related_entity_id, created_at)
     VALUES (?, ?, 'booking_cancelled', 'Booking Cancelled', 'The booking has been cancelled.', 'booking', ?, ?)`
  ).bind(ulid(), otherUserId, bookingId, now).run();
  
  const updated = await c.env.DB.prepare(
    'SELECT * FROM bookings WHERE id = ?'
  ).bind(bookingId).first<Booking>();
  
  return c.json({ booking: updated });
});

export default bookings;
