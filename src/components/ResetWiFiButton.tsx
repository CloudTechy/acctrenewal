'use client';

import React, { useState } from 'react';
import { Wifi, Loader2, Shield } from 'lucide-react';

interface ResetWiFiButtonProps {
  username: string;
  phone: string;
  accountStatus: 'ACTIVE' | 'EXPIRED' | 'INACTIVE';
  disabled?: boolean;
  onPinResetSuccess?: (newPin: string) => void;
}

const ResetWiFiButton: React.FC<ResetWiFiButtonProps> = ({
  username,
  phone,
  accountStatus,
  disabled = false,
  onPinResetSuccess
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Determine if the button should be shown
  const shouldShowButton = () => {
    // Only show for active accounts (not expired or inactive)
    return accountStatus === 'ACTIVE';
  };

  // Handle PIN reset
  const handlePinReset = async () => {
    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/radius/reset-wifi-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          phone
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ WiFi PIN reset successfully!');
        // Call success callback if provided
        if (onPinResetSuccess && result.newPin) {
          onPinResetSuccess(result.newPin);
        }
        // Show success message
        alert('WiFi PIN reset successfully! New PIN has been sent to your phone.');
      } else {
        throw new Error(result.message || 'PIN reset failed');
      }
    } catch (error) {
      console.error('PIN reset error:', error);
      alert(`Failed to reset WiFi PIN: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      setShowConfirmation(false);
    }
  };

  // Cancel PIN reset
  const handleCancel = () => {
    setShowConfirmation(false);
  };

  if (!shouldShowButton()) {
    return null;
  }

  if (showConfirmation) {
    return (
      <div className="space-y-3">
        <div className="text-center">
          <p className="text-gray-300 text-sm mb-3">
            Are you sure you want to reset your WiFi PIN? 
            <br />
            <span className="text-yellow-400 font-medium">
              A new PIN will be sent to {phone}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePinReset}
            disabled={isProcessing}
            className="flex-1 h-10 px-4 text-sm font-medium rounded-lg transition-all hover:scale-102 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none border bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
          >
            <div className="flex items-center justify-center gap-2">
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              <span>
                {isProcessing ? 'Resetting...' : 'Yes, Reset PIN'}
              </span>
            </div>
          </button>
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="flex-1 h-10 px-4 text-sm font-medium rounded-lg transition-all hover:scale-102 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none border bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600 hover:border-gray-500"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handlePinReset}
      disabled={disabled || isProcessing}
      className="h-10 px-4 text-sm font-medium rounded-lg transition-all hover:scale-102 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none border bg-gray-600 hover:bg-gray-700 text-gray-200 border-gray-600 hover:border-gray-700"
    >
      <div className="flex items-center gap-2">
        <Wifi className="h-4 w-4" />
        <span>Reset WiFi PIN</span>
      </div>
    </button>
  );
};

export default ResetWiFiButton;
