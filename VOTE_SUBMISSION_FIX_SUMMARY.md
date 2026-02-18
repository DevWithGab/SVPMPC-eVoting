# Vote Submission Fix Summary

## Issue
**Error**: "Vote Submission Failed - Request failed with status code 400"

**When**: Users tried to submit votes for multiple positions in an election

## Root Cause Analysis

The voting system had a fundamental design flaw:

1. **Database Constraint**: The Vote model enforced a unique index on `{ electionId, userId }`, meaning each user could only have ONE vote document per election
2. **Frontend Expectation**: The Voting.tsx component submits multiple votes (one per position) via separate API calls
3. **Conflict**: After the first vote succeeded, all subsequent votes failed because the unique constraint was violated

## Solution

### Files Modified

1. **`server/models/vote.model.js`**
   - Removed unique constraint on `{ electionId, userId }`
   - Added non-unique index on `{ electionId, userId, candidateId }` for query performance

2. **`server/controllers/vote.controller.js`**
   - Updated `castVote()` to check for duplicate votes per position instead of per election
   - Updated `castAbstainVote()` to use the same position-based logic
   - Now properly allows multiple votes per election (one per position)

3. **`server/migrations/remove-vote-unique-constraint.js`** (NEW)
   - Migration script to drop the old unique index from existing databases
   - Creates the new performance index

4. **`VOTE_FIX_INSTRUCTIONS.md`** (NEW)
   - Step-by-step instructions for applying the fix

## How It Works Now

### Vote Submission Flow
1. User selects candidates for multiple positions
2. Frontend submits votes sequentially (one API call per selection)
3. For each vote, backend:
   - Fetches all existing votes for that user in that election
   - Checks if any existing vote is for the same position
   - If position already voted: Returns error "You have already voted for this position"
   - If position not voted: Creates the vote record
4. All votes are recorded successfully
5. User sees confirmation with receipt hash

### Position Duplicate Prevention
```javascript
// Get all user's votes in this election
const existingVotesForPosition = await Vote.find({
  userId: user._id,
  electionId,
  candidateId: { $ne: null },
}).populate('candidateId');

// Check if any vote is for the same position
for (const existingVote of existingVotesForPosition) {
  const existingPositionId = existingVote.candidateId.positionId;
  if (String(existingPositionId) === String(positionId)) {
    throw new Error('You have already voted for this position');
  }
}
```

## Testing Checklist

- [ ] Run migration script: `node server/migrations/remove-vote-unique-constraint.js`
- [ ] Restart server: `npm run dev` in server directory
- [ ] Log in as a member
- [ ] Navigate to Voting page
- [ ] Select candidates for multiple positions
- [ ] Submit votes
- [ ] Verify success message appears
- [ ] Check database: `db.votes.find({ userId: <your-user-id> })` should show multiple votes
- [ ] Try voting again - should see "You have already voted" message

## Database Impact

### Before Migration
```javascript
// Index
{ electionId: 1, userId: 1 } // UNIQUE

// Allowed
User A -> Election 1 -> Candidate X (Position: President) ✓
User A -> Election 1 -> Candidate Y (Position: VP) ✗ (Duplicate key error)
```

### After Migration
```javascript
// Index
{ electionId: 1, userId: 1, candidateId: 1 } // NON-UNIQUE

// Allowed
User A -> Election 1 -> Candidate X (Position: President) ✓
User A -> Election 1 -> Candidate Y (Position: VP) ✓
User A -> Election 1 -> Candidate Z (Position: President) ✗ (Application logic prevents)
```

## Next Steps

1. **Run the migration** on your development database
2. **Test thoroughly** with multiple positions
3. **Deploy to production** when ready:
   - Run migration on production database first
   - Then deploy updated code
   - Monitor for any issues

## Notes

- The fix maintains data integrity by preventing duplicate votes per position
- Performance is maintained with the new compound index
- Existing votes in the database are not affected
- The migration is idempotent (safe to run multiple times)
