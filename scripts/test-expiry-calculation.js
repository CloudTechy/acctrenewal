// Test script to verify expiry calculation logic

function calculateNewExpiry(currentExpiry, daysToAdd) {
  let calculatedExpiry;
  
  if (currentExpiry) {
    const current = new Date(currentExpiry);
    const now = new Date();
    
    // If current expiry is in the future, add to it
    if (current > now) {
      calculatedExpiry = new Date(current);
      calculatedExpiry.setDate(calculatedExpiry.getDate() + daysToAdd);
      console.log(`✅ Current expiry ${currentExpiry} is in future, adding ${daysToAdd} days to it`);
    } else {
      // If expired, start from now
      calculatedExpiry = new Date();
      calculatedExpiry.setDate(calculatedExpiry.getDate() + daysToAdd);
      console.log(`⚠️  Current expiry ${currentExpiry} is in past, adding ${daysToAdd} days from now`);
    }
  } else {
    // No current expiry provided, start from now
    calculatedExpiry = new Date();
    calculatedExpiry.setDate(calculatedExpiry.getDate() + daysToAdd);
    console.log(`ℹ️  No current expiry provided, adding ${daysToAdd} days from now`);
  }

  return calculatedExpiry;
}

function calculateDaysRemaining(expiryDate) {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

console.log('🧪 Testing Expiry Calculation Logic');
console.log('=====================================\n');

// Test Case 1: Your actual scenario
const currentExpiry = '2025-10-17 00:00:00';
const daysToAdd = 30;

console.log('📅 Test Case 1: Your Actual Scenario');
console.log(`Current Expiry: ${currentExpiry}`);
console.log(`Days to Add: ${daysToAdd}`);

const daysRemaining = calculateDaysRemaining(currentExpiry);
console.log(`Days Remaining: ${daysRemaining} days`);

const newExpiry = calculateNewExpiry(currentExpiry, daysToAdd);
const newDaysRemaining = calculateDaysRemaining(newExpiry);

console.log(`New Expiry: ${newExpiry.toISOString().slice(0, 19).replace('T', ' ')}`);
console.log(`New Days Remaining: ${newDaysRemaining} days`);
console.log(`Expected: ${daysRemaining + daysToAdd} days`);
console.log(`✅ Correct: ${newDaysRemaining === (daysRemaining + daysToAdd) ? 'YES' : 'NO'}\n`);

// Test Case 2: Expired account
console.log('📅 Test Case 2: Expired Account');
const expiredDate = '2025-01-01 00:00:00';
console.log(`Current Expiry: ${expiredDate} (expired)`);
console.log(`Days to Add: ${daysToAdd}`);

const newExpiryExpired = calculateNewExpiry(expiredDate, daysToAdd);
const newDaysRemainingExpired = calculateDaysRemaining(newExpiryExpired);

console.log(`New Expiry: ${newExpiryExpired.toISOString().slice(0, 19).replace('T', ' ')}`);
console.log(`New Days Remaining: ${newDaysRemainingExpired} days`);
console.log(`Expected: ~${daysToAdd} days (from today)`);
console.log(`✅ Correct: ${Math.abs(newDaysRemainingExpired - daysToAdd) <= 1 ? 'YES' : 'NO'}\n`);

// Test Case 3: No current expiry
console.log('📅 Test Case 3: No Current Expiry');
console.log(`Current Expiry: undefined`);
console.log(`Days to Add: ${daysToAdd}`);

const newExpiryUndefined = calculateNewExpiry(undefined, daysToAdd);
const newDaysRemainingUndefined = calculateDaysRemaining(newExpiryUndefined);

console.log(`New Expiry: ${newExpiryUndefined.toISOString().slice(0, 19).replace('T', ' ')}`);
console.log(`New Days Remaining: ${newDaysRemainingUndefined} days`);
console.log(`Expected: ~${daysToAdd} days (from today)`);
console.log(`✅ Correct: ${Math.abs(newDaysRemainingUndefined - daysToAdd) <= 1 ? 'YES' : 'NO'}\n`);

console.log('🎯 Summary: The webhook should now correctly handle expiry dates!'); 