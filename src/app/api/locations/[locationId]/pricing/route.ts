import { NextRequest, NextResponse } from 'next/server';
import { getAccountCreationPricingConfig, setAccountCreationPricingConfig } from '@/lib/database';

/**
 * Get account creation pricing configuration for a location
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params;
    
    const pricingConfig = await getAccountCreationPricingConfig(locationId);
    
    return NextResponse.json({
      success: true,
      data: pricingConfig
    });
  } catch (error) {
    console.error('Error fetching pricing configuration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pricing configuration' },
      { status: 500 }
    );
  }
}

/**
 * Update account creation pricing configuration for a location
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params;
    const body = await request.json();
    
    const { enabled, price, description } = body;
    
    // Validate inputs
    if (enabled !== undefined && typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'enabled must be a boolean' },
        { status: 400 }
      );
    }
    
    if (price !== undefined) {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return NextResponse.json(
          { success: false, error: 'price must be a positive number' },
          { status: 400 }
        );
      }
    }
    
    if (description !== undefined && typeof description !== 'string') {
      return NextResponse.json(
        { success: false, error: 'description must be a string' },
        { status: 400 }
      );
    }
    
    // Update pricing configuration
    const pricingConfig: {
      enabled?: boolean;
      price?: number;
      description?: string;
    } = {};
    
    if (enabled !== undefined) pricingConfig.enabled = enabled;
    if (price !== undefined) pricingConfig.price = parseFloat(price);
    if (description !== undefined) pricingConfig.description = description;
    
    const success = await setAccountCreationPricingConfig(locationId, pricingConfig);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to update pricing configuration' },
        { status: 500 }
      );
    }
    
    // Return updated configuration
    const updatedConfig = await getAccountCreationPricingConfig(locationId);
    
    return NextResponse.json({
      success: true,
      message: 'Pricing configuration updated successfully',
      data: updatedConfig
    });
    
  } catch (error) {
    console.error('Error updating pricing configuration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update pricing configuration' },
      { status: 500 }
    );
  }
} 