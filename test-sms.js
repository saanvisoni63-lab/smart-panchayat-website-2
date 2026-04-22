#!/usr/bin/env node
// Quick test script to check if SMS logging works

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing SMS Logging...\n');

// Test 1: Check if SMS function can write to file
const testMessage = `[${new Date().toISOString()}] SMS to +91XXXXXXXXXX: Smart Panchayat: Hello testuser, you have successfully logged in.\n`;

try {
  fs.appendFileSync('sms_logs.txt', testMessage);
  console.log('✅ Test 1: Can write to sms_logs.txt - PASSED');
} catch (err) {
  console.error('❌ Test 1: Cannot write to sms_logs.txt - FAILED');
  console.error('   Error:', err.message);
  process.exit(1);
}

// Test 2: Check if file exists and can be read
try {
  const content = fs.readFileSync('sms_logs.txt', 'utf8');
  console.log('✅ Test 2: Can read sms_logs.txt - PASSED');
  console.log(`   File contains ${content.split('\n').filter(l => l.trim()).length} messages`);
} catch (err) {
  console.error('❌ Test 2: Cannot read sms_logs.txt - FAILED');
  console.error('   Error:', err.message);
}

// Test 3: Check file permissions
try {
  fs.accessSync('sms_logs.txt', fs.constants.R_OK | fs.constants.W_OK);
  console.log('✅ Test 3: File permissions OK - PASSED');
} catch (err) {
  console.error('❌ Test 3: File permission issue - FAILED');
  console.error('   Error:', err.message);
}

console.log('\n📱 SMS Log File Contents:');
console.log('----------------------------------------');
try {
  const content = fs.readFileSync('sms_logs.txt', 'utf8');
  if (content.trim()) {
    console.log(content);
  } else {
    console.log('(File is empty - no SMS messages logged yet)');
  }
} catch (err) {
  console.log('(Could not read file)');
}

console.log('----------------------------------------');
console.log('\n💡 To see SMS in action:');
console.log('   1. Make sure server is running: npm start');
console.log('   2. Open http://localhost:3000');
console.log('   3. Sign up and log in');
console.log('   4. Check sms_logs.txt or server console\n');

