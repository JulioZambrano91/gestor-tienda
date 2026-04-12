type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const IS_BROWSER = typeof window !== 'undefined';

const COLORS = {
  info: IS_BROWSER ? 'color: #3b82f6' : '\x1b[34m', // blue
  warn: IS_BROWSER ? 'color: #eab308' : '\x1b[33m', // yellow
  error: IS_BROWSER ? 'color: #ef4444' : '\x1b[31m', // red
  debug: IS_BROWSER ? 'color: #8b5cf6' : '\x1b[35m', // purple
  reset: IS_BROWSER ? '' : '\x1b[0m',
};

const getTimestamp = () => {
  const now = new Date();
  return now.toLocaleTimeString('es-VE', { hour12: false });
};

const formatLabel = (level: LogLevel, context?: string) => {
  const timestamp = getTimestamp();
  const ctx = context ? `[${context.toUpperCase()}]` : '';
  const label = ` ${level.toUpperCase()} `;

  if (IS_BROWSER) {
    const bg = COLORS[level].split(':')[1].trim();
    const labelStyle = `background: ${bg}; color: white; border-radius: 4px; font-weight: bold; padding: 1px 4px; font-size: 10px;`;
    return [`%c${timestamp} %c${label}%c ${ctx}`, 'color: #94a3b8;', labelStyle, 'color: #6366f1; font-weight: bold;'];
  } else {
    const color = COLORS[level];
    const reset = COLORS.reset;
    return `${reset}[${timestamp}] ${color}${label}${reset} ${ctx}`;
  }
};

export const logger = {
  info: (msg: string, context?: string, ...args: any[]) => {
    const head = formatLabel('info', context);
    if (IS_BROWSER) console.log(...(head as any[]), msg, ...args);
    else console.log(head, msg, ...args);
  },
  warn: (msg: string, context?: string, ...args: any[]) => {
    const head = formatLabel('warn', context);
    if (IS_BROWSER) console.warn(...(head as any[]), msg, ...args);
    else console.warn(head, msg, ...args);
  },
  error: (msg: string, context?: string, ...args: any[]) => {
    const head = formatLabel('error', context);
    if (IS_BROWSER) console.error(...(head as any[]), msg, ...args);
    else console.error(head, msg, ...args);
  },
  debug: (msg: string, context?: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'production') return;
    const head = formatLabel('debug', context);
    if (IS_BROWSER) console.log(...(head as any[]), msg, ...args);
    else console.log(head, msg, ...args);
  },
};
