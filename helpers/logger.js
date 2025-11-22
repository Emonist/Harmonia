const color = require('colors');

// Color scheme
const colors = {
  success: 'green',
  error: 'red',
  warning: 'yellow',
  info: 'cyan',
  debug: 'magenta',
  timestamp: 'gray',
};

// Symbols
const symbols = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
  debug: '●',
  arrow: '→',
  separator: '│',
};

class Logger {
  constructor() {
    this.startTime = Date.now();
  }

  getTimestamp() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return color[colors.timestamp](`${hours}:${minutes}:${seconds}`);
  }

  formatMessage(type, message, data = null) {
    const timestamp = this.getTimestamp();
    const symbol = symbols[type] || symbols.info;
    const colorFunc = color[colors[type]] || color.white;
    
    let formatted = `[${timestamp}] ${symbol} ${colorFunc(message)}`;
    
    if (data) {
      formatted += ` ${this.formatData(data)}`;
    }
    
    return formatted;
  }

  formatData(data) {
    if (typeof data === 'object') {
      return color[colors.timestamp](JSON.stringify(data, null, 2));
    }
    return color[colors.timestamp](String(data));
  }

  success(message, data = null) {
    console.log(this.formatMessage('success', message, data));
  }

  error(message, data = null) {
    console.error(this.formatMessage('error', message, data));
  }

  warning(message, data = null) {
    console.warn(this.formatMessage('warning', message, data));
  }

  info(message, data = null) {
    console.log(this.formatMessage('info', message, data));
  }

  debug(message, data = null) {
    if (process.env.DEBUG === 'true') {
      console.log(this.formatMessage('debug', message, data));
    }
  }

  // Section headers
  section(title) {
    const width = 60;
    const padding = Math.floor((width - title.length - 2) / 2);
    const leftPad = ' '.repeat(padding);
    const rightPad = ' '.repeat(width - title.length - padding - 2);
    
    console.log('');
    console.log(color.cyan('═'.repeat(width)));
    console.log(color.cyan.bold(`${leftPad}${title}${rightPad}`));
    console.log(color.cyan('═'.repeat(width)));
    console.log('');
  }

  // Subsection
  subsection(title) {
    console.log(`\n${color.cyan.bold(`${symbols.arrow} ${title}`)}`);
    console.log(color[colors.timestamp]('─'.repeat(50)));
  }

  // Table-like display
  table(rows) {
    if (!rows || rows.length === 0) return;
    
    const maxKeyLength = Math.max(...rows.map(r => r.key.length));
    
    rows.forEach(row => {
      const key = row.key.padEnd(maxKeyLength);
      const value = row.value;
      const colorFunc = row.color ? color[row.color] : (s) => s;
      
      console.log(`  ${symbols.separator} ${color[colors.timestamp](key)} ${symbols.arrow} ${colorFunc(value)}`);
    });
  }

  // Command execution log
  command(commandName, user, guild) {
    const timestamp = this.getTimestamp();
    const userTag = user?.tag || 'Unknown';
    const guildName = guild?.name || 'DM';
    
    console.log(
      `${color[colors.timestamp](`[${timestamp}] ${symbols.info}`)} ` +
      `${color.cyan(`Command: ${commandName}`)} ` +
      `${color.white(`| User: ${userTag}`)} ` +
      `${color[colors.timestamp](`| Guild: ${guildName}`)}`
    );
  }

  // Error with stack trace
  errorWithStack(message, error) {
    this.error(message);
    if (error?.stack) {
      console.error(color.red(error.stack));
    } else if (error) {
      console.error(color.red(String(error)));
    }
  }

  // Separator line
  separator(char = '─', length = 60) {
    console.log(color[colors.timestamp](char.repeat(length)));
  }

  // Blank line
  blank() {
    console.log('');
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;

