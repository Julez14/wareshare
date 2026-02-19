import type { Context, Next } from 'hono';
import type { Env } from '../types';
import { getAuthUser } from './auth';

export async function requireListingOwner(c: Context<{ Bindings: Env }>, next: Next) {
  const user = getAuthUser(c);
  const listingId = c.req.param('id');
  
  const listing = await c.env.DB.prepare(
    'SELECT host_id FROM listings WHERE id = ?'
  ).bind(listingId).first<{ host_id: string }>();
  
  if (!listing) {
    return c.json({ error: 'Listing not found', code: 'NOT_FOUND' }, 404);
  }
  
  if (listing.host_id !== user.id) {
    return c.json({ 
      error: 'You do not have permission to modify this listing', 
      code: 'FORBIDDEN' 
    }, 403);
  }
  
  await next();
}

export async function requireBookingParticipant(c: Context<{ Bindings: Env }>, next: Next) {
  const user = getAuthUser(c);
  const bookingId = c.req.param('id') || c.req.param('bookingId');
  
  const booking = await c.env.DB.prepare(
    'SELECT renter_id, host_id FROM bookings WHERE id = ?'
  ).bind(bookingId).first<{ renter_id: string; host_id: string }>();
  
  if (!booking) {
    return c.json({ error: 'Booking not found', code: 'NOT_FOUND' }, 404);
  }
  
  if (booking.renter_id !== user.id && booking.host_id !== user.id) {
    return c.json({ 
      error: 'You do not have access to this booking', 
      code: 'FORBIDDEN' 
    }, 403);
  }
  
  await next();
}

export async function requireBookingHost(c: Context<{ Bindings: Env }>, next: Next) {
  const user = getAuthUser(c);
  const bookingId = c.req.param('id');
  
  const booking = await c.env.DB.prepare(
    'SELECT host_id FROM bookings WHERE id = ?'
  ).bind(bookingId).first<{ host_id: string }>();
  
  if (!booking) {
    return c.json({ error: 'Booking not found', code: 'NOT_FOUND' }, 404);
  }
  
  if (booking.host_id !== user.id) {
    return c.json({ 
      error: 'Only the host can perform this action', 
      code: 'FORBIDDEN' 
    }, 403);
  }
  
  await next();
}

export async function requireBookingRenter(c: Context<{ Bindings: Env }>, next: Next) {
  const user = getAuthUser(c);
  const bookingId = c.req.param('id') || c.req.param('bookingId');
  
  const booking = await c.env.DB.prepare(
    'SELECT renter_id FROM bookings WHERE id = ?'
  ).bind(bookingId).first<{ renter_id: string }>();
  
  if (!booking) {
    return c.json({ error: 'Booking not found', code: 'NOT_FOUND' }, 404);
  }
  
  if (booking.renter_id !== user.id) {
    return c.json({ 
      error: 'Only the renter can perform this action', 
      code: 'FORBIDDEN' 
    }, 403);
  }
  
  await next();
}

export async function requireInventoryOwner(c: Context<{ Bindings: Env }>, next: Next) {
  const user = getAuthUser(c);
  const inventoryId = c.req.param('inventoryId');
  
  const item = await c.env.DB.prepare(
    'SELECT renter_id FROM inventory_items WHERE id = ?'
  ).bind(inventoryId).first<{ renter_id: string }>();
  
  if (!item) {
    return c.json({ error: 'Inventory item not found', code: 'NOT_FOUND' }, 404);
  }
  
  if (item.renter_id !== user.id) {
    return c.json({ 
      error: 'You do not have permission to modify this inventory item', 
      code: 'FORBIDDEN' 
    }, 403);
  }
  
  await next();
}
