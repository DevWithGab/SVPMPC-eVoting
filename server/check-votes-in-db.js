// Script to check what votes are actually in the database
const mongoose = require('mongoose');
require('dotenv').config();

const checkVotes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/svmpc-voting');
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const votesCollection = db.collection('votes');
    const usersCollection = db.collection('users');
    const candidatesCollection = db.collection('candidates');

    // Get all votes
    const votes = await votesCollection.find({}).toArray();
    
    console.log('=== TOTAL VOTES IN DATABASE ===');
    console.log(`Total: ${votes.length} votes\n`);

    // Group by user
    const votesByUser = {};
    for (const vote of votes) {
      const userId = vote.userId.toString();
      if (!votesByUser[userId]) {
        votesByUser[userId] = [];
      }
      votesByUser[userId].push(vote);
    }

    console.log('=== VOTES BY USER ===');
    for (const [userId, userVotes] of Object.entries(votesByUser)) {
      const user = await usersCollection.findOne({ _id: new mongoose.Types.ObjectId(userId) });
      console.log(`\nUser: ${user?.username || user?.email || userId}`);
      console.log(`Total votes: ${userVotes.length}`);
      
      for (const vote of userVotes) {
        if (vote.isAbstain) {
          console.log(`  - ABSTAIN (Election: ${vote.electionId})`);
        } else {
          const candidate = await candidatesCollection.findOne({ _id: vote.candidateId });
          console.log(`  - Candidate: ${candidate?.name || vote.candidateId} (Election: ${vote.electionId})`);
        }
      }
    }

    // Group by candidate
    console.log('\n\n=== VOTES BY CANDIDATE ===');
    const votesByCandidate = {};
    for (const vote of votes) {
      if (!vote.isAbstain && vote.candidateId) {
        const candidateId = vote.candidateId.toString();
        if (!votesByCandidate[candidateId]) {
          votesByCandidate[candidateId] = [];
        }
        votesByCandidate[candidateId].push(vote);
      }
    }

    for (const [candidateId, candidateVotes] of Object.entries(votesByCandidate)) {
      const candidate = await candidatesCollection.findOne({ _id: new mongoose.Types.ObjectId(candidateId) });
      console.log(`\nCandidate: ${candidate?.name || candidateId}`);
      console.log(`Total votes: ${candidateVotes.length}`);
      
      // Show which users voted
      for (const vote of candidateVotes) {
        const user = await usersCollection.findOne({ _id: vote.userId });
        console.log(`  - From: ${user?.username || user?.email || vote.userId}`);
      }
    }

    // Check for duplicates
    console.log('\n\n=== CHECKING FOR DUPLICATE VOTES ===');
    const duplicates = [];
    for (const [userId, userVotes] of Object.entries(votesByUser)) {
      const candidateVotes = userVotes.filter(v => !v.isAbstain);
      const candidateIds = candidateVotes.map(v => v.candidateId?.toString());
      const uniqueCandidateIds = [...new Set(candidateIds)];
      
      if (candidateIds.length !== uniqueCandidateIds.length) {
        const user = await usersCollection.findOne({ _id: new mongoose.Types.ObjectId(userId) });
        console.log(`⚠️  User ${user?.username || userId} has duplicate votes!`);
        
        // Find which candidates have duplicates
        const counts = {};
        for (const cid of candidateIds) {
          counts[cid] = (counts[cid] || 0) + 1;
        }
        
        for (const [cid, count] of Object.entries(counts)) {
          if (count > 1) {
            const candidate = await candidatesCollection.findOne({ _id: new mongoose.Types.ObjectId(cid) });
            console.log(`   - Voted ${count} times for: ${candidate?.name || cid}`);
          }
        }
      }
    }

    if (duplicates.length === 0) {
      console.log('✓ No duplicate votes found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
};

checkVotes();
