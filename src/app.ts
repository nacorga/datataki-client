import { SCROLL_DEBOUNCE_TIME } from './app.constants';
import { EventManager } from './managers/event.manager';
import { UserManager } from './managers/user.manager';
import { StateManager } from './managers/state.manager';
import { SessionHandler } from './handlers/session.handler';
import { PageViewHandler } from './handlers/page-view.handler';
import { ClickHandler } from './handlers/click.handler';
import { ScrollHandler } from './handlers/scroll.handler';
import { isEventValid } from './utils/validations';
import { EventType } from './types/event.types';
import { GoogleAnalyticsIntegration } from './integrations/google-analytics.integration';
import { getDeviceType, normalizeUrl } from './utils';
import { StorageManager } from './managers/storage.manager';
import { Config } from './types';

export class App extends StateManager {
  private isInitialized = false;
  private googleAnalytics: GoogleAnalyticsIntegration | null = null;
  private storageManager!: StorageManager;
  private eventManager!: EventManager;
  private sessionHandler!: SessionHandler;
  private pageViewHandler!: PageViewHandler;
  private clickHandler!: ClickHandler;
  private scrollHandler!: ScrollHandler;
  private suppressNextScrollTimer: ReturnType<typeof setTimeout> | null = null;

  init(config: Config): void {
    if (this.isInitialized) {
      return;
    }

    try {
      this.initStorage();
      this.setState(config);
      this.setIntegrations();
      this.setEventManager();
      this.initHandlers();
      this.isInitialized = true;
    } catch (error) {
      this.isInitialized = false;
      throw error;
    }
  }

  sendCustomEvent(name: string, metadata?: Record<string, unknown>): void {
    const { valid, error, sanitizedMetadata } = isEventValid(name, metadata);

    if (valid) {
      this.eventManager.track({
        type: EventType.CUSTOM,
        custom_event: {
          name,
          ...(sanitizedMetadata && { metadata: sanitizedMetadata }),
        },
      });
    } else if (this.get('config')?.qaMode) {
      throw new Error(
        `custom event "${name}" validation failed (${error ?? 'unknown error'}). Please, review your event data and try again.`,
      );
    }
  }

  destroy(): void {
    if (!this.isInitialized) {
      return;
    }

    if (this.googleAnalytics) {
      this.googleAnalytics.cleanup();
    }

    this.sessionHandler.stopTracking();
    this.pageViewHandler.stopTracking();
    this.clickHandler.stopTracking();
    this.scrollHandler.stopTracking();
  }

  private async setState(config: Config): Promise<void> {
    this.setConfig(config);
    this.setUserId();
    this.setDevice();
    this.setPageUrl();
  }

  private setConfig(config: Config): void {
    this.set('config', config);
  }

  private setUserId(): void {
    const userManager = new UserManager(this.storageManager);
    const userId = userManager.getId();

    this.set('userId', userId);
  }

  private setDevice(): void {
    const device = getDeviceType();
    this.set('device', device);
  }

  private setPageUrl(): void {
    const initialUrl = normalizeUrl(window.location.href, this.get('config').sensitiveQueryParams);
    this.set('pageUrl', initialUrl);
  }

  private setIntegrations(): void {
    const measurementId = this.get('config').integrations?.googleAnalytics?.measurementId;

    if (measurementId?.trim()) {
      this.googleAnalytics = new GoogleAnalyticsIntegration();
    }
  }

  private initHandlers(): void {
    this.initSessionHandler();
    this.initPageViewHandler();
    this.initClickHandler();
    this.initScrollHandler();
  }

  private initStorage(): void {
    this.storageManager = new StorageManager();
  }

  private setEventManager(): void {
    this.eventManager = new EventManager(this.storageManager, this.googleAnalytics);
  }

  private initSessionHandler(): void {
    this.sessionHandler = new SessionHandler(this.storageManager, this.eventManager);
    this.sessionHandler.startTracking();
  }

  private initPageViewHandler(): void {
    const onPageViewTrack = (): void => this.onPageViewTrack();

    this.pageViewHandler = new PageViewHandler(this.eventManager, onPageViewTrack);
    this.pageViewHandler.startTracking();
  }

  private onPageViewTrack(): void {
    this.set('suppressNextScroll', true);

    if (this.suppressNextScrollTimer) {
      clearTimeout(this.suppressNextScrollTimer);
    }

    this.suppressNextScrollTimer = setTimeout(() => {
      this.set('suppressNextScroll', false);
    }, SCROLL_DEBOUNCE_TIME * 2);
  }

  private initClickHandler(): void {
    this.clickHandler = new ClickHandler(this.eventManager);
    this.clickHandler.startTracking();
  }

  private initScrollHandler(): void {
    this.scrollHandler = new ScrollHandler(this.eventManager);
    this.scrollHandler.startTracking();
  }
}
