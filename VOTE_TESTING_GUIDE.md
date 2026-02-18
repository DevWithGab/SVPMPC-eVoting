# Vote Testing Guide

## Current Status
- Database has 0 votes (clean slate)
- Vote model updated to allow multiple votes per election
- Backend logic checks for duplicate votes per position

## Test Scenario

### Setup
1. Make sure you have:
   - At least 1 active election
   - At least 2 positions in that election
   - At least 2 candidates per position
   - At least 2 member accounts to test with

### Test 1: Single User, Multiple Positions
**Goal**: Verify a user can vote for multiple positions

1. Log in as Member 1
2. Go to Voting page
3. Select 1 candidate for Position 1
4. Select 1 candidate for Position 2
5. Submit votes
6. Expected: Success message, 2 votes in database

**Check database**:
```bash
cd server
node check-votes-in-db.js
```

Expected output:
- Total: 2 votes
- Member 1 has 2 votes (one per position)
- Each candidate has 1 vote

### Test 2: Second User, Same Positions
**Goal**: Verify multiple users can vote

1. Log out
2. Log in as Member 2
3. Go to Voting page
4. Select candidates (can be same or different)
5. Submit votes
6. Expected: Success message

**Check database**:
```bash
node check-votes-in-db.js
```

Expected output:
- Total: 4 votes
- Member 1 has 2 votes
- Member 2 has 2 votes
- Each candidate should have correct vote count

### Test 3: Duplicate Vote Prevention
**Goal**: Verify users cannot vote twice

1. Try to vote again with Member 2 (should be blocked by frontend)
2. If you can bypass frontend, backend should reject with "You have already voted for this position"

### Test 4: Results Accuracy
**Goal**: Verify results page shows correct counts

1. Go to Results page
2. Check vote counts for each candidate
3. Compare with database output from check-votes-in-db.js
4. They should match exactly

## Common Issues to Check

### Issue 1: Duplicate Votes in Database
**Symptom**: Candidate shows 3 votes but only 2 users voted

**Possible Causes**:
1. Frontend submitting same vote multiple times
2. User clicked submit button multiple times
3. Network retry logic duplicating requests
4. Race condition in Promise.all()

**Check**: Look at server logs when voting - should see one API call per candidate

### Issue 2: Results Page Showing Wrong Count
**Symptom**: Results page shows different count than database

**Possible Causes**:
1. Results calculation logic is wrong
2. Caching issue
3. Including abstain votes in count
4. Counting votes from inactive elections

**Check**: Compare `getElectionResults` API response with database

### Issue 3: Vote Submission Fails
**Symptom**: 400 error when submitting

**Possible Causes**:
1. Invalid candidateId or electionId format
2. Election not active
3. Candidate not found
4. Validation error

**Check**: Server logs will show exact error message

## Debugging Commands

### Check all votes in database
```bash
cd server
node check-votes-in-db.js
```

### Check vote indexes
```bash
node check-vote-indexes.js
```

### Check election status
```bash
# In MongoDB shell or Compass
db.elections.find({ status: 'active' })
```

### Check candidates and positions
```bash
db.candidates.find()
db.positions.find()
```

## Expected Behavior Summary

1. **One vote per position per user**: Each user can vote once for each position
2. **Multiple positions allowed**: User can vote in all positions in one election
3. **No duplicate votes**: System prevents voting twice for same position
4. **Accurate counts**: Results page matches database exactly
5. **Abstain votes**: Don't count toward candidate totals

## If You Find Issues

Please provide:
1. Output from `check-votes-in-db.js`
2. Server console logs when voting
3. Network tab showing API requests
4. Screenshot of Results page
5. Description of what you expected vs what happened
