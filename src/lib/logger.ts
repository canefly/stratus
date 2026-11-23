export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug' | 'drag';
  tag: string;
  message: string;
  details?: any;
}

type LogListener = (logs: LogEntry[]) => void;

class Logger {
  private logs: LogEntry[] = [];
  private listeners: Set<LogListener> = new Set();
  private maxLogs = 500;

  constructor() {
    this.log('info', 'System', 'Developer Logger initialized');
  }

  log(level: LogEntry['level'], tag: string, message: string, details?: any) {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      level,
      tag,
      message,
      details
    };

    this.logs = [entry, ...this.logs].slice(0, this.maxLogs);
    this.notify();

    const formatted = `[${entry.timestamp}] [${tag.toUpperCase()}] ${message}`;
    if (level === 'error') {
      console.error(formatted, details !== undefined ? details : '');
    } else if (level === 'warn') {
      console.warn(formatted, details !== undefined ? details : '');
    } else {
      console.log(formatted, details !== undefined ? details : '');
    }
  }

  getLogs() {
    return this.logs;
  }

  clear() {
    this.logs = [];
    this.notify();
  }

  subscribe(listener: LogListener) {
    this.listeners.add(listener);
    listener(this.logs);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l([...this.logs]));
  }
}

export const logger = new Logger();
