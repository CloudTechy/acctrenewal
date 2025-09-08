'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Clock, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ServicePlan } from '@/lib/plan-filters';
import { 
  PlanComparison, 
  comparePlans,
  isOnFreePlan 
} from '@/lib/plan-change-utils';

interface PlanSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: ServicePlan;
  availablePlans: ServicePlan[];
  accountStatus: 'ACTIVE' | 'EXPIRED' | 'INACTIVE';
  onPlanSelect: (plan: ServicePlan) => void; // Removed paymentRequired parameter
  isLoading?: boolean;
}

interface PlanCardProps {
  plan: ServicePlan;
  isSelected: boolean;
  isCurrent: boolean;
  comparison?: PlanComparison;
  onSelect: () => void;
}

const PlanCard: React.FC<PlanCardProps> = ({ 
  plan, 
  isSelected, 
  isCurrent, 
  comparison, 
  onSelect
}) => {
  // Calculate total price as unitprice + unitpricetax
  const unitPrice = parseFloat(String(plan.unitprice || '0'));
  const unitTax = parseFloat(String(plan.unitpricetax || '0'));
  const totalPrice = unitPrice + unitTax;
  const isFree = totalPrice === 0;
  const duration = parseInt(String(plan.timeunitexp || '30'));

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <motion.div
      layout
      className={`relative p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20' 
          : isCurrent
          ? 'border-green-500/50 bg-green-500/5 shadow-md'
          : 'border-gray-700/50 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800/70'
      }`}
      onClick={onSelect}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Current Plan Badge */}
      {isCurrent && (
        <div className="absolute -top-2 left-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
          Current
        </div>
      )}

      {/* Free Plan Badge */}
      {isFree && !isCurrent && (
        <div className="absolute -top-2 left-3 bg-yellow-500 text-gray-900 px-2 py-1 rounded-full text-xs font-semibold">
          Free
        </div>
      )}

      {/* Popular Badge for mid-range plans */}
      {!isFree && !isCurrent && totalPrice > 0 && totalPrice <= 2000 && (
        <div className="absolute -top-2 left-3 bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
          Popular
        </div>
      )}

      {/* Selected Indicator */}
      {isSelected && (
        <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-1">
          <Check className="h-3 w-3" />
        </div>
      )}

      {/* Horizontal Layout for Single Column */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Left side - Plan Info */}
        <div className="flex-1">
          <h3 className="text-base font-bold text-gray-100 mb-1">
            {plan.srvname || 'Unnamed Plan'}
          </h3>
          {plan.descr && (
            <div className="text-sm text-gray-400 mb-2 line-clamp-2">
              {plan.descr}
            </div>
          )}
          {duration > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Clock className="h-3 w-3 text-purple-400" />
              <span>{duration} days validity</span>
              {comparison && comparison.featureChanges.duration.improved && (
                <ArrowRight className="h-3 w-3 text-green-400" />
              )}
            </div>
          )}
        </div>

        {/* Right side - Price and Actions */}
        <div className="text-right sm:ml-4">
          <div className="text-2xl font-bold text-blue-400 mb-2">
            {isFree ? 'FREE' : formatCurrency(totalPrice)}
          </div>
          
          {/* Plan Change Notice - All changes are free */}
          {!isCurrent && (
            <div className="inline-flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-lg border border-green-500/20">
              <Check className="h-3 w-3" />
              <span>Free change</span>
            </div>
          )}
          
          {/* Comparison Info */}
          {comparison && !isCurrent && (
            <div className="mt-2 inline-flex items-center gap-2 text-sm">
              {comparison.isUpgrade ? (
                <>
                  <ArrowRight className="h-3 w-3 text-green-400" />
                  <span className="text-green-400 text-xs">Upgrade</span>
                </>
              ) : (
                <>
                  <ArrowRight className="h-3 w-3 text-yellow-400" />
                  <span className="text-yellow-400 text-xs">Change</span>
                </>
              )}
              {comparison.priceDifference !== 0 && (
                <span className="text-gray-300 text-xs">
                  (Renew for {formatCurrency(totalPrice)})
                </span>
              )}
            </div>
          )}
          
          {/* Current plan indicator */}
          {isCurrent && (
            <div className="text-xs text-gray-500 bg-gray-700/30 px-2 py-1 rounded-lg mt-2">
              Current plan
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const PlanSelectionModal: React.FC<PlanSelectionModalProps> = ({
  isOpen,
  onClose,
  currentPlan,
  availablePlans,
  accountStatus,
  onPlanSelect,
  isLoading = false
}) => {
  const [selectedPlan, setSelectedPlan] = useState<ServicePlan | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedPlan(null);
    }
  }, [isOpen]);

  const handlePlanSelect = (plan: ServicePlan) => {
    if (String(plan.srvid) === String(currentPlan.srvid)) return; // Can't select current plan
    setSelectedPlan(plan);
  };

  const handleConfirmSelection = () => {
    if (!selectedPlan) return;
    
    onPlanSelect(selectedPlan);
  };

  // Memoize expensive operations for better performance
  const eligiblePlans = React.useMemo(() => {
    console.time('plan-filtering');
    
    // Convert srvid to string for consistent comparison
    const currentPlanId = String(currentPlan.srvid);
    
    // First, get all potentially eligible plans
    let potentialPlans: ServicePlan[] = [];
    
    // Filter plans based on account status
    if (accountStatus === 'EXPIRED') {
      // Expired accounts can change to any plan except current
      potentialPlans = availablePlans.filter(plan => String(plan.srvid) !== currentPlanId);
    } else if (isOnFreePlan(currentPlan)) {
      // Free accounts can only upgrade to paid plans
      potentialPlans = availablePlans.filter(plan => 
        String(plan.srvid) !== currentPlanId && 
        parseFloat(String(plan.unitprice || '0')) > 0
      );
    } else {
      // Active accounts can only upgrade (for now)
      const currentPrice = parseFloat(String(currentPlan.unitprice || '0'));
      potentialPlans = availablePlans.filter(plan => 
        String(plan.srvid) !== currentPlanId && 
        parseFloat(String(plan.unitprice || '0')) > currentPrice
      );
    }
    
    // Deduplicate plans to prevent duplicate keys
    const uniquePlans = potentialPlans.filter((plan, index, self) => 
      index === self.findIndex(p => String(p.srvid) === String(plan.srvid))
    );
    
    console.log(`📋 Filtered ${availablePlans.length} → ${potentialPlans.length} → ${uniquePlans.length} unique eligible plans`);
    console.timeEnd('plan-filtering');
    
    return uniquePlans;
  }, [availablePlans, currentPlan, accountStatus]);

  // Memoize key generation for better performance
  const generateUniqueKey = React.useCallback((plan: ServicePlan, index: number): string => {
    // Create a unique key combining multiple plan properties
    const planId = String(plan.srvid || 'unknown');
    const planPrice = String(plan.unitprice || '0');
    const planDuration = String(plan.timeunitexp || '0');
    
    return `plan-${planId}-${planPrice}-${planDuration}-${index}`;
  }, []);

  // Memoize comparison calculation
  const comparison = React.useMemo(() => {
    return selectedPlan ? comparePlans(currentPlan, selectedPlan) : null;
  }, [currentPlan, selectedPlan]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <style jsx global>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .modal-container {
          max-height: min(90vh, 600px);
        }
        @media (min-width: 640px) {
          .modal-container {
            max-height: min(70vh, 500px);
          }
        }
      `}</style>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-4xl bg-gray-900 rounded-xl border border-gray-700 shadow-2xl overflow-hidden mx-2 sm:mx-4 flex flex-col modal-container"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-700 bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-100">
                  {accountStatus === 'EXPIRED' ? 'Renew with Different Plan' : 'Change Subscription Plan'}
                </h2>
                <p className="text-gray-400 mt-1 text-sm">
                  {accountStatus === 'EXPIRED' 
                    ? 'Choose a plan to renew your subscription.'
                    : 'Select a new plan to upgrade your account.'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-200 transition-colors"
                disabled={isLoading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

          </div>

          {/* Content */}
          <div className="flex-1 p-4 overflow-y-auto">
            {eligiblePlans.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-base mb-2">No plans available for upgrade</div>
                <div className="text-gray-500 text-sm">
                  {accountStatus === 'ACTIVE' 
                    ? 'You are already on the highest available plan.'
                    : 'No eligible plans found for your account type.'}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Plans Grid - Single Column Layout */}
                <div className="space-y-2">
                  {eligiblePlans.map((plan, index) => (
                    <PlanCard
                      key={generateUniqueKey(plan, index)}
                      plan={plan}
                      isSelected={!!selectedPlan && String(selectedPlan.srvid) === String(plan.srvid)}
                      isCurrent={String(plan.srvid) === String(currentPlan.srvid)}
                      comparison={selectedPlan && String(selectedPlan.srvid) === String(plan.srvid) ? comparison || undefined : undefined}
                      onSelect={() => handlePlanSelect(plan)}
                    />
                  ))}
                </div>
                
                {/* Plans count info */}
                <div className="text-center text-sm text-gray-400 mt-3 pt-3 border-t border-gray-700/30">
                  Showing {eligiblePlans.length} available plan{eligiblePlans.length !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {eligiblePlans.length > 0 && (
            <div className="sticky bottom-0 p-4 border-t border-gray-700 bg-gray-900/95 backdrop-blur-sm shadow-lg">
              {/* Gradient overlay for better visual separation */}
              <div className="absolute -top-4 left-0 right-0 h-4 bg-gradient-to-t from-gray-900/95 to-transparent pointer-events-none"></div>
              <div className="flex flex-col gap-4 relative z-10">
                <div className="text-sm text-gray-400 text-center sm:text-left">
                  {selectedPlan ? (
                    <span>
                      Selected: <span className="text-blue-400 font-medium">{selectedPlan.srvname}</span>
                      <span className="ml-2 text-green-400 text-xs">(Free change)</span>
                    </span>
                  ) : (
                    'Select a plan to continue'
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="flex-1 h-12 sm:h-10 px-4 py-3 text-gray-400 hover:text-gray-200 transition-all duration-200 disabled:opacity-50 text-sm font-medium rounded-lg border border-gray-600 hover:border-gray-500 hover:bg-gray-700/50 min-h-[48px] focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                  >
                    <span className="whitespace-nowrap">Cancel</span>
                  </button>
                  <button
                    onClick={handleConfirmSelection}
                    disabled={!selectedPlan || isLoading}
                    className="flex-1 h-12 sm:h-10 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm min-h-[48px] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                  >
                    {isLoading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span className="whitespace-nowrap">Processing...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span className="whitespace-nowrap">Choose Plan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Instructions for users */}
              <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="text-xs text-blue-300 text-center">
                  💡 Plan changes are free! After changing, use the <strong>Renew</strong> button to add time and credits.
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PlanSelectionModal; 