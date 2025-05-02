/**
 * Logger Utility
 * 
 * Provides standardized logging across the application with category-based
 * filtering, severity levels, and enhanced formatting.
 */

export enum LogCategory {
  SYSTEM = 'SYSTEM',
  IOT = 'IOT',
  MODEL = 'MODEL',
  UI = 'UI',
  VOICE = 'VOICE',
  SEARCH = 'SEARCH',
  STORAGE = 'STORAGE',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG'
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LoggerOptions {
  minLevel: LogLevel;
  enabledCategories: LogCategory[] | 'all';
  logToConsole: boolean;
  enableTimestamps: boolean;
}

class Logger {
  private static instance: Logger;
  private options: LoggerOptions;
  private logHistory: string[] = [];
  
  private constructor() {
    this.options = {
      minLevel: LogLevel.INFO,
      enabledCategories: 'all',
      logToConsole: true,
      enableTimestamps: true
    };
    
    // In development mode, set a lower minimum log level
    if (import.meta.env.DEV) {
      this.options.minLevel = LogLevel.DEBUG;
    }
  }
  
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  public setOptions(options: Partial<LoggerOptions>): void {
    this.options = { ...this.options, ...options };
  }
  
  private formatTimestamp(): string {
    return new Date().toISOString();
  }
  
  private getLogPrefix(level: LogLevel, category: LogCategory): string {
    const timestamp = this.options.enableTimestamps ? `[${this.formatTimestamp()}] ` : '';
    const platform = typeof window !== 'undefined' ? '[WEB] ' : '[SERVER] ';
    return `${timestamp}${platform}[${category}] [${LogLevel[level]}]`;
  }
  
  private getConsoleColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '#9e9e9e'; // Gray
      case LogLevel.INFO:
        return '#607d8b'; // Blue Gray
      case LogLevel.WARN:
        return '#ff9800'; // Orange
      case LogLevel.ERROR:
        return '#f44336'; // Red
      default:
        return '#9e9e9e'; // Gray
    }
  }
  
  private shouldLog(level: LogLevel, category: LogCategory): boolean {
    // Check minimum log level
    if (level < this.options.minLevel) {
      return false;
    }
    
    // Check if category is enabled
    if (this.options.enabledCategories === 'all') {
      return true;
    }
    
    return this.options.enabledCategories.includes(category);
  }
  
  private log(level: LogLevel, category: LogCategory, message: string, ...args: any[]): void {
    if (!this.shouldLog(level, category)) {
      return;
    }
    
    const prefix = this.getLogPrefix(level, category);
    const fullMessage = `${prefix} ${message}`;
    
    // Add to history
    this.logHistory.push(fullMessage);
    
    // Trim history if it gets too long
    if (this.logHistory.length > 1000) {
      this.logHistory = this.logHistory.slice(-500);
    }
    
    // Log to console if enabled
    if (this.options.logToConsole) {
      const color = this.getConsoleColor(level);
      
      if (args.length > 0) {
        console.log(
          `%c${prefix}%c ${message}`,
          `background: ${color}; color: #ffffff; font-weight: bold; padding: 2px 4px; border-radius: 3px;`,
          'background: transparent; color: inherit;',
          ...args
        );
      } else {
        console.log(
          `%c${prefix}%c ${message}`,
          `background: ${color}; color: #ffffff; font-weight: bold; padding: 2px 4px; border-radius: 3px;`,
          'background: transparent; color: inherit;'
        );
      }
    }
  }
  
  public debug(category: LogCategory, message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, category, message, ...args);
  }
  
  public info(category: LogCategory, message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, category, message, ...args);
  }
  
  public warn(category: LogCategory, message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, category, message, ...args);
  }
  
  public error(category: LogCategory, message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, category, message, ...args);
  }
  
  public getLogHistory(): string[] {
    return [...this.logHistory];
  }
  
  public clearLogHistory(): void {
    this.logHistory = [];
  }
}

// Export a singleton instance
export const logger = Logger.getInstance();

// Default export
export default logger;