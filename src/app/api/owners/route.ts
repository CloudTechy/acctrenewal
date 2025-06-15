import { NextRequest, NextResponse } from 'next/server'
import { getAllAccountOwners, getAccountOwner } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ownerId = searchParams.get('id')

    if (ownerId) {
      // Get specific owner
      const owner = await getAccountOwner(ownerId)
      if (!owner) {
        return NextResponse.json({ error: 'Owner not found' }, { status: 404 })
      }
      
      return NextResponse.json({
        success: true,
        data: owner
      })
    } else {
      // Get all owners
      const owners = await getAllAccountOwners()
      
      return NextResponse.json({
        success: true,
        data: owners
      })
    }

  } catch (error) {
    console.error('Error fetching owners:', error)
    return NextResponse.json(
      { error: 'Failed to fetch owner data' },
      { status: 500 }
    )
  }
} 