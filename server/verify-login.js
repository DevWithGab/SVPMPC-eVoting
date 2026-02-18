// Script to verify login with temporary password
const mongoose = require('mongoose');
const { User } = require('./models');
const readline = require('readline');
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function verifyLogin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    const memberId = await question('Enter member_id: ');
    const password = await question('Enter temporary password from email: ');

    const user = await User.findOne({ member_id: memberId });

    if (!user) {
      console.log('\n❌ User not found');
      rl.close();
      await mongoose.connection.close();
      return;
    }

    console.log('\n=== User Info ===');
    console.log('Member ID:', user.member_id);
    console.log('Email:', user.email);
    console.log('Activation Status:', user.activation_status);
    console.log('Has temporary_password_hash:', !!user.temporary_password_hash);
    console.log('Temporary password expires:', user.temporary_password_expires);
    console.log('Is expired:', user.isTemporaryPasswordExpired());

    if (!user.temporary_password_hash) {
      console.log('\n❌ No temporary password set for this user');
      rl.close();
      await mongoose.connection.close();
      return;
    }

    if (user.isTemporaryPasswordExpired()) {
      console.log('\n❌ Temporary password has expired');
      rl.close();
      await mongoose.connection.close();
      return;
    }

    console.log('\n=== Testing Password ===');
    const isValid = await user.compareTemporaryPassword(password);
    
    if (isValid) {
      console.log('✅ Password is VALID - Login should work!');
    } else {
      console.log('❌ Password is INVALID - This is why login fails');
      console.log('\nPossible reasons:');
      console.log('1. The password in the email is different from what you entered');
      console.log('2. The password was changed after the email was sent');
      console.log('3. There was an error during the resend process');
    }

    rl.close();
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    rl.close();
    process.exit(1);
  }
}

verifyLogin();
