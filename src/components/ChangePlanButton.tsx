'use client';

import React, { useState } from 'react';
import { ArrowRight, RefreshCw, TrendingUp, Zap, Loader2 } from 'lucide-react';
import { ServicePlan } from '@/lib/plan-filters';
import { isOnFreePlan } from '@/lib/plan-change-utils';
import PlanSelectionModal from './PlanSelectionModal';

interface ChangePlanButtonProps {
  currentPlan: ServicePlan;
  accountStatus: 'ACTIVE' | 'EXPIRED' | 'INACTIVE';
  availablePlans: ServicePlan[];
  username: string;
  onPlanChangeSuccess: (newPlanId: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

const ChangePlanButton: React.FC<ChangePlanButtonProps> = ({
  currentPlan,
  accountStatus,
  availablePlans,
  username,
  onPlanChangeSuccess,
  isLoading = false,
  disabled = false
}) => {
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Determine if the button should be shown
  const shouldShowButton = () => {
    // Only hide for completely inactive accounts
    if (accountStatus === 'INACTIVE') return false;
    
    // Allow plan changes for all other account types (EXPIRED, ACTIVE)
    return availablePlans.length > 0;
  };

  // Get button text based on account status
  const getButtonText = () => {
    if (accountStatus === 'EXPIRED') {
      return 'Change Plan';
    } else if (isOnFreePlan(currentPlan)) {
      return 'Upgrade Plan';
    } else {
      return 'Change Plan';
    }
  };

  // Get button style based on account status
  const getButtonStyle = () => {
    if (accountStatus === 'EXPIRED') {
      return 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white';
    } else if (isOnFreePlan(currentPlan)) {
      return 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white';
    } else {
      return 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white';
    }
  };

  // Get button icon based on account status
  const getButtonIcon = () => {
    if (accountStatus === 'EXPIRED') {
      return <RefreshCw className="h-4 w-4" />;
    } else if (isOnFreePlan(currentPlan)) {
      return <TrendingUp className="h-4 w-4" />;
    } else {
      return <Zap className="h-4 w-4" />;
    }
  };

  // Simplified plan selection - all changes are free and immediate
  const handlePlanSelect = async (selectedPlan: ServicePlan) => {
    setIsProcessing(true);
    
    try {
      // All plan changes are now free - no payment required
      await handleFreePlanChange(selectedPlan);
    } catch (error) {
      console.error('Plan change error:', error);
      // TODO: Show error message to user
    } finally {
      setIsProcessing(false);
      setShowPlanModal(false);
    }
  };

  // Handle plan change (no payment required)
  const handleFreePlanChange = async (selectedPlan: ServicePlan) => {
    console.log(`🔄 Changing plan to: ${selectedPlan.srvname} (ID: ${selectedPlan.srvid})`);
    
    const response = await fetch('/api/change-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        newServicePlanId: selectedPlan.srvid
        // No payment reference needed - all plan changes are free
      })
    });

    const result = await response.json();
    console.log('Plan change result:', result);

    if (result.success) {
      console.log('✅ Plan changed successfully! Use Renew button to add credits.');
      // Pass the selected plan ID to the success callback for validation
      onPlanChangeSuccess(selectedPlan.srvid);
    } else {
      throw new Error(result.message || 'Plan change failed');
    }
  };

  if (!shouldShowButton()) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowPlanModal(true)}
        disabled={disabled || isLoading || isProcessing}
        className={`h-12 px-6 text-white font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none border-2 ${getButtonStyle()}`}
      >
        <div className="flex items-center gap-2">
          {isLoading || isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            getButtonIcon()
          )}
          <span>
            {isLoading || isProcessing ? 'Processing...' : getButtonText()}
          </span>
          {!isLoading && !isProcessing && (
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          )}
        </div>
      </button>

      {/* Plan Selection Modal */}
      <PlanSelectionModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        currentPlan={currentPlan}
        availablePlans={availablePlans}
        accountStatus={accountStatus}
        onPlanSelect={handlePlanSelect}
        isLoading={isProcessing}
      />
    </>
  );
};

export default ChangePlanButton; 