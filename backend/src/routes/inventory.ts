import { Hono } from 'hono';
import type { Env, InventoryItem, ShipRequest, Booking } from '../types';
import { requireAuth, getAuthUser, requireApproved } from '../middleware/auth';
import { requireBookingParticipant, requireInventoryOwner, requireBookingRenter } from '../middleware/permissions';
import { validationError, notFound, forbidden } from '../lib/errors';
import { ulid } from 'ulid';

const inventory = new Hono<{ Bindings: Env }>();

inventory.use('/*', requireAuth);

inventory.get('/bookings/:bookingId/inventory', requireApproved, requireBookingParticipant, async (c) => {
  const bookingId = c.req.param('bookingId');
  
  const items = await c.env.DB.prepare(
    'SELECT * FROM inventory_items WHERE booking_id = ? ORDER BY created_at DESC'
  ).bind(bookingId).all<InventoryItem>();
  
  return c.json({ inventory: items.results });
});

inventory.post('/bookings/:bookingId/inventory', requireApproved, requireBookingRenter, async (c) => {
  const bookingId = c.req.param('bookingId');
  const user = getAuthUser(c);
  const body = await c.req.json();
  
  if (!body.name) {
    return validationError('Missing required field: name');
  }
  
  const booking = await c.env.DB.prepare(
    "SELECT id, status FROM bookings WHERE id = ? AND status NOT IN ('rejected', 'cancelled')"
  ).bind(bookingId).first<Booking>();
  
  if (!booking) {
    return notFound('Booking not found or is no longer active');
  }
  
  const itemId = ulid();
  const now = new Date().toISOString();
  
  await c.env.DB.prepare(
    `INSERT INTO inventory_items (
      id, booking_id, renter_id, name, type, sku, quantity, category,
      dimensions, weight_kg, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    itemId,
    bookingId,
    user.id,
    body.name,
    body.type || 'item',
    body.sku || null,
    body.quantity || 1,
    body.category || null,
    body.dimensions || null,
    body.weight_kg || null,
    body.notes || null,
    now,
    now
  ).run();
  
  const item = await c.env.DB.prepare(
    'SELECT * FROM inventory_items WHERE id = ?'
  ).bind(itemId).first<InventoryItem>();
  
  return c.json({ item }, 201);
});

inventory.put('/inventory/:inventoryId', requireApproved, requireInventoryOwner, async (c) => {
  const inventoryId = c.req.param('inventoryId');
  const body = await c.req.json();
  
  const allowedFields = ['name', 'type', 'sku', 'quantity', 'category', 'dimensions', 'weight_kg', 'notes'];
  const updates: Record<string, unknown> = {};
  
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }
  
  if (Object.keys(updates).length === 0) {
    return validationError('No valid fields to update');
  }
  
  updates.updated_at = new Date().toISOString();
  
  const setClause = Object.keys(updates)
    .map(key => `${key} = ?`)
    .join(', ');
  
  const values = [...Object.values(updates), inventoryId];
  
  await c.env.DB.prepare(
    `UPDATE inventory_items SET ${setClause} WHERE id = ?`
  ).bind(...values).run();
  
  const item = await c.env.DB.prepare(
    'SELECT * FROM inventory_items WHERE id = ?'
  ).bind(inventoryId).first<InventoryItem>();
  
  return c.json({ item });
});

inventory.delete('/inventory/:inventoryId', requireApproved, requireInventoryOwner, async (c) => {
  const inventoryId = c.req.param('inventoryId');
  
  await c.env.DB.prepare(
    'DELETE FROM inventory_items WHERE id = ?'
  ).bind(inventoryId).run();
  
  return c.json({ message: 'Inventory item deleted successfully' });
});

inventory.get('/bookings/:bookingId/ship-requests', requireApproved, requireBookingParticipant, async (c) => {
  const bookingId = c.req.param('bookingId');
  
  const requests = await c.env.DB.prepare(
    'SELECT * FROM ship_requests WHERE booking_id = ? ORDER BY created_at DESC'
  ).bind(bookingId).all<ShipRequest>();
  
  return c.json({ ship_requests: requests.results });
});

inventory.post('/bookings/:bookingId/ship-requests', requireApproved, async (c) => {
  const bookingId = c.req.param('bookingId');
  const user = getAuthUser(c);
  const body = await c.req.json();
  
  if (user.role !== 'renter') {
    return forbidden('Only renters can create ship requests');
  }
  
  const booking = await c.env.DB.prepare(
    "SELECT id, host_id, status FROM bookings WHERE id = ? AND renter_id = ? AND status IN ('confirmed', 'renter_accepted')"
  ).bind(bookingId, user.id).first<Booking>();
  
  if (!booking) {
    return notFound('Booking not found or you are not authorized');
  }
  
  const requestId = ulid();
  const now = new Date().toISOString();
  
  await c.env.DB.prepare(
    `INSERT INTO ship_requests (
      id, booking_id, renter_id, carrier_name, tracking_number,
      expected_arrival_date, description, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).bind(
    requestId,
    bookingId,
    user.id,
    body.carrier_name || null,
    body.tracking_number || null,
    body.expected_arrival_date || null,
    body.description || null,
    now,
    now
  ).run();
  
  await c.env.DB.prepare(
    `INSERT INTO notifications (id, user_id, type, title, message, related_entity_type, related_entity_id, created_at)
     VALUES (?, ?, 'ship_request_created', 'New Ship Request', ?, 'ship_request', ?, ?)`
  ).bind(ulid(), booking.host_id, body.description || 'A new ship request has been created.', requestId, now).run();
  
  const shipRequest = await c.env.DB.prepare(
    'SELECT * FROM ship_requests WHERE id = ?'
  ).bind(requestId).first<ShipRequest>();
  
  return c.json({ ship_request: shipRequest }, 201);
});

inventory.put('/ship-requests/:requestId/status', requireApproved, async (c) => {
  const requestId = c.req.param('requestId');
  const user = getAuthUser(c);
  const body = await c.req.json();
  
  if (!body.status || !['pending', 'acknowledged', 'received'].includes(body.status)) {
    return validationError('Invalid status. Must be: pending, acknowledged, or received');
  }
  
  const shipRequest = await c.env.DB.prepare(
    `SELECT sr.*, b.host_id, b.renter_id 
     FROM ship_requests sr 
     JOIN bookings b ON sr.booking_id = b.id 
     WHERE sr.id = ?`
  ).bind(requestId).first<ShipRequest & { host_id: string; renter_id: string }>();
  
  if (!shipRequest) {
    return notFound('Ship request not found');
  }
  
  if (user.id !== shipRequest.host_id) {
    return forbidden('Only the host can update ship request status');
  }
  
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { status: body.status, updated_at: now };
  
  if (body.status === 'acknowledged') {
    updates.acknowledged_at = now;
  } else if (body.status === 'received') {
    updates.received_at = now;
  }
  
  if (body.notes) {
    updates.notes = body.notes;
  }
  
  const setClause = Object.keys(updates)
    .map(key => `${key} = ?`)
    .join(', ');
  
  const values = [...Object.values(updates), requestId];
  
  await c.env.DB.prepare(
    `UPDATE ship_requests SET ${setClause} WHERE id = ?`
  ).bind(...values).run();
  
  await c.env.DB.prepare(
    `INSERT INTO notifications (id, user_id, type, title, message, related_entity_type, related_entity_id, created_at)
     VALUES (?, ?, 'ship_request_updated', 'Ship Request Updated', ?, 'ship_request', ?, ?)`
  ).bind(ulid(), shipRequest.renter_id, `Ship request status updated to: ${body.status}`, requestId, now).run();
  
  const updated = await c.env.DB.prepare(
    'SELECT * FROM ship_requests WHERE id = ?'
  ).bind(requestId).first<ShipRequest>();
  
  return c.json({ ship_request: updated });
});

export default inventory;
