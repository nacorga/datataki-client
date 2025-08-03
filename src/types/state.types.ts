import { Config } from './config.types';
import { DeviceType } from './device.types';

export interface State {
  config: Config;
  sessionId: string | null;
  userId: string;
  device: DeviceType;
  pageUrl: string;
  suppressNextScroll: boolean;
}
