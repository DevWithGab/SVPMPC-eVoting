# Vote Submission Fix - Instructions

## Problem
Users were getting a 400 error when submitting votes because the system only allowed ONE vote per election, but the voting interface tries to submit multiple votes (one per position).

## Root Cause
The Vote model had a unique constraint: `{ electionId: 1, userId: 1 }` which prevented users from casting more than one vote per election.

## Changes Made

### 1. Vote Model (`server/models/vote.model.js`)
- **Removed** the unique constraint on `{ electionId, userId }`
- **Added** a non-unique index on `{ electionId, userId, candidateId }` for performance

### 2. Vote Controller (`server/controllers/vote.controller.js`)
- **Updated** `castVote()` to check for duplicate votes per position (not per election)
- **Updated** `castAbstainVote()` to check for duplicate votes per position
- Now allows multiple votes per election as long as they're for different positions

### 3. Migration Script (`server/migrations/remove-vote-unique-constraint.js`)
- Drops the old unique index from the database
- Creates the new performance index

## How to Apply the Fix

### Step 1: Run the Migration
```bash
cd server
node migrations/remove-vote-unique-constraint.js
```

You should see:
```
Connected to MongoDB
Current indexes: [...]
Dropping unique index: electionId_1_userId_1
✓ Unique constraint removed successfully
Creating new performance index...
✓ New index created successfully
✓ Migration completed successfully!
```

### Step 2: Restart the Server
```bash
# If server is running, stop it (Ctrl+C)
npm run dev
```

### Step 3: Test Voting
1. Log in as a member
2. Navigate to the Voting page
3. Select candidates for multiple positions
4. Submit your votes
5. You should now be able to successfully cast votes for all positions

## What Changed in Behavior

### Before
- Users could only cast ONE vote total per election
- Attempting to vote for a second position would fail with "You have already voted in this election"

### After
- Users can cast multiple votes per election (one per position)
- Each position can only be voted on once
- Attempting to vote twice for the same position will fail with "You have already voted for this position"

## Technical Details

The vote submission flow now works as follows:

1. Frontend submits votes sequentially (one API call per candidate or abstention)
2. Backend checks if user has already voted for that specific position
3. If not, the vote is recorded
4. Process continues for all positions
5. User sees success confirmation with receipt hash

## Rollback (if needed)

If you need to revert to the old behavior:

1. Restore the unique constraint in `server/models/vote.model.js`:
```javascript
voteSchema.index({ electionId: 1, userId: 1 }, { unique: true });
```

2. Drop the new index and recreate the unique one:
```bash
mongo
use svmpc-voting
db.votes.dropIndex("electionId_1_userId_1_candidateId_1")
db.votes.createIndex({ electionId: 1, userId: 1 }, { unique: true })
```

3. Restart the server
