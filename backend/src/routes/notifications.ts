import { Hono } from 'hono';
import type { Env, Notification, BookingMessage, Booking } from '../types';
import { requireAuth, getAuthUser, requireApproved } from '../middleware/auth';
import { requireBookingParticipant } from '../middleware/permissions';
import { validationError, notFound } from '../lib/errors';
import { ulid } from 'ulid';

const notifications = new Hono<{ Bindings: Env }>();

notifications.use('/*', requireAuth);

notifications.get('/', requireApproved, async (c) => {
  const user = getAuthUser(c);
  const { unread_only, page = '1', per_page = '20' } = c.req.query();
  
  const pageNum = parseInt(page, 10);
  const perPage = Math.min(parseInt(per_page, 10), 100);
  const offset = (pageNum - 1) * perPage;
  
  let sql = 'SELECT * FROM notifications WHERE user_id = ?';
  const params: unknown[] = [user.id];
  
  if (unread_only === 'true') {
    sql += ' AND is_read = 0';
  }
  
  const countResult = await c.env.DB.prepare(
    sql.replace('SELECT *', 'SELECT COUNT(*) as count')
  ).bind(...params).first<{ count: number }>();
  
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(perPage, offset);
  
  const result = await c.env.DB.prepare(sql).bind(...params).all<Notification>();
  
  return c.json({
    notifications: result.results,
    pagination: {
      page: pageNum,
      per_page: perPage,
      total: countResult?.count || 0,
      total_pages: Math.ceil((countResult?.count || 0) / perPage),
    },
  });
});

notifications.post('/read', requireApproved, async (c) => {
  const user = getAuthUser(c);
  const body = await c.req.json();
  
  if (body.notification_ids && Array.isArray(body.notification_ids)) {
    const placeholders = body.notification_ids.map(() => '?').join(',');
    await c.env.DB.prepare(
      `UPDATE notifications SET is_read = 1 WHERE id IN (${placeholders}) AND user_id = ?`
    ).bind(...body.notification_ids, user.id).run();
  } else if (body.read_all) {
    await c.env.DB.prepare(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?'
    ).bind(user.id).run();
  } else {
    return validationError('Provide either notification_ids array or read_all: true');
  }
  
  return c.json({ message: 'Notifications marked as read' });
});

notifications.get('/unread-count', requireApproved, async (c) => {
  const user = getAuthUser(c);
  
  const result = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
  ).bind(user.id).first<{ count: number }>();
  
  return c.json({ unread_count: result?.count || 0 });
});

const messages = new Hono<{ Bindings: Env }>();

messages.use('/*', requireAuth);

messages.get('/bookings/:id/messages', requireApproved, requireBookingParticipant, async (c) => {
  const bookingId = c.req.param('id');
  const { page = '1', per_page = '50' } = c.req.query();
  
  const pageNum = parseInt(page, 10);
  const perPage = Math.min(parseInt(per_page, 10), 100);
  const offset = (pageNum - 1) * perPage;
  
  const countResult = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM booking_messages WHERE booking_id = ?'
  ).bind(bookingId).first<{ count: number }>();
  
  const result = await c.env.DB.prepare(
    `SELECT bm.*, u.full_name as sender_name, u.role as sender_role
     FROM booking_messages bm
     JOIN users u ON bm.sender_id = u.id
     WHERE bm.booking_id = ?
     ORDER BY bm.created_at ASC
     LIMIT ? OFFSET ?`
  ).bind(bookingId, perPage, offset).all<BookingMessage & { sender_name: string; sender_role: string }>();
  
  return c.json({
    messages: result.results,
    pagination: {
      page: pageNum,
      per_page: perPage,
      total: countResult?.count || 0,
      total_pages: Math.ceil((countResult?.count || 0) / perPage),
    },
  });
});

messages.post('/bookings/:id/messages', requireApproved, requireBookingParticipant, async (c) => {
  const bookingId = c.req.param('id');
  const user = getAuthUser(c);
  const body = await c.req.json();
  
  if (!body.content || typeof body.content !== 'string' || body.content.trim().length === 0) {
    return validationError('Message content is required');
  }
  
  const booking = await c.env.DB.prepare(
    'SELECT renter_id, host_id FROM bookings WHERE id = ?'
  ).bind(bookingId).first<Booking>();
  
  if (!booking) {
    return notFound('Booking not found');
  }
  
  const messageId = ulid();
  const now = new Date().toISOString();
  
  await c.env.DB.prepare(
    'INSERT INTO booking_messages (id, booking_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(messageId, bookingId, user.id, body.content.trim(), now).run();
  
  const recipientId = user.id === booking.renter_id ? booking.host_id : booking.renter_id;
  
  await c.env.DB.prepare(
    `INSERT INTO notifications (id, user_id, type, title, message, related_entity_type, related_entity_id, created_at)
     VALUES (?, ?, 'message_received', 'New Message', ?, 'booking', ?, ?)`
  ).bind(ulid(), recipientId, body.content.trim().substring(0, 100), bookingId, now).run();
  
  const message = await c.env.DB.prepare(
    `SELECT bm.*, u.full_name as sender_name, u.role as sender_role
     FROM booking_messages bm
     JOIN users u ON bm.sender_id = u.id
     WHERE bm.id = ?`
  ).bind(messageId).first<BookingMessage & { sender_name: string; sender_role: string }>();
  
  return c.json({ message }, 201);
});

export { notifications, messages };
