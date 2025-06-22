import { NextResponse } from 'next/server'
import { 
  getAllHotspotLocations, 
  createHotspotLocation
} from '@/lib/database'

export async function GET() {
  try {
    const locations = await getAllHotspotLocations()
    
    return NextResponse.json({
      success: true,
      data: locations
    })
  } catch (error) {
    console.error('Error in GET /api/locations:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch locations' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      id, 
      name, 
      display_name, 
      description, 
      address, 
      city, 
      state, 
      status = 'inactive',
      group_id,
      default_owner_id,
      registration_enabled,
      // New customization fields
      welcome_message,
      brand_color_primary,
      brand_color_secondary,
      contact_phone,
      contact_email,
      features
    } = body

    if (!id || !name || !display_name) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: id, name, display_name' },
        { status: 400 }
      )
    }

    const locationData = {
      id: id.toLowerCase().replace(/\s+/g, '-'),
      name,
      display_name,
      description,
      address,
      city,
      state,
      status,
      is_active: true,
      group_id,
      default_owner_id,
      registration_enabled,
      // New customization fields
      welcome_message,
      brand_color_primary,
      brand_color_secondary,
      contact_phone,
      contact_email,
      features
    }

    const location = await createHotspotLocation(locationData)

    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Failed to create location' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: location
    })
  } catch (error) {
    console.error('Error in POST /api/locations:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create location' },
      { status: 500 }
    )
  }
} 