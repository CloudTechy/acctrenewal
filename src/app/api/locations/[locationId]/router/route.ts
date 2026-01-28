import { NextResponse, NextRequest } from 'next/server'
import { 
  getRouterConfig, 
  createRouterConfig, 
  updateRouterConfig
} from '@/lib/database'
import { validateApiKey, unauthorizedResponse } from '@/lib/auth-middleware'
import { validateIpAddress, validatePort, sanitizeRouterPassword } from '@/lib/security'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    // Require API key authentication
    if (!validateApiKey(request)) {
      return unauthorizedResponse('API key required to access router configuration');
    }

    const { locationId } = await params
    const config = await getRouterConfig(locationId)
    
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Router configuration not found' },
        { status: 404 }
      )
    }

    // SECURITY FIX: Never expose password in API response
    // Remove password field before returning
    const safeConfig = {
      ...config,
      password: '***REDACTED***' // Hide password for security
    }

    return NextResponse.json({
      success: true,
      data: safeConfig
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in GET /api/locations/[locationId]/router:', errorMessage)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    // Require API key authentication
    if (!validateApiKey(request)) {
      return unauthorizedResponse('API key required to create router configuration');
    }

    const { locationId } = await params
    const body = await request.json()
    
    // Validate inputs
    try {
      validateIpAddress(body.host);
      if (body.port) validatePort(body.port);
      if (body.api_port) validatePort(body.api_port);
      sanitizeRouterPassword(body.password);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid input';
      return NextResponse.json(
        { success: false, error: `Validation error: ${errorMessage}` },
        { status: 400 }
      );
    }
    
    const config = await createRouterConfig(locationId, {
      host: body.host,
      username: body.username,
      password: body.password, // Stored in plain text currently; encryption available in security.ts
      port: body.port,
      api_port: body.api_port,
      connection_type: body.connection_type
    })

    // Hide password in response
    const safeConfig = {
      ...config,
      password: '***REDACTED***'
    }

    return NextResponse.json({
      success: true,
      data: safeConfig
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in POST /api/locations/[locationId]/router:', errorMessage)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    // Require API key authentication
    if (!validateApiKey(request)) {
      return unauthorizedResponse('API key required to update router configuration');
    }

    const { locationId } = await params
    const body = await request.json()
    
    // Validate inputs
    try {
      if (body.host) validateIpAddress(body.host);
      if (body.port) validatePort(body.port);
      if (body.api_port) validatePort(body.api_port);
      if (body.password) sanitizeRouterPassword(body.password);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid input';
      return NextResponse.json(
        { success: false, error: `Validation error: ${errorMessage}` },
        { status: 400 }
      );
    }
    
    const config = await updateRouterConfig(locationId, {
      host: body.host,
      username: body.username,
      password: body.password, // Stored in plain text currently; encryption available in security.ts
      port: body.port,
      api_port: body.api_port,
      connection_type: body.connection_type
    })

    // Hide password in response
    const safeConfig = {
      ...config,
      password: '***REDACTED***'
    }

    return NextResponse.json({
      success: true,
      data: safeConfig
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in PUT /api/locations/[locationId]/router:', errorMessage)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 