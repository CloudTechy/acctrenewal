import { NextRequest, NextResponse } from 'next/server'
import { getLocationWithOwner } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      )
    }

    // Get location with owner details
    const location = await getLocationWithOwner(locationId)

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Check if registration is enabled for this location
    if (!location.registration_enabled) {
      return NextResponse.json(
        { 
          error: 'Registration is disabled for this location',
          location: {
            id: location.id,
            name: location.name,
            display_name: location.display_name,
            registration_enabled: false
          }
        },
        { status: 403 }
      )
    }

    // Return location details with owner information
    return NextResponse.json({
      success: true,
      location: {
        id: location.id,
        name: location.name,
        display_name: location.display_name,
        description: location.description,
        city: location.city,
        state: location.state,
        group_id: location.group_id,
        registration_enabled: location.registration_enabled,
        show_pin_display: location.show_pin_display,
        owner: location.owner ? {
          id: location.owner.id,
          name: location.owner.name,
          owner_username: location.owner.owner_username,
          commission_rate: location.owner.commission_rate
        } : null
      }
    })

  } catch (error) {
    console.error('Error fetching location details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch location details' },
      { status: 500 }
    )
  }
} 