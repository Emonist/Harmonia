const voteCheck = require('../structures/voteCheck');
const Premium = require('../models/premium');

// Cache for vote status (userId -> { hasVoted: boolean, timestamp: number })
const voteCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

/**
 * Fast vote check with caching
 * @param {string} userId - Discord user ID
 * @returns {Promise<boolean>}
 */
async function fastVoteCheck(userId) {
  try {
    // Check cache first
    const cached = voteCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.hasVoted;
    }

    // Check if user is premium (premium users bypass vote requirement)
    try {
      const premiumEntry = await Premium.findOne({ userId }).lean();
      const isPremium = premiumEntry && (!premiumEntry.expiresAt || premiumEntry.expiresAt > new Date());
      if (isPremium) {
        voteCache.set(userId, { hasVoted: true, timestamp: Date.now() });
        return true;
      }
    } catch (err) {
      // Continue to vote check if premium check fails
    }

    // Check vote status with timeout
    const votePromise = voteCheck(userId);
    const timeoutPromise = new Promise((resolve) => 
      setTimeout(() => resolve(false), 3000) // 3 second timeout
    );
    
    const hasVoted = await Promise.race([votePromise, timeoutPromise]);
    
    // Cache the result
    voteCache.set(userId, { hasVoted: !!hasVoted, timestamp: Date.now() });
    
    return !!hasVoted;
  } catch (error) {
    // On error, check cache for fallback, otherwise assume user hasn't voted
    const cached = voteCache.get(userId);
    if (cached) {
      return cached.hasVoted;
    }
    // Fail-safe: assume user hasn't voted
    return false;
  }
}

/**
 * Clear vote cache for a user (call after they vote)
 * @param {string} userId - Discord user ID
 */
function clearVoteCache(userId) {
  voteCache.delete(userId);
}

/**
 * Clear all vote cache
 */
function clearAllVoteCache() {
  voteCache.clear();
}

module.exports = {
  fastVoteCheck,
  clearVoteCache,
  clearAllVoteCache,
};

