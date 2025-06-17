import { NextResponse } from 'next/server'
import { 
  getRouterConfig, 
  createRouterConfig, 
  updateRouterConfig
} from '@/lib/database'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params
    const config = await getRouterConfig(locationId)
    
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Router configuration not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: config // Return full config including plain text password
    })
  } catch (error) {
    console.error('Error in GET /api/locations/[locationId]/router:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params
    const body = await request.json()
    
    const config = await createRouterConfig(locationId, {
      host: body.host,
      username: body.username,
      password: body.password, // Store plain text password
      port: body.port,
      api_port: body.api_port,
      connection_type: body.connection_type
    })

    return NextResponse.json({
      success: true,
      data: config
    })
  } catch (error) {
    console.error('Error in POST /api/locations/[locationId]/router:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params
    const body = await request.json()
    
    const config = await updateRouterConfig(locationId, {
      host: body.host,
      username: body.username,
      password: body.password, // Store plain text password
      port: body.port,
      api_port: body.api_port,
      connection_type: body.connection_type
    })

    return NextResponse.json({
      success: true,
      data: config
    })
  } catch (error) {
    console.error('Error in PUT /api/locations/[locationId]/router:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 