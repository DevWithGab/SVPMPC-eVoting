const mongoose = require('mongoose');
const { User } = require('./models');
const connectDB = require('./config/db');

const seedAdmin = async () => {
  try {
    await connectDB();
    console.log('MongoDB connection established.');

    const existingAdmin = await User.findOne({ email: 'admin@cooperativesvg.org' });

    if (existingAdmin) {
      await User.deleteOne({ email: 'admin@cooperativesvg.org' });
      console.log('✓ Existing admin account deleted');
    }

    const admin = new User({
      username: 'admin',
      email: 'admin@cooperativesvg.org',
      password: 'Admin@123456',
      fullName: 'Admin User',
      role: 'admin',
      isActive: true
    });
    await admin.save();

    console.log('✓ Admin account created successfully');
    console.log('Email: admin@cooperativesvg.org');
    console.log('Password: Admin@123456');
    console.log('\nNote: Change this password immediately after first login!');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

const seedStaff = async () => {
  try {
    await connectDB();
    console.log('MongoDB connection established.');

    const existingStaff = await User.findOne({ email: 'staff@cooperativesvg.org' });

    if (existingStaff) {
      await User.deleteOne({ email: 'staff@cooperativesvg.org' });
      console.log('✓ Existing staff account deleted');
    }

    const staff = new User({
      username: 'staff',
      email: 'staff@cooperativesvg.org',
      password: 'Staff@123456',
      fullName: 'Staff User',
      role: 'officer',
      isActive: true
    });
    await staff.save();

    console.log('✓ Staff account created successfully');
    console.log('Email: staff@cooperativesvg.org');
    console.log('Password: Staff@123456');
    console.log('Role: Officer (Staff Portal Access)');
    console.log('\nNote: Change this password immediately after first login!');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding staff:', error);
    process.exit(1);
  }
};

const seedMembers = async () => {
  try {
    await connectDB();
    console.log('MongoDB connection established.');

    // Delete existing members with mem pattern
    await User.deleteMany({ username: { $regex: '^mem[0-9]+$' } });
    console.log('✓ Existing member accounts deleted');

    // Create 10 member accounts and wait for all to complete
    const savePromises = [];
    for (let i = 1; i <= 10; i++) {
      const memberNum = 1000 + i;
      const member = new User({
        username: `mem${memberNum}`,
        email: `mem${memberNum}@cooperativesvg.org`,
        password: 'Member@123456',
        fullName: `Member ${memberNum}`,
        role: 'member',
        isActive: true
      });
      savePromises.push(
        member.save().catch(err => {
          console.error(`Failed to save mem${memberNum}:`, err.message);
          throw err;
        })
      );
    }

    await Promise.all(savePromises);

    console.log('✓ Member accounts created successfully');
    console.log('\nCreated members:');
    for (let i = 1; i <= 10; i++) {
      const memberNum = 1000 + i;
      console.log(`  mem${memberNum}@cooperativesvg.org / Member@123456`);
    }
    console.log('\nNote: Change passwords immediately after first login!');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding members:', error.message);
    process.exit(1);
  }
};

// Check command line argument to decide which seed function to run
const seedType = process.argv[2];

if (seedType === 'members') {
  seedMembers();
} else if (seedType === 'admin') {
  seedAdmin();
} else if (seedType === 'staff') {
  seedStaff();
} else {
  console.log('Usage: node seed.js [admin|staff|members]');
  console.log('Example: node seed.js admin    # Seed admin account');
  console.log('Example: node seed.js staff    # Seed staff account');
  console.log('Example: node seed.js members  # Seed 10 member accounts (mem1001-mem1010)');
  process.exit(0);
}