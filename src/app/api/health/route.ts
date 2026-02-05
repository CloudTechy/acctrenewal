import { NextResponse } from 'next/server';

/**
 * Health Check Endpoint
 * Used by Docker healthcheck and monitoring systems
 */
export async function GET() {
  try {
    // Basic health check - can be extended with database connectivity checks
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.8', // Final test: webhook stays alive during deployment
    };

    return NextResponse.json(healthStatus, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
