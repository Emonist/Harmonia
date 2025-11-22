const cooldowns = new Map();

module.exports = (commandName, userId, cooldownTime) => {
  if (!cooldowns.has(commandName)) {
    cooldowns.set(commandName, new Map());
  }

  const userCooldowns = cooldowns.get(commandName);
  if (userCooldowns.has(userId)) {
    const expirationTime = userCooldowns.get(userId) + cooldownTime;
    if (Date.now() < expirationTime) {
      return expirationTime - Date.now();
    }
  }

  userCooldowns.set(userId, Date.now());
  setTimeout(() => userCooldowns.delete(userId), cooldownTime);
  return null;
};
