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
    const { name, display_name, description, address, city, state, status } = body

    const updateData: Partial<HotspotLocation> = {}
    if (name) updateData.name = name
    if (display_name) updateData.display_name = display_name
    if (description !== undefined) updateData.description = description
    if (address !== undefined) updateData.address = address
    if (city !== undefined) updateData.city = city
    if (state !== undefined) updateData.state = state
    if (status) updateData.status = status

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