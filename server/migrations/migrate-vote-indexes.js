/**
 * migrate-vote-indexes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * ONE-TIME MIGRATION: Upgrades the votes collection index from a plain
 * performance index to a true unique constraint, and backfills missing
 * positionId on historical candidate vote documents.
 *
 * Run once with:
 *   node server/migrations/migrate-vote-indexes.js
 *
 * Safe to run while server is stopped. Idempotent — safe to run multiple times.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/svmpc';

async function migrate() {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected.\n');

    const db = mongoose.connection.db;
    const votesCollection = db.collection('votes');

    // ── Step 1: Drop the old non-unique index if it exists ──────────────────────
    console.log('📋 Existing indexes on votes collection:');
    const existingIndexes = await votesCollection.indexes();
    existingIndexes.forEach(idx => console.log(' -', idx.name, JSON.stringify(idx.key)));
    console.log('');

    const OLD_INDEX_NAME = 'electionId_1_userId_1_candidateId_1';
    const oldIndexExists = existingIndexes.some(idx => idx.name === OLD_INDEX_NAME);

    if (oldIndexExists) {
        console.log(`🗑️  Dropping old non-unique index: ${OLD_INDEX_NAME}`);
        await votesCollection.dropIndex(OLD_INDEX_NAME);
        console.log('   ✅ Old index dropped.\n');
    } else {
        console.log(`ℹ️  Old index "${OLD_INDEX_NAME}" not found — skipping drop.\n`);
    }

    // ── Step 2: Backfill positionId on historical candidate vote records ─────────
    console.log('🔄 Backfilling positionId on candidate votes that are missing it...');
    const candidatesCollection = db.collection('candidates');

    const votesWithoutPosition = await votesCollection
        .find({ candidateId: { $ne: null }, isAbstain: false, positionId: null })
        .toArray();

    console.log(`   Found ${votesWithoutPosition.length} candidate vote(s) missing positionId.`);

    let backfilled = 0;
    let failed = 0;

    for (const vote of votesWithoutPosition) {
        try {
            const candidate = await candidatesCollection.findOne({ _id: vote.candidateId });
            if (candidate && candidate.positionId) {
                await votesCollection.updateOne(
                    { _id: vote._id },
                    { $set: { positionId: candidate.positionId } }
                );
                backfilled++;
            } else {
                console.warn(`   ⚠️  Could not resolve positionId for vote ${vote._id} (candidate not found)`);
                failed++;
            }
        } catch (err) {
            console.error(`   ❌ Error processing vote ${vote._id}:`, err.message);
            failed++;
        }
    }

    console.log(`   ✅ Backfilled: ${backfilled}, Failed: ${failed}\n`);

    // ── Step 3: Check for any duplicate votes BEFORE creating unique indexes ─────
    console.log('🔍 Checking for existing duplicate votes (same userId + electionId + positionId)...');

    const duplicateCheck = await votesCollection.aggregate([
        {
            $group: {
                _id: { userId: '$userId', electionId: '$electionId', positionId: '$positionId', isAbstain: '$isAbstain' },
                count: { $sum: 1 },
                voteIds: { $push: '$_id' },
            },
        },
        { $match: { count: { $gt: 1 } } },
    ]).toArray();

    if (duplicateCheck.length > 0) {
        console.warn(`\n⚠️  WARNING: Found ${duplicateCheck.length} group(s) of duplicate votes!`);
        console.warn('   These must be resolved manually before unique indexes can be created.');
        console.warn('   Duplicate groups:');
        duplicateCheck.forEach(group => {
            console.warn(`     • userId=${group._id.userId} electionId=${group._id.electionId} positionId=${group._id.positionId} isAbstain=${group._id.isAbstain} — ${group.count} votes`);
            console.warn(`       Vote IDs: ${group.voteIds.join(', ')}`);
        });
        console.warn('\n   You can delete the duplicates manually using MongoDB Compass or mongosh,');
        console.warn('   then re-run this script.\n');
        await mongoose.disconnect();
        process.exit(1);
    } else {
        console.log('   ✅ No duplicates found. Safe to create unique indexes.\n');
    }

    // ── Step 4: Create new unique indexes ────────────────────────────────────────
    console.log('🏗️  Creating unique indexes...');

    try {
        await votesCollection.createIndex(
            { userId: 1, electionId: 1, positionId: 1 },
            {
                unique: true,
                name: 'unique_vote_per_user_per_position',
                partialFilterExpression: { isAbstain: false },
            }
        );
        console.log('   ✅ Created: unique_vote_per_user_per_position (candidate votes)');
    } catch (err) {
        if (err.code === 85 || err.code === 86) {
            console.log('   ℹ️  unique_vote_per_user_per_position already exists — skipping.');
        } else {
            throw err;
        }
    }

    try {
        await votesCollection.createIndex(
            { userId: 1, electionId: 1, positionId: 1, isAbstain: 1 },
            {
                unique: true,
                name: 'unique_abstain_per_user_per_position',
                partialFilterExpression: { isAbstain: true },
            }
        );
        console.log('   ✅ Created: unique_abstain_per_user_per_position (abstain votes)');
    } catch (err) {
        if (err.code === 85 || err.code === 86) {
            console.log('   ℹ️  unique_abstain_per_user_per_position already exists — skipping.');
        } else {
            throw err;
        }
    }

    console.log('\n🎉 Migration complete! Vote integrity is now enforced at the database level.');
    await mongoose.disconnect();
    process.exit(0);
}

migrate().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
