import { Hono } from 'hono';
import type { Env, User, Listing, Booking } from '../types';
import { requireAuth, getAuthUser, requireRole } from '../middleware/auth';
import { validationError, notFound } from '../lib/errors';
import { ulid } from 'ulid';

const admin = new Hono<{ Bindings: Env }>();

admin.use('/*', requireAuth);
admin.use('/*', requireRole('admin'));

admin.get('/users', async (c) => {
  const { role, approval_status, page = '1', per_page = '20' } = c.req.query();
  
  const pageNum = parseInt(page, 10);
  const perPage = Math.min(parseInt(per_page, 10), 100);
  const offset = (pageNum - 1) * perPage;
  
  let sql = 'SELECT * FROM users WHERE 1=1';
  const params: unknown[] = [];
  
  if (role) {
    sql += ' AND role = ?';
    params.push(role);
  }
  
  if (approval_status) {
    sql += ' AND approval_status = ?';
    params.push(approval_status);
  }
  
  const countResult = await c.env.DB.prepare(
    sql.replace('SELECT *', 'SELECT COUNT(*) as count')
  ).bind(...params).first<{ count: number }>();
  
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(perPage, offset);
  
  const result = await c.env.DB.prepare(sql).bind(...params).all<User>();
  
  return c.json({
    users: result.results,
    pagination: {
      page: pageNum,
      per_page: perPage,
      total: countResult?.count || 0,
      total_pages: Math.ceil((countResult?.count || 0) / perPage),
    },
  });
});

admin.get('/users/:id', async (c) => {
  const userId = c.req.param('id');
  
  const user = await c.env.DB.prepare(
    `SELECT id, clerk_id, email, full_name, role, approval_status,
            business_reg_number, website, address, city, province,
            postal_code, phone, verification_doc_key, created_at, updated_at
     FROM users WHERE id = ?`
  ).bind(userId).first<User>();
  
  if (!user) {
    return notFound('User not found');
  }
  
  return c.json({ user });
});

admin.post('/users/:id/approve', async (c) => {
  const userId = c.req.param('id');
  const now = new Date().toISOString();
  
  const existing = await c.env.DB.prepare(
    'SELECT id, approval_status FROM users WHERE id = ?'
  ).bind(userId).first<User>();
  
  if (!existing) {
    return notFound('User not found');
  }
  
  if (existing.approval_status === 'approved') {
    return c.json({ message: 'User already approved', user: existing });
  }
  
  await c.env.DB.prepare(
    "UPDATE users SET approval_status = 'approved', updated_at = ? WHERE id = ?"
  ).bind(now, userId).run();
  
  await c.env.DB.prepare(
    `INSERT INTO notifications (id, user_id, type, title, message, created_at)
     VALUES (?, ?, 'account_approved', 'Account Approved', 'Your WareShare account has been approved. You can now access all platform features.', ?)`
  ).bind(ulid(), userId, now).run();
  
  const user = await c.env.DB.prepare(
    'SELECT id, clerk_id, email, full_name, role, approval_status, updated_at FROM users WHERE id = ?'
  ).bind(userId).first<User>();
  
  return c.json({ message: 'User approved successfully', user });
});

admin.post('/users/:id/reject', async (c) => {
  const userId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const now = new Date().toISOString();
  
  const existing = await c.env.DB.prepare(
    'SELECT id, approval_status FROM users WHERE id = ?'
  ).bind(userId).first<User>();
  
  if (!existing) {
    return notFound('User not found');
  }
  
  if (existing.approval_status === 'rejected') {
    return c.json({ message: 'User already rejected', user: existing });
  }
  
  await c.env.DB.prepare(
    "UPDATE users SET approval_status = 'rejected', updated_at = ? WHERE id = ?"
  ).bind(now, userId).run();
  
  const message = body.reason 
    ? `Your WareShare account application has been declined. Reason: ${body.reason}`
    : 'Your WareShare account application has been declined.';
  
  await c.env.DB.prepare(
    `INSERT INTO notifications (id, user_id, type, title, message, created_at)
     VALUES (?, ?, 'account_rejected', 'Account Application Declined', ?, ?)`
  ).bind(ulid(), userId, message, now).run();
  
  const user = await c.env.DB.prepare(
    'SELECT id, clerk_id, email, full_name, role, approval_status, updated_at FROM users WHERE id = ?'
  ).bind(userId).first<User>();
  
  return c.json({ message: 'User rejected', user });
});

admin.get('/metrics', async (c) => {
  // Users
  const totalUsers = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM users'
  ).first<{ count: number }>();

  const usersByRole = await c.env.DB.prepare(
    'SELECT role, COUNT(*) as count FROM users GROUP BY role'
  ).all<{ role: string; count: number }>();

  const pendingApproval = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM users WHERE approval_status = 'pending'"
  ).first<{ count: number }>();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const newLast30Days = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM users WHERE created_at >= ?'
  ).bind(thirtyDaysAgo).first<{ count: number }>();

  // Listings
  const totalListings = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM listings'
  ).first<{ count: number }>();

  const listingsByAvailability = await c.env.DB.prepare(
    'SELECT availability_status, COUNT(*) as count FROM listings GROUP BY availability_status'
  ).all<{ availability_status: string; count: number }>();

  // Bookings
  const totalBookings = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM bookings'
  ).first<{ count: number }>();

  const bookingsByStatus = await c.env.DB.prepare(
    'SELECT status, COUNT(*) as count FROM bookings GROUP BY status'
  ).all<{ status: string; count: number }>(); 

  const bookingStatusMap = bookingsByStatus.results.reduce((acc, { status, count }) => {
    acc[status] = count;
    return acc;
  }, {} as Record<string, number>);

  const confirmedCount = bookingStatusMap['confirmed'] || 0;
  const inProgressCount =
    (bookingStatusMap['agreement_draft'] || 0) +
    (bookingStatusMap['host_edited'] || 0) +
    (bookingStatusMap['renter_accepted'] || 0);
  const total = totalBookings?.count || 0;
  const confirmationRate = total > 0 ? Math.round((confirmedCount / total) * 100) : 0;

  // Revenue (simulated: monthly_rate * duration in months for confirmed bookings)
  const revenueResult = await c.env.DB.prepare(
    `SELECT
       SUM(
         monthly_rate * MAX(1, ROUND(
           (julianday(end_date) - julianday(start_date)) / 30.0
         ))
       ) as total,
       AVG(
         monthly_rate * MAX(1, ROUND(
           (julianday(end_date) - julianday(start_date)) / 30.0
         ))
       ) as average
     FROM bookings WHERE status = 'confirmed'`
  ).first<{ total: number | null; average: number | null }>();

  // Top cities by listing count
  const topCities = await c.env.DB.prepare(
    `SELECT city, province, COUNT(*) as listing_count
     FROM listings
     GROUP BY city, province
     ORDER BY listing_count DESC
     LIMIT 5`
  ).all<{ city: string; province: string; listing_count: number }>();

  // Demand profile
  const avgRentalDuration = await c.env.DB.prepare(
    `SELECT ROUND(AVG(julianday(end_date) - julianday(start_date))) as avg_days
     FROM bookings WHERE status = 'confirmed'`
  ).first<{ avg_days: number | null }>();

  const avgSpaceRequested = await c.env.DB.prepare(
    `SELECT ROUND(AVG(space_requested_sqft)) as avg_sqft
     FROM bookings WHERE space_requested_sqft IS NOT NULL`
  ).first<{ avg_sqft: number | null }>();

  const bookingsByServiceType = await c.env.DB.prepare(
    `SELECT l.fulfillment_available, COUNT(*) as count
     FROM bookings b
     JOIN listings l ON b.listing_id = l.id
     GROUP BY l.fulfillment_available`
  ).all<{ fulfillment_available: number; count: number }>();

  const serviceTypeMap = bookingsByServiceType.results.reduce((acc, { fulfillment_available, count }) => {
    if (fulfillment_available === 1) acc.fulfillment = count;
    else acc.storage_only = count;
    return acc;
  }, { fulfillment: 0, storage_only: 0 } as { fulfillment: number; storage_only: number });

  // Vacancy
  const avgDaysUntilFirstBooking = await c.env.DB.prepare(
    `SELECT ROUND(AVG(
       julianday(first_confirmed.min_confirmed_at) - julianday(l.created_at)
     )) as avg_days
     FROM listings l
     JOIN (
       SELECT listing_id, MIN(confirmed_at) as min_confirmed_at
       FROM bookings
       WHERE status = 'confirmed' AND confirmed_at IS NOT NULL
       GROUP BY listing_id
     ) first_confirmed ON l.id = first_confirmed.listing_id`
  ).first<{ avg_days: number | null }>();

  const listingsNeverBooked = await c.env.DB.prepare(
    `SELECT COUNT(*) as count
     FROM listings l
     WHERE NOT EXISTS (
       SELECT 1 FROM bookings b
       WHERE b.listing_id = l.id AND b.status = 'confirmed'
     )`
  ).first<{ count: number }>();

  return c.json({
    users: {
      total: totalUsers?.count || 0,
      by_role: usersByRole.results.reduce((acc, { role, count }) => {
        acc[role] = count;
        return acc;
      }, {} as Record<string, number>),
      pending_approval: pendingApproval?.count || 0,
      new_last_30_days: newLast30Days?.count || 0,
    },
    listings: {
      total: totalListings?.count || 0,
      by_availability: listingsByAvailability.results.reduce((acc, { availability_status, count }) => {
        acc[availability_status] = count;
        return acc;
      }, {} as Record<string, number>),
    },
    bookings: {
      total,
      by_status: bookingStatusMap,
      confirmed: confirmedCount,
      in_progress: inProgressCount,
      confirmation_rate: confirmationRate,
    },
    revenue: {
      total_contracted_cad: Math.round(revenueResult?.total || 0),
      average_booking_value_cad: Math.round(revenueResult?.average || 0),
    },
    top_cities: topCities.results,
    demand: {
      avg_rental_duration_days: avgRentalDuration?.avg_days ?? null,
      avg_space_requested_sqft: avgSpaceRequested?.avg_sqft ?? null,
      bookings_by_service_type: serviceTypeMap,
    },
    vacancy: {
      avg_days_until_first_booking: avgDaysUntilFirstBooking?.avg_days ?? null,
      listings_never_booked: listingsNeverBooked?.count ?? 0,
    },
  });
});

admin.get('/stats', async (c) => {
  const usersByRole = await c.env.DB.prepare(
    'SELECT role, COUNT(*) as count FROM users GROUP BY role'
  ).all<{ role: string; count: number }>();
  
  const usersByStatus = await c.env.DB.prepare(
    'SELECT approval_status, COUNT(*) as count FROM users GROUP BY approval_status'
  ).all<{ approval_status: string; count: number }>();
  
  const bookingsByStatus = await c.env.DB.prepare(
    'SELECT status, COUNT(*) as count FROM bookings GROUP BY status'
  ).all<{ status: string; count: number }>();
  
  const listingsByStatus = await c.env.DB.prepare(
    'SELECT availability_status, COUNT(*) as count FROM listings GROUP BY availability_status'
  ).all<{ availability_status: string; count: number }>();
  
  const totalListings = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM listings'
  ).first<{ count: number }>();
  
  const totalBookings = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM bookings'
  ).first<{ count: number }>();
  
  return c.json({
    users: {
      by_role: usersByRole.results.reduce((acc, { role, count }) => {
        acc[role] = count;
        return acc;
      }, {} as Record<string, number>),
      by_approval_status: usersByStatus.results.reduce((acc, { approval_status, count }) => {
        acc[approval_status] = count;
        return acc;
      }, {} as Record<string, number>),
    },
    listings: {
      total: totalListings?.count || 0,
      by_availability: listingsByStatus.results.reduce((acc, { availability_status, count }) => {
        acc[availability_status] = count;
        return acc;
      }, {} as Record<string, number>),
    },
    bookings: {
      total: totalBookings?.count || 0,
      by_status: bookingsByStatus.results.reduce((acc, { status, count }) => {
        acc[status] = count;
        return acc;
      }, {} as Record<string, number>),
    },
  });
});

export default admin;
