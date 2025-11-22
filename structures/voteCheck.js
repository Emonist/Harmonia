const axios = require('axios');

/**
 * Check if a user has voted on Top.gg
 * @param {string} userId - Discord user ID
 * @returns {Promise<boolean>}
 */
module.exports = async function voteCheck(userId) {
  try {
    // If no token is set, return false (vote check disabled)
    if (!process.env.TOPGG_TOKEN) {
      return false;
    }

    // Top.gg API endpoint
    const apiUrl = `https://top.gg/api/bots/${process.env.BOT_ID || '1409051024936669184'}/check`;
    
    // Make request to Top.gg API
    const response = await axios.get(apiUrl, {
      params: {
        userId: userId,
      },
      headers: {
        'Authorization': process.env.TOPGG_TOKEN,
      },
      timeout: 5000, // 5 second timeout
    });

    // Top.gg returns { voted: 1 } if user voted, { voted: 0 } if not
    return response.data?.voted === 1;
    
  } catch (error) {
    // Handle different error types
    if (error.response) {
      // API returned an error status
      if (error.response.status === 401) {
        console.error('Top.gg API: Invalid token');
      } else if (error.response.status === 404) {
        console.error('Top.gg API: Bot not found');
      } else {
        console.error(`Top.gg API Error: ${error.response.status} - ${error.response.statusText}`);
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('Top.gg API: No response received (timeout or network error)');
    } else {
      // Error in request setup
      console.error(`Top.gg API Error: ${error.message}`);
    }
    
    // Return false on error (fail-safe: assume user hasn't voted)
    return false;
  }
};
