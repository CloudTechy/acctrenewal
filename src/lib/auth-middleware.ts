/**
 * Authentication middleware for API routes
 * Protects sensitive endpoints from unauthorized access
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple API key authentication
 * In production, use proper JWT tokens or session-based auth
 */
export function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  const validApiKey = process.env.API_SECRET_KEY;
  
  if (!validApiKey) {
    console.error('API_SECRET_KEY not configured - API endpoints are not protected!');
    return false;
  }
  
  return apiKey === validApiKey;
}

/**
 * Validate Paystack webhook IP addresses
 * Paystack webhooks come from specific IP ranges
 */
const PAYSTACK_IP_WHITELIST = [
  '52.31.139.75',
  '52.49.173.169',
  '52.214.14.220',
  // Add more Paystack IPs as needed
];

export function validateWebhookSource(request: NextRequest): boolean {
  // Check if webhook IP validation is enabled
  const enforceIpWhitelist = process.env.ENFORCE_WEBHOOK_IP_WHITELIST === 'true';
  
  if (!enforceIpWhitelist) {
    // If not enforced, allow all (but log warning)
    console.warn('Webhook IP whitelist not enforced - consider enabling for production');
    return true;
  }
  
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                   request.headers.get('x-real-ip') ||
                   'unknown';
  
  if (clientIp === 'unknown') {
    console.warn('Could not determine client IP for webhook request');
    return false;
  }
  
  const isWhitelisted = PAYSTACK_IP_WHITELIST.includes(clientIp);
  
  if (!isWhitelisted) {
    console.error(`Webhook request from non-whitelisted IP: ${clientIp}`);
  }
  
  return isWhitelisted;
}

/**
 * Create an error response for unauthorized access
 */
export function unauthorizedResponse(reason: string = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { success: false, error: reason },
    { status: 401 }
  );
}

/**
 * Create an error response for forbidden access
 */
export function forbiddenResponse(reason: string = 'Forbidden'): NextResponse {
  return NextResponse.json(
    { success: false, error: reason },
    { status: 403 }
  );
}

/**
 * Create an error response for rate limit exceeded
 */
export function rateLimitResponse(retryAfter: number = 60): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Rate limit exceeded', retry_after: retryAfter },
    { 
      status: 429,
      headers: {
        'Retry-After': String(retryAfter)
      }
    }
  );
}
