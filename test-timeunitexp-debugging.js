console.log('🔍 Debugging timeunitexp Flow - Expected Trace');
console.log('==============================================');
console.log('');

console.log('📊 RADIUS API Data (What we know is correct):');
console.log('{');
console.log('  "srvid": "3",');
console.log('  "srvname": "UNLIMITED SINGLE DEVICE (15 Days)",');
console.log('  "timeunitexp": "15",  ← Should be 15 days');
console.log('  "timebaseexp": "2"    ← Days unit');
console.log('}');
console.log('');

console.log('🔍 Expected Debug Flow:');
console.log('');

console.log('1. 📋 Service Plan Selection:');
console.log('   🔍 [DEBUG] Service plan clicked: {');
console.log('     srvid: "3",');
console.log('     srvname: "UNLIMITED SINGLE DEVICE (15 Days)",');
console.log('     timeunitexp: "15",  ← Should be "15"');
console.log('     timebaseexp: "2"');
console.log('   }');
console.log('');

console.log('2. 💾 Registration Data Update:');
console.log('   🔍 [DEBUG] Updated registrationData with selectedServicePlan: {');
console.log('     serviceId: "3",');
console.log('     selectedServicePlan_timeunitexp: "15"  ← Should be "15"');
console.log('   }');
console.log('');

console.log('3. 🔄 Payment Decision (handleNext):');
console.log('   🔍 [DEBUG] handleNext - Payment decision logic: {');
console.log('     selectedPlan_timeunitexp: "15",  ← From servicePlans array');
console.log('     registrationData_selectedServicePlan_timeunitexp: "15"  ← From registrationData');
console.log('   }');
console.log('');

console.log('4. 💳 Payment Metadata Creation:');
console.log('   🔍 [DEBUG] Payment metadata - extracting timeunitexp: {');
console.log('     plan_timeunitexp_raw: "15",  ← Should be "15"');
console.log('     parsed_duration: 15,         ← parseInt("15") = 15');
console.log('     is_zero: false,              ← 15 !== 0');
console.log('     final_value_returned: "15"   ← Should return "15", NOT "30"');
console.log('   }');
console.log('');

console.log('5. 🌐 Webhook Metadata Processing:');
console.log('   🔍 [DEBUG] Webhook - processing timeunitexp field: {');
console.log('     field_value: "15",           ← Should receive "15"');
console.log('     parseInt_result: 15,         ← parseInt("15") = 15');
console.log('     parseInt_or_30: 15           ← Should be 15, NOT 30');
console.log('   }');
console.log('');

console.log('6. ⚡ Credit Addition:');
console.log('   🔍 [DEBUG] addCreditsToUser called with: {');
console.log('     daysToAdd: 15,               ← Should be 15, NOT 30');
console.log('     daysToAdd_type: "number"');
console.log('   }');
console.log('');

console.log('🎯 Key Investigation Points:');
console.log('❓ Where does "15" become "30"?');
console.log('❓ Is selectedServicePlan properly set?');
console.log('❓ Is the timeunitexp parsing failing?');
console.log('❓ Is there a race condition in state updates?');
console.log('');

console.log('🚨 Look for:');
console.log('• Any step where timeunitexp changes from "15" to "30"');
console.log('• Any step where duration becomes 0 (triggering default)'); 
console.log('• Any undefined/null values in selectedServicePlan');
console.log('• Type mismatches (string vs number)');
console.log('');

console.log('🚀 Test the payment flow and check the console logs!'); 