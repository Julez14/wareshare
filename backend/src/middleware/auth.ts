import type { Context, Next } from 'hono';
import type { Env, AuthUser, User, ErrorCodeType } from '../types';
import { ErrorCode } from '../types';

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

export async function requireAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ 
      error: 'Missing or invalid authorization header', 
      code: ErrorCode.UNAUTHORIZED 
    }, 401);
  }

  const token = authHeader.slice(7);
  
  const mockUser = await getMockUserFromToken(c, token);
  
  if (!mockUser) {
    return c.json({ 
      error: 'Invalid or expired token', 
      code: ErrorCode.UNAUTHORIZED 
    }, 401);
  }

  c.set('user', mockUser);
  await next();
}

async function getMockUserFromToken(c: Context<{ Bindings: Env }>, token: string): Promise<AuthUser | null> {
  if (token.startsWith('test-')) {
    const clerkId = token.replace('test-', '');
    const result = await c.env.DB.prepare(
      'SELECT id, clerk_id, email, role, approval_status FROM users WHERE clerk_id = ?'
    ).bind(clerkId).first<User>();
    
    if (result) {
      return {
        id: result.id,
        clerk_id: result.clerk_id,
        email: result.email,
        role: result.role,
        approval_status: result.approval_status,
      };
    }
  }
  
  return null;
}

export function getAuthUser(c: Context<{ Bindings: Env }>): AuthUser {
  return c.get('user');
}

export async function requireApproved(c: Context<{ Bindings: Env }>, next: Next) {
  const user = getAuthUser(c);
  
  if (user.approval_status === 'pending') {
    return c.json({ 
      error: 'Your account is pending approval', 
      code: ErrorCode.PENDING_APPROVAL 
    }, 403);
  }
  
  if (user.approval_status === 'rejected') {
    return c.json({ 
      error: 'Your account has been rejected', 
      code: ErrorCode.REJECTED_ACCOUNT 
    }, 403);
  }
  
  await next();
}

export function requireRole(...roles: string[]) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const user = getAuthUser(c);
    
    if (!roles.includes(user.role)) {
      return c.json({ 
        error: 'You do not have permission to access this resource', 
        code: ErrorCode.FORBIDDEN 
      }, 403);
    }
    
    await next();
  };
}

export function optionalAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return requireAuth(c, next);
  }
  
  c.set('user', null as unknown as AuthUser);
  return next();
}
