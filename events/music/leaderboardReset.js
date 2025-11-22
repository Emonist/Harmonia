const WeeklyLeaderboard = require('../../models/weeklyLeaderboard');
const MonthlyLeaderboard = require('../../models/monthlyLeaderboard');
const ResetTimes = require('../../models/resetTimes'); // Import the new model

async function checkAndResetLeaderboards() {
  try {
      //console.log("Running WLB")
    const now = new Date();
    
    // Check and reset weekly leaderboard
    if (now.getDay() === 1) { // Monday 0 for sunday
      const lastReset = await getLastResetTime('weekly');
      const today = new Date().toDateString();
      
      // Only reset if we haven't reset today already
      if (lastReset.toDateString() !== today) {
        const result = await WeeklyLeaderboard.deleteMany({});
        console.log(`📅 Global weekly leaderboard reset (Monday) - Deleted ${result.deletedCount} documents`);
        await setLastResetTime('weekly');
      }
    }
    
    // Check and reset monthly leaderboard
      //console.log("Running MLB")
    if (now.getDate() === 1) { // 1st of month
      const lastReset = await getLastResetTime('monthly');
      const currentMonth = new Date().getMonth();
      
      // Only reset if we haven't reset this month already
      if (lastReset.getMonth() !== currentMonth) {
        const result = await MonthlyLeaderboard.deleteMany({});
        console.log(`📅 Global monthly leaderboard reset (1st of month) - Deleted ${result.deletedCount} documents`);
        await setLastResetTime('monthly');
      }
    }
  } catch (error) {
    console.error('Error in leaderboard reset:', error);
  }
}

// Database storage for last reset times
async function getLastResetTime(type) {
  try {
    const resetTime = await ResetTimes.findOne({ type });
    return resetTime ? resetTime.lastReset : new Date(0); // Return very old date if not set
  } catch (error) {
    console.error(`Error getting reset time for ${type}:`, error);
    return new Date(0);
  }
}

async function setLastResetTime(type) {
  try {
    await ResetTimes.findOneAndUpdate(
      { type },
      { lastReset: new Date() },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error(`Error setting reset time for ${type}:`, error);
  }
}

module.exports = {
  checkAndResetLeaderboards,
  getLastResetTime,
  setLastResetTime
};