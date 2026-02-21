// Fix all vote index issues:
// 1. Drop the old unique index electionId_1_userId_1
// 2. Drop the mystery unique index electionId_1_positionId_1_userId_1
// 3. Keep only the non-unique compound index electionId_1_userId_1_candidateId_1
// 4. Drop the stray empty 'vote' collection if it exists

const mongoose = require('mongoose');
require('dotenv').config();

const fixVoteIndexes = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    console.log('Connected to MongoDB\n');

    // --- 1. Fix the 'votes' collection indexes ---
    const cols = await db.listCollections().toArray();
    const colNames = cols.map(c => c.name);

    if (colNames.includes('votes')) {
        const collection = db.collection('votes');
        const indexes = await collection.indexes();

        console.log('Current indexes on "votes":');
        for (const idx of indexes) {
            console.log(`  - ${idx.name} | unique: ${idx.unique || false}`);
        }
        console.log('');

        // Drop the old unique index: electionId_1_userId_1
        const hasOldUnique = indexes.some(i => i.name === 'electionId_1_userId_1');
        if (hasOldUnique) {
            await collection.dropIndex('electionId_1_userId_1');
            console.log('✓ Dropped old unique index: electionId_1_userId_1');
        } else {
            console.log('✓ electionId_1_userId_1 not found (already dropped)');
        }

        // Drop the mystery unique index: electionId_1_positionId_1_userId_1
        const hasMysteryUnique = indexes.some(i => i.name === 'electionId_1_positionId_1_userId_1');
        if (hasMysteryUnique) {
            await collection.dropIndex('electionId_1_positionId_1_userId_1');
            console.log('✓ Dropped mystery unique index: electionId_1_positionId_1_userId_1');
        } else {
            console.log('✓ electionId_1_positionId_1_userId_1 not found (already dropped)');
        }

        // Drop existing non-unique candidateId compound index if it exists (to recreate cleanly)
        const hasCandidateIdx = indexes.some(i => i.name === 'electionId_1_userId_1_candidateId_1');
        if (hasCandidateIdx) {
            await collection.dropIndex('electionId_1_userId_1_candidateId_1');
            console.log('✓ Dropped old candidateId index (will recreate)');
        }

        // Recreate the correct non-unique performance index
        await collection.createIndex(
            { electionId: 1, userId: 1, candidateId: 1 },
            { name: 'electionId_1_userId_1_candidateId_1', unique: false }
        );
        console.log('✓ Recreated non-unique performance index: electionId_1_userId_1_candidateId_1');

        // Verify final state
        const finalIndexes = await collection.indexes();
        console.log('\nFinal indexes on "votes":');
        for (const idx of finalIndexes) {
            console.log(`  - ${idx.name} | unique: ${idx.unique || false}`);
        }
    } else {
        console.log('"votes" collection does not exist yet — no action needed');
    }

    // --- 2. Drop the stray empty 'vote' collection ---
    if (colNames.includes('vote')) {
        const voteCount = await db.collection('vote').countDocuments();
        if (voteCount === 0) {
            await db.collection('vote').drop();
            console.log('\n✓ Dropped stray empty "vote" collection');
        } else {
            console.log(`\n⚠️  "vote" collection has ${voteCount} documents — NOT dropping it. Investigate manually.`);
        }
    } else {
        console.log('\n✓ No stray "vote" collection found');
    }

    await mongoose.connection.close();
    console.log('\n✓ All done! Vote indexes are now clean.');
};

fixVoteIndexes().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
