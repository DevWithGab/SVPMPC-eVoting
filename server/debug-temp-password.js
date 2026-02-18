// Debug script to check temporary password in database
const mongoose = require('mongoose');
const { User } = require('./models');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function debugTempPassword() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get the most recently created user with pending_activation status
    const user = await User.findOne({ 
      activation_status: 'pending_activation' 
    }).sort({ createdAt: -1 });

    if (!user) {
      console.log('No user with pending_activation status found');
      return;
    }

    console.log('\n=== User Debug Info ===');
    console.log('Member ID:', user.member_id);
    console.log('Email:', user.email);
    console.log('Activation Status:', user.activation_status);
    console.log('Has temporary_password_hash:', !!user.temporary_password_hash);
    console.log('Temporary password expires:', user.temporary_password_expires);
    console.log('Is expired:', user.isTemporaryPasswordExpired());
    
    if (user.temporary_password_hash) {
      console.log('\nTemporary password hash (first 20 chars):', user.temporary_password_hash.substring(0, 20) + '...');
      
      // Test with a sample password
      console.log('\n=== Testing Password Comparison ===');
      const testPassword = 'Test123!';
      const testHash = await bcrypt.hash(testPassword, 10);
      console.log('Test password:', testPassword);
      console.log('Test hash (first 20 chars):', testHash.substring(0, 20) + '...');
      
      const isTestValid = await bcrypt.compare(testPassword, testHash);
      console.log('Test comparison result:', isTestValid);
      
      // Try comparing with the actual hash
      const isActualValid = await user.compareTemporaryPassword(testPassword);
      console.log('Actual hash comparison with test password:', isActualValid);
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugTempPassword();
