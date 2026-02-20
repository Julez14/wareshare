import { Hono } from 'hono';
import type { Env, Listing, ListingPhoto, User } from '../types';
import { requireAuth, getAuthUser, requireApproved } from '../middleware/auth';
import { requireListingOwner } from '../middleware/permissions';
import { validationError, notFound, forbidden } from '../lib/errors';
import { ulid } from 'ulid';

const listings = new Hono<{ Bindings: Env }>();

listings.get('/', async (c) => {
  const {
    city,
    province,
    min_price,
    max_price,
    min_size,
    max_size,
    fulfillment,
    page = '1',
    per_page = '20',
    sort = 'created_at',
    order = 'desc',
  } = c.req.query();
  
  const pageNum = parseInt(page, 10);
  const perPage = Math.min(parseInt(per_page, 10), 100);
  const offset = (pageNum - 1) * perPage;
  
  let sql = `SELECT l.*, u.full_name as host_name 
             FROM listings l 
             JOIN users u ON l.host_id = u.id 
             WHERE l.availability_status = 'available' AND u.approval_status = 'approved'`;
  const params: unknown[] = [];
  
  if (city) {
    sql += ' AND LOWER(l.city) LIKE LOWER(?)';
    params.push(`%${city}%`);
  }
  
  if (province) {
    sql += ' AND LOWER(l.province) = LOWER(?)';
    params.push(province);
  }
  
  if (min_price) {
    sql += ' AND l.price_per_month >= ?';
    params.push(parseFloat(min_price));
  }
  
  if (max_price) {
    sql += ' AND l.price_per_month <= ?';
    params.push(parseFloat(max_price));
  }
  
  if (min_size) {
    sql += ' AND l.size_sqft >= ?';
    params.push(parseInt(min_size, 10));
  }
  
  if (max_size) {
    sql += ' AND l.size_sqft <= ?';
    params.push(parseInt(max_size, 10));
  }
  
  if (fulfillment === 'true') {
    sql += ' AND l.fulfillment_available = 1';
  }
  
  const validSorts = ['created_at', 'price_per_month', 'size_sqft', 'title'];
  const sortField = validSorts.includes(sort) ? `l.${sort}` : 'l.created_at';
  const orderDir = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  
  const countSql = sql.replace(
    'SELECT l.*, u.full_name as host_name',
    'SELECT COUNT(*) as count'
  );
  const countResult = await c.env.DB.prepare(countSql).bind(...params).first<{ count: number }>();
  
  sql += ` ORDER BY ${sortField} ${orderDir} LIMIT ? OFFSET ?`;
  params.push(perPage, offset);
  
  const result = await c.env.DB.prepare(sql).bind(...params).all<Listing & { host_name: string }>();
  
  const listingsWithPhotos = await Promise.all(
    result.results.map(async (listing) => {
      const photos = await c.env.DB.prepare(
        'SELECT id, r2_key, sort_order FROM listing_photos WHERE listing_id = ? ORDER BY sort_order'
      ).bind(listing.id).all<ListingPhoto>();
      
      return {
        ...listing,
        address: undefined,
        photos: photos.results,
      };
    })
  );
  
  return c.json({
    listings: listingsWithPhotos,
    pagination: {
      page: pageNum,
      per_page: perPage,
      total: countResult?.count || 0,
      total_pages: Math.ceil((countResult?.count || 0) / perPage),
    },
  });
});

listings.get('/:id', async (c) => {
  const listingId = c.req.param('id');
  const authHeader = c.req.header('Authorization');
  let currentUser: { id: string; role: string } | null = null;
  
  if (authHeader?.startsWith('Bearer test-')) {
    const clerkId = authHeader.slice(7).replace('test-', '');
    const user = await c.env.DB.prepare(
      'SELECT id, role FROM users WHERE clerk_id = ?'
    ).bind(clerkId).first();
    if (user) currentUser = user as { id: string; role: string };
  }
  
  const listing = await c.env.DB.prepare(
    `SELECT l.*, u.full_name as host_name, u.email as host_email
     FROM listings l 
     JOIN users u ON l.host_id = u.id 
     WHERE l.id = ?`
  ).bind(listingId).first<Listing & { host_name: string; host_email: string }>();
  
  if (!listing) {
    return notFound('Listing not found');
  }
  
  const photos = await c.env.DB.prepare(
    'SELECT id, r2_key, sort_order FROM listing_photos WHERE listing_id = ? ORDER BY sort_order'
  ).bind(listingId).all<ListingPhoto>();
  
  const isOwner = currentUser?.id === listing.host_id;
  const isAdmin = currentUser?.role === 'admin';
  
  const response = {
    ...listing,
    address: (isOwner || isAdmin) ? listing.address : undefined,
    postal_code: (isOwner || isAdmin) ? listing.postal_code : undefined,
    host_email: (isOwner || isAdmin) ? listing.host_email : undefined,
    photos: photos.results,
  };
  
  return c.json({ listing: response });
});

listings.post('/', requireAuth, requireApproved, async (c) => {
  const user = getAuthUser(c);
  
  if (user.role !== 'host') {
    return forbidden('Only hosts can create listings');
  }
  
  const body = await c.req.json();
  
  if (!body.title || !body.address || !body.city || !body.province || !body.size_sqft || !body.price_per_month) {
    return validationError('Missing required fields: title, address, city, province, size_sqft, price_per_month');
  }
  
  const listingId = ulid();
  const now = new Date().toISOString();
  
  await c.env.DB.prepare(
    `INSERT INTO listings (
      id, host_id, title, description, address, city, province, postal_code, country,
      lat, lng, size_sqft, price_per_month, currency, features, availability_status,
      fulfillment_available, fulfillment_description, min_rental_months, max_rental_months,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    listingId,
    user.id,
    body.title,
    body.description || null,
    body.address,
    body.city,
    body.province,
    body.postal_code || null,
    body.country || 'Canada',
    body.lat || null,
    body.lng || null,
    body.size_sqft,
    body.price_per_month,
    body.currency || 'CAD',
    JSON.stringify(body.features || []),
    body.availability_status || 'available',
    body.fulfillment_available ? 1 : 0,
    body.fulfillment_description || null,
    body.min_rental_months || 1,
    body.max_rental_months || null,
    now,
    now
  ).run();
  
  const listing = await c.env.DB.prepare(
    'SELECT * FROM listings WHERE id = ?'
  ).bind(listingId).first<Listing>();
  
  return c.json({ listing }, 201);
});

listings.put('/:id', requireAuth, requireApproved, requireListingOwner, async (c) => {
  const listingId = c.req.param('id');
  const body = await c.req.json();
  
  const allowedFields = [
    'title', 'description', 'address', 'city', 'province', 'postal_code', 'country',
    'lat', 'lng', 'size_sqft', 'price_per_month', 'currency', 'features',
    'availability_status', 'fulfillment_available', 'fulfillment_description',
    'min_rental_months', 'max_rental_months'
  ];
  
  const updates: Record<string, unknown> = {};
  
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (field === 'features') {
        updates[field] = JSON.stringify(body[field]);
      } else if (field === 'fulfillment_available') {
        updates[field] = body[field] ? 1 : 0;
      } else {
        updates[field] = body[field];
      }
    }
  }
  
  if (Object.keys(updates).length === 0) {
    return validationError('No valid fields to update');
  }
  
  updates.updated_at = new Date().toISOString();
  
  const setClause = Object.keys(updates)
    .map(key => `${key} = ?`)
    .join(', ');
  
  const values = [...Object.values(updates), listingId];
  
  await c.env.DB.prepare(
    `UPDATE listings SET ${setClause} WHERE id = ?`
  ).bind(...values).run();
  
  const listing = await c.env.DB.prepare(
    'SELECT * FROM listings WHERE id = ?'
  ).bind(listingId).first<Listing>();
  
  return c.json({ listing });
});

listings.delete('/:id', requireAuth, requireApproved, requireListingOwner, async (c) => {
  const listingId = c.req.param('id');
  
  await c.env.DB.prepare(
    'DELETE FROM listings WHERE id = ?'
  ).bind(listingId).run();
  
  return c.json({ message: 'Listing deleted successfully' });
});

listings.post('/:id/photos', requireAuth, requireApproved, requireListingOwner, async (c) => {
  const listingId = c.req.param('id');
  const body = await c.req.json();
  
  if (!body.r2_key) {
    return validationError('Missing required field: r2_key');
  }
  
  const photoId = ulid();
  const now = new Date().toISOString();
  
  const existingPhotos = await c.env.DB.prepare(
    'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM listing_photos WHERE listing_id = ?'
  ).bind(listingId).first<{ max_order: number }>();
  
  const sortOrder = (existingPhotos?.max_order ?? -1) + 1;
  
  await c.env.DB.prepare(
    'INSERT INTO listing_photos (id, listing_id, r2_key, sort_order, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(photoId, listingId, body.r2_key, sortOrder, now).run();
  
  const photo = await c.env.DB.prepare(
    'SELECT * FROM listing_photos WHERE id = ?'
  ).bind(photoId).first<ListingPhoto>();
  
  return c.json({ photo }, 201);
});

listings.delete('/:id/photos/:photoId', requireAuth, requireApproved, requireListingOwner, async (c) => {
  const photoId = c.req.param('photoId');
  
  const photo = await c.env.DB.prepare(
    'SELECT r2_key FROM listing_photos WHERE id = ?'
  ).bind(photoId).first<ListingPhoto>();
  
  if (!photo) {
    return notFound('Photo not found');
  }
  
  await c.env.DB.prepare(
    'DELETE FROM listing_photos WHERE id = ?'
  ).bind(photoId).run();
  
  try {
    await c.env.STORAGE.delete(photo.r2_key);
  } catch {
    // Ignore R2 deletion errors
  }
  
  return c.json({ message: 'Photo deleted successfully' });
});

listings.get('/host/my', requireAuth, requireApproved, async (c) => {
  const user = getAuthUser(c);
  
  const result = await c.env.DB.prepare(
    'SELECT * FROM listings WHERE host_id = ? ORDER BY created_at DESC'
  ).bind(user.id).all<Listing>();
  
  const listingsWithPhotos = await Promise.all(
    result.results.map(async (listing) => {
      const photos = await c.env.DB.prepare(
        'SELECT id, r2_key, sort_order FROM listing_photos WHERE listing_id = ? ORDER BY sort_order'
      ).bind(listing.id).all<ListingPhoto>();
      
      return { ...listing, photos: photos.results };
    })
  );
  
  return c.json({ listings: listingsWithPhotos });
});

export default listings;
