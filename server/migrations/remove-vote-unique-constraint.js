// Migration script to remove the unique constraint on votes
// This allows users to cast multiple votes (one per position) in an election

const mongoose = require('mongoose');
require('dotenv').config();

const runMigration = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/svmpc-voting');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Check if votes collection exists
    const collections = await db.listCollections({ name: 'votes' }).toArray();
    
    if (collections.length === 0) {
      console.log('✓ Votes collection does not exist yet');
      console.log('✓ No migration needed - the new schema will be used when first vote is cast');
      console.log('\nThe system is ready to accept multiple votes per election!');
      await mongoose.connection.close();
      return;
    }

    const collection = db.collection('votes');

    // Get existing indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => idx.name));

    // Drop the old unique index if it exists
    const uniqueIndexName = 'electionId_1_userId_1';
    const hasUniqueIndex = indexes.some(idx => idx.name === uniqueIndexName);

    if (hasUniqueIndex) {
      console.log(`Dropping unique index: ${uniqueIndexName}`);
      await collection.dropIndex(uniqueIndexName);
      console.log('✓ Unique constraint removed successfully');
    } else {
      console.log('✓ Unique index not found (already removed or never existed)');
    }

    // Create new non-unique index for performance
    console.log('Creating new performance index...');
    await collection.createIndex(
      { electionId: 1, userId: 1, candidateId: 1 },
      { name: 'electionId_1_userId_1_candidateId_1' }
    );
    console.log('✓ New index created successfully');

    console.log('\n✓ Migration completed successfully!');
    console.log('Users can now cast multiple votes (one per position) in an election.');

  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

runMigration();
