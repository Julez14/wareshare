import { Hono } from 'hono';
import type { Env, User } from '../types';
import { requireAuth, getAuthUser, requireApproved } from '../middleware/auth';
import { validationError, notFound } from '../lib/errors';
import { ulid } from 'ulid';

const users = new Hono<{ Bindings: Env }>();

users.use('/*', requireAuth);

users.get('/me', async (c) => {
  const authUser = getAuthUser(c);
  
  const user = await c.env.DB.prepare(
    `SELECT id, clerk_id, email, full_name, role, approval_status, 
            business_reg_number, website, address, city, province, 
            postal_code, phone, profile_photo_key, created_at, updated_at
     FROM users WHERE id = ?`
  ).bind(authUser.id).first<User>();
  
  if (!user) {
    return notFound('User not found');
  }
  
  return c.json({ user });
});

users.put('/me', requireApproved, async (c) => {
  const authUser = getAuthUser(c);
  const body = await c.req.json();
  
  const allowedFields = [
    'full_name', 'business_reg_number', 'website', 
    'address', 'city', 'province', 'postal_code', 'phone'
  ];
  
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
  
  const values = [...Object.values(updates), authUser.id];
  
  await c.env.DB.prepare(
    `UPDATE users SET ${setClause} WHERE id = ?`
  ).bind(...values).run();
  
  const user = await c.env.DB.prepare(
    `SELECT id, clerk_id, email, full_name, role, approval_status, 
            business_reg_number, website, address, city, province, 
            postal_code, phone, created_at, updated_at
     FROM users WHERE id = ?`
  ).bind(authUser.id).first<User>();
  
  return c.json({ user });
});

users.post('/sync', async (c) => {
  const body = await c.req.json();
  
  if (!body.clerk_id || !body.email || !body.full_name || !body.role) {
    return validationError('Missing required fields: clerk_id, email, full_name, role');
  }
  
  if (!['renter', 'host'].includes(body.role)) {
    return validationError('Role must be either "renter" or "host"');
  }
  
  const existingUser = await c.env.DB.prepare(
    'SELECT id FROM users WHERE clerk_id = ?'
  ).bind(body.clerk_id).first();
  
  if (existingUser) {
    const user = await c.env.DB.prepare(
      `SELECT id, clerk_id, email, full_name, role, approval_status, created_at
       FROM users WHERE clerk_id = ?`
    ).bind(body.clerk_id).first<User>();
    
    return c.json({ user, isNew: false });
  }
  
  const userId = ulid();
  const now = new Date().toISOString();
  
  await c.env.DB.prepare(
    `INSERT INTO users (id, clerk_id, email, full_name, role, approval_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).bind(userId, body.clerk_id, body.email, body.full_name, body.role, now, now).run();
  
  const user = await c.env.DB.prepare(
    `SELECT id, clerk_id, email, full_name, role, approval_status, created_at
     FROM users WHERE id = ?`
  ).bind(userId).first<User>();
  
  return c.json({ user, isNew: true }, 201);
});

export default users;
