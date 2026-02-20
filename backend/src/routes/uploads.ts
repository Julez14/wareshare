import { Hono } from 'hono';
import type { Env } from '../types';
import { requireAuth, getAuthUser, requireApproved } from '../middleware/auth';
import { validationError, forbidden } from '../lib/errors';
import { ulid } from 'ulid';

const uploads = new Hono<{ Bindings: Env }>();

uploads.use('/*', requireAuth);

uploads.post('/presigned-url', requireApproved, async (c) => {
  const user = getAuthUser(c);
  const body = await c.req.json();
  
  if (!body.filename || !body.type) {
    return validationError('Missing required fields: filename, type');
  }
  
  const validTypes = ['listing-photo', 'profile-photo', 'verification-doc'];
  if (!validTypes.includes(body.type)) {
    return validationError('Invalid type. Must be one of: listing-photo, profile-photo, verification-doc');
  }
  
  if (body.type === 'listing-photo' && user.role !== 'host') {
    return forbidden('Only hosts can upload listing photos');
  }
  
  if (body.type === 'verification-doc' && user.role !== 'admin') {
    return forbidden('Only admins can upload verification documents');
  }
  
  const ext = body.filename.split('.').pop() || 'jpg';
  const key = `${body.type}/${user.id}/${ulid()}.${ext}`;
  
  const url = await c.env.STORAGE.createSignedUrl(key, 3600, {
    httpMethod: 'PUT',
  });
  
  return c.json({
    upload_url: url,
    key,
    expires_in: 3600,
  });
});

uploads.post('/confirm', requireApproved, async (c) => {
  const user = getAuthUser(c);
  const body = await c.req.json();
  
  if (!body.key) {
    return validationError('Missing required field: key');
  }
  
  const object = await c.env.STORAGE.head(body.key);
  
  if (!object) {
    return validationError('File not found in storage. Make sure you uploaded to the signed URL.');
  }
  
  const publicUrl = `${body.key}`;
  
  return c.json({
    key: body.key,
    size: object.size,
    uploaded: true,
    url: publicUrl,
  });
});

uploads.delete('/:key', requireApproved, async (c) => {
  const user = getAuthUser(c);
  const key = c.req.param('key');
  
  if (!key.startsWith(`listing-photo/${user.id}/`) && 
      !key.startsWith(`profile-photo/${user.id}/`)) {
    return forbidden('You can only delete your own files');
  }
  
  await c.env.STORAGE.delete(key);
  
  return c.json({ message: 'File deleted successfully' });
});

uploads.get('/view/:key', async (c) => {
  const key = c.req.param('key');
  
  const object = await c.env.STORAGE.get(key);
  
  if (!object) {
    return c.json({ error: 'File not found' }, 404);
  }
  
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'max-age=31536000');
  
  return new Response(object.body, { headers });
});

export default uploads;
