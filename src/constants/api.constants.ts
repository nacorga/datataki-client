import { Config } from '../types';
import { DEFAULT_SAMPLING_RATE } from './limits.constants';
import { DEFAULT_SESSION_TIMEOUT_MS } from './timing.constants';

// App key
export const APP_KEY = 'dtki';

// Dispatch event name
export const DISPATCH_EVENT_NAME = `${APP_KEY}:track`;

// Default config
export const DEFAULT_CONFIG: Omit<Config, 'apiUrl'> = {
  mode: 'default',
  sessionTimeout: DEFAULT_SESSION_TIMEOUT_MS,
  allowHttp: false,
  qaMode: false,
  samplingRate: DEFAULT_SAMPLING_RATE,
  excludedUrlPaths: [],
};
