import { MetadataType } from './common.types';

export interface Config {
  /**
   * Endpoint URL for the API.
   * This should be the base URL of the API where events will be sent.
   */
  apiUrl: string;
  /**
   * Mode of operation for the application.
   * Can be 'demo', 'test', or 'default'.
   * - 'demo': Used for demonstration purposes, may have limited functionality.
   * - 'test': Used for testing and debugging, may include additional logging or features.
   * - 'default': Normal operation mode with full functionality.
   * @default 'default'
   */
  mode: 'demo' | 'test' | 'default';
  /**
   * Enables QA mode for testing and debugging purposes.
   * When enabled, events may be processed differently for development environments.
   */
  qaMode?: boolean;
  /**
   * Sampling rate as a percentage (0-1) to control how many events are sent.
   * A value of 1 means all events are sent, while 0.5 means only half of events are sent.
   */
  samplingRate?: number;
  /**
   * Array of URL path patterns to exclude from tracking.
   * Events will not be sent for pages matching these patterns.
   */
  excludedUrlPaths?: string[];
  /**
   * Session timeout in milliseconds. After this period of inactivity,
   * a new session will be started for subsequent events.
   * @default 900000 (15 minutes)
   */
  sessionTimeout?: number;
  /**
   * Metadata that will be automatically attached to all tracking events.
   * These key-value pairs provide additional context for every event sent.
   */
  globalMetadata?: Record<string, MetadataType>;
  /**
   * CSS selectors for custom scroll containers. Can be a single selector string
   * or an array of selectors. Used to track scroll events within specific elements
   * instead of the default window scroll.
   */
  scrollContainerSelectors?: string | string[];
  /**
   * Allow HTTP requests to be made. This is useful for testing and development.
   */
  allowHttp?: boolean;
  /**
   * Array of query parameters to be removed from the URL.
   */
  sensitiveQueryParams?: string[];
  /**
   * Optional integrations configuration.
   */
  integrations?: {
    /**
     * Google Analytics integration configuration.
     */
    googleAnalytics?: {
      /**
       * Google Analytics measurement ID.
       * Required for initializing the Google Analytics integration.
       */
      measurementId: string;
    };
  };
}
