// Quick script to check current vote indexes
const mongoose = require('mongoose');
require('dotenv').config();

const checkIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/svmpc-voting');
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collection = db.collection('votes');

    const indexes = await collection.indexes();
    
    console.log('=== CURRENT VOTE INDEXES ===\n');
    indexes.forEach(idx => {
      console.log(`Name: ${idx.name}`);
      console.log(`Keys:`, idx.key);
      console.log(`Unique: ${idx.unique || false}`);
      console.log('---');
    });

    // Check for the problematic unique index
    const hasOldUniqueIndex = indexes.some(idx => 
      idx.name === 'electionId_1_userId_1' && idx.unique === true
    );

    if (hasOldUniqueIndex) {
      console.log('\n⚠️  WARNING: Old unique constraint still exists!');
      console.log('Run: node migrations/remove-vote-unique-constraint.js');
    } else {
      console.log('\n✓ No problematic unique constraint found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
};

checkIndexes();
