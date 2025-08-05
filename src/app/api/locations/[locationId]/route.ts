import { NextResponse } from 'next/server'
import { 
  getHotspotLocation, 
  updateHotspotLocation, 
  deleteHotspotLocation,
  HotspotLocation 
} from '@/lib/database'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params
    const location = await getHotspotLocation(locationId)
    
    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: location
    })
  } catch (error) {
    console.error('Error in GET /api/locations/[locationId]:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch location' },
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
    const { 
      name, 
      display_name, 
      description, 
      address, 
      city, 
      state, 
      status,
      group_id,
      default_owner_id,
      registration_enabled,
      welcome_message,
      brand_color_primary,
      brand_color_secondary,
      contact_phone,
      contact_email,
      features,
      show_logo,
      show_location_badge,
      show_display_name,
      show_welcome_message,
      show_description,
      show_guest_access,
      show_pin_display
    } = body

    const updateData: Partial<HotspotLocation> = {}
    if (name) updateData.name = name
    if (display_name) updateData.display_name = display_name
    if (description !== undefined) updateData.description = description
    if (address !== undefined) updateData.address = address
    if (city !== undefined) updateData.city = city
    if (state !== undefined) updateData.state = state
    if (status) updateData.status = status
    if (group_id !== undefined) updateData.group_id = group_id
    if (default_owner_id !== undefined) updateData.default_owner_id = default_owner_id
    if (registration_enabled !== undefined) updateData.registration_enabled = registration_enabled
    if (welcome_message !== undefined) updateData.welcome_message = welcome_message
    if (brand_color_primary !== undefined) updateData.brand_color_primary = brand_color_primary
    if (brand_color_secondary !== undefined) updateData.brand_color_secondary = brand_color_secondary
    if (contact_phone !== undefined) updateData.contact_phone = contact_phone
    if (contact_email !== undefined) updateData.contact_email = contact_email
    if (features !== undefined) updateData.features = features
    if (show_logo !== undefined) updateData.show_logo = show_logo
    if (show_location_badge !== undefined) updateData.show_location_badge = show_location_badge
    if (show_display_name !== undefined) updateData.show_display_name = show_display_name
    if (show_welcome_message !== undefined) updateData.show_welcome_message = show_welcome_message
    if (show_description !== undefined) updateData.show_description = show_description
    if (show_guest_access !== undefined) updateData.show_guest_access = show_guest_access
    if (show_pin_display !== undefined) updateData.show_pin_display = show_pin_display

    const location = await updateHotspotLocation(locationId, updateData)

    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Failed to update location' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: location
    })
  } catch (error) {
    console.error('Error in PUT /api/locations/[locationId]:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update location' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params
    const success = await deleteHotspotLocation(locationId)

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete location' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Location deleted successfully'
    })
  } catch (error) {
    console.error('Error in DELETE /api/locations/[locationId]:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete location' },
      { status: 500 }
    )
  }
} 