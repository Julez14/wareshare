import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import users from './routes/users';
import admin from './routes/admin';
import listings from './routes/listings';
import bookings from './routes/bookings';
import inventory from './routes/inventory';
import { notifications, messages } from './routes/notifications';
import uploads from './routes/uploads';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));

app.get('/', (c) => {
  return c.json({
    name: 'WareShare API',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      admin: '/api/admin',
      listings: '/api/listings',
      bookings: '/api/bookings',
      inventory: '/api/inventory',
      notifications: '/api/notifications',
      messages: '/api/messages',
      uploads: '/api/uploads',
    },
  });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.route('/api/users', users);
app.route('/api/admin', admin);
app.route('/api/listings', listings);
app.route('/api/bookings', bookings);
app.route('/api', inventory);
app.route('/api/notifications', notifications);
app.route('/api', messages);
app.route('/api/uploads', uploads);

app.notFound((c) => {
  return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404);
});

app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({ 
    error: 'Internal server error', 
    code: 'INTERNAL_ERROR',
    message: c.env.ENVIRONMENT === 'development' ? err.message : undefined,
  }, 500);
});

export default app;
