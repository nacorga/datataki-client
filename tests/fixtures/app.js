const STORAGE_BASE_KEY = "dtki";
const USER_ID_KEY = `${STORAGE_BASE_KEY}:uid`;
const QUEUE_KEY = `${STORAGE_BASE_KEY}:queue`;
const SESSION_STORAGE_KEY = `${STORAGE_BASE_KEY}:session`;
const EVENT_SENT_INTERVAL = 1e4;
const EVENT_SENT_INTERVAL_TEST = 2500;
const MAX_EVENTS_QUEUE_LENGTH = 500;
const SESSION_TIMEOUT_MS = 15 * 60 * 1e3;
const SESSION_HEARTBEAT_INTERVAL_MS = 3e4;
const SIGNIFICANT_SCROLL_DELTA = 10;
const SCROLL_DEBOUNCE_TIME = 250;
const MAX_CUSTOM_EVENT_NAME_LENGTH = 120;
const MAX_CUSTOM_EVENT_STRING_SIZE = 8 * 1024;
const MAX_CUSTOM_EVENT_KEYS = 10;
const MAX_CUSTOM_EVENT_ARRAY_SIZE = 10;
const DEFAULT_SAMPLING_RATE = 1;
const UTM_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
var EventType = /* @__PURE__ */ ((EventType2) => {
  EventType2["PAGE_VIEW"] = "page_view";
  EventType2["CLICK"] = "click";
  EventType2["SCROLL"] = "scroll";
  EventType2["SESSION_START"] = "session_start";
  EventType2["SESSION_END"] = "session_end";
  EventType2["CUSTOM"] = "custom";
  return EventType2;
})(EventType || {});
var ScrollDirection = /* @__PURE__ */ ((ScrollDirection2) => {
  ScrollDirection2["UP"] = "up";
  ScrollDirection2["DOWN"] = "down";
  return ScrollDirection2;
})(ScrollDirection || {});
const globalState = {};
class StateManager {
  get(key) {
    return globalState[key];
  }
  set(key, value) {
    globalState[key] = value;
  }
}
var DeviceType = /* @__PURE__ */ ((DeviceType2) => {
  DeviceType2["Mobile"] = "mobile";
  DeviceType2["Tablet"] = "tablet";
  DeviceType2["Desktop"] = "desktop";
  DeviceType2["Unknown"] = "unknown";
  return DeviceType2;
})(DeviceType || {});
let coarsePointerQuery;
let noHoverQuery;
const initMediaQueries = () => {
  if (typeof window !== "undefined" && !coarsePointerQuery) {
    coarsePointerQuery = window.matchMedia("(pointer: coarse)");
    noHoverQuery = window.matchMedia("(hover: none)");
  }
};
const getDeviceType = () => {
  try {
    const nav = navigator;
    if (nav.userAgentData && typeof nav.userAgentData.mobile === "boolean") {
      if (nav.userAgentData.platform && /ipad|tablet/i.test(nav.userAgentData.platform)) {
        return DeviceType.Tablet;
      }
      return nav.userAgentData.mobile ? DeviceType.Mobile : DeviceType.Desktop;
    }
    initMediaQueries();
    const width = window.innerWidth;
    const hasCoarsePointer = coarsePointerQuery?.matches ?? false;
    const hasNoHover = noHoverQuery?.matches ?? false;
    const hasTouchSupport = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const ua = navigator.userAgent.toLowerCase();
    const isMobileUA = /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/.test(ua);
    const isTabletUA = /tablet|ipad|android(?!.*mobile)/.test(ua);
    if (width <= 767 || isMobileUA && hasTouchSupport) {
      return DeviceType.Mobile;
    }
    if (width >= 768 && width <= 1024 || isTabletUA || hasCoarsePointer && hasNoHover && hasTouchSupport) {
      return DeviceType.Tablet;
    }
    return DeviceType.Desktop;
  } catch {
    return DeviceType.Desktop;
  }
};
const getUTMParameters = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const utmParams = {};
  UTM_PARAMS.forEach((param) => {
    const value = urlParams.get(param);
    if (value) {
      const key = param.split("utm_")[1];
      utmParams[key] = value;
    }
  });
  return Object.keys(utmParams).length ? utmParams : void 0;
};
const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
};
const buildMessage = (message) => {
  return `[Datataki] ${message}`;
};
const log = (type, message) => {
  if (type === "info") {
    console.log(buildMessage(message));
  } else if (type === "warning") {
    console.warn(buildMessage(message));
  } else {
    console.error(buildMessage(message));
  }
};
const VALIDATION_CONSTANTS = {
  MIN_SESSION_TIMEOUT: 6e4,
  // 1 minute minimum
  MAX_SESSION_TIMEOUT: 864e5
};
const VALIDATION_MESSAGES = {
  MISSING_CONFIG: "Configuration is required",
  MISSING_API_URL: "API URL is required",
  INVALID_SESSION_TIMEOUT: `Session timeout must be between ${VALIDATION_CONSTANTS.MIN_SESSION_TIMEOUT}ms (1 minute) and ${VALIDATION_CONSTANTS.MAX_SESSION_TIMEOUT}ms (24 hours)`,
  INVALID_GOOGLE_ANALYTICS_ID: "Google Analytics measurement ID is required when integration is enabled",
  INVALID_SCROLL_CONTAINER_SELECTORS: "Scroll container selectors must be valid CSS selectors"
};
const validateAppConfig = (config) => {
  if (!config) {
    throw new Error(VALIDATION_MESSAGES.MISSING_CONFIG);
  }
  if (!["demo", "test"].includes(config.mode) && !config.apiUrl) {
    throw new Error(VALIDATION_MESSAGES.MISSING_API_URL);
  }
  if (config.sessionTimeout !== void 0) {
    if (typeof config.sessionTimeout !== "number" || config.sessionTimeout < VALIDATION_CONSTANTS.MIN_SESSION_TIMEOUT || config.sessionTimeout > VALIDATION_CONSTANTS.MAX_SESSION_TIMEOUT) {
      throw new Error(VALIDATION_MESSAGES.INVALID_SESSION_TIMEOUT);
    }
  }
  if (config.globalMetadata !== void 0) {
    if (typeof config.globalMetadata !== "object" || config.globalMetadata === null) {
      throw new Error("Global metadata must be an object");
    }
  }
  if (config.scrollContainerSelectors !== void 0) {
    validateScrollContainerSelectors(config.scrollContainerSelectors);
  }
  if (config.integrations) {
    validateIntegrations(config.integrations);
  }
  if (config.sensitiveQueryParams !== void 0) {
    if (!Array.isArray(config.sensitiveQueryParams)) {
      throw new Error("Sensitive query params must be an array of strings");
    }
    for (const param of config.sensitiveQueryParams) {
      if (typeof param !== "string") {
        throw new Error("All sensitive query params must be strings");
      }
    }
  }
};
const validateScrollContainerSelectors = (selectors) => {
  const selectorsArray = Array.isArray(selectors) ? selectors : [selectors];
  for (const selector of selectorsArray) {
    if (typeof selector !== "string" || selector.trim() === "") {
      throw new Error(VALIDATION_MESSAGES.INVALID_SCROLL_CONTAINER_SELECTORS);
    }
    if (typeof document !== "undefined") {
      try {
        document.querySelector(selector);
      } catch {
        throw new Error(`Invalid CSS selector: "${selector}"`);
      }
    }
  }
};
const validateIntegrations = (integrations) => {
  if (!integrations) return;
  if (integrations.googleAnalytics) {
    if (!integrations.googleAnalytics.measurementId || typeof integrations.googleAnalytics.measurementId !== "string" || integrations.googleAnalytics.measurementId.trim() === "") {
      throw new Error(VALIDATION_MESSAGES.INVALID_GOOGLE_ANALYTICS_ID);
    }
    const measurementId = integrations.googleAnalytics.measurementId.trim();
    if (!measurementId.match(/^(G-|UA-)/)) {
      throw new Error('Google Analytics measurement ID must start with "G-" or "UA-"');
    }
  }
};
const validateAndNormalizeConfig = (config) => {
  validateAppConfig(config);
  const mode = config.mode?.trim() || "default";
  return {
    ...config,
    mode: ["demo", "test"].includes(mode) ? mode : "default",
    sessionTimeout: config.sessionTimeout ?? SESSION_TIMEOUT_MS,
    globalMetadata: config.globalMetadata ?? {},
    sensitiveQueryParams: config.sensitiveQueryParams ?? []
  };
};
const MAX_STRING_LENGTH = 1e3;
const MAX_ARRAY_LENGTH = 100;
const MAX_OBJECT_DEPTH = 3;
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /data:text\/html/gi,
  /vbscript:/gi
];
const sanitizeString = (value) => {
  if (!value || typeof value !== "string" || value.trim().length === 0) {
    return "";
  }
  if (value.length > MAX_STRING_LENGTH) {
    value = value.slice(0, Math.max(0, MAX_STRING_LENGTH));
  }
  let sanitized = value;
  for (const pattern of XSS_PATTERNS) {
    sanitized = sanitized.replace(pattern, "");
  }
  sanitized = sanitized.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;").replaceAll("/", "&#x2F;");
  return sanitized.trim();
};
const sanitizeValue = (value, depth = 0) => {
  if (depth > MAX_OBJECT_DEPTH) {
    return null;
  }
  if (value === null || value === void 0) {
    return null;
  }
  if (typeof value === "string") {
    return sanitizeString(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < -Number.MAX_SAFE_INTEGER || value > Number.MAX_SAFE_INTEGER) {
      return 0;
    }
    return value;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    const limitedArray = value.slice(0, MAX_ARRAY_LENGTH);
    return limitedArray.map((item) => sanitizeValue(item, depth + 1)).filter((item) => item !== null);
  }
  if (typeof value === "object") {
    const sanitizedObject = {};
    const entries = Object.entries(value);
    const limitedEntries = entries.slice(0, 20);
    for (const [key, value_] of limitedEntries) {
      const sanitizedKey = sanitizeString(key);
      if (sanitizedKey) {
        const sanitizedValue = sanitizeValue(value_, depth + 1);
        if (sanitizedValue !== null) {
          sanitizedObject[sanitizedKey] = sanitizedValue;
        }
      }
    }
    return sanitizedObject;
  }
  return null;
};
const sanitizeMetadata = (metadata) => {
  if (typeof metadata !== "object" || metadata === null) {
    return {};
  }
  try {
    const sanitized = sanitizeValue(metadata);
    return typeof sanitized === "object" && sanitized !== null ? sanitized : {};
  } catch (error) {
    throw new Error(`Metadata sanitization failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};
const isOnlyPrimitiveFields = (object) => {
  if (typeof object !== "object" || object === null) {
    return false;
  }
  for (const value of Object.values(object)) {
    if (value === null || value === void 0) {
      continue;
    }
    const type = typeof value;
    if (type === "string" || type === "number" || type === "boolean") {
      continue;
    }
    if (Array.isArray(value)) {
      if (!value.every((item) => typeof item === "string")) {
        return false;
      }
      continue;
    }
    return false;
  }
  return true;
};
const isValidEventName = (eventName) => {
  if (typeof eventName !== "string") {
    return {
      valid: false,
      error: "Event name must be a string"
    };
  }
  if (eventName.length === 0) {
    return {
      valid: false,
      error: "Event name cannot be empty"
    };
  }
  if (eventName.length > MAX_CUSTOM_EVENT_NAME_LENGTH) {
    return {
      valid: false,
      error: `Event name is too long (max ${MAX_CUSTOM_EVENT_NAME_LENGTH} characters)`
    };
  }
  if (eventName.includes("<") || eventName.includes(">") || eventName.includes("&")) {
    return {
      valid: false,
      error: "Event name contains invalid characters"
    };
  }
  const reservedWords = ["constructor", "prototype", "__proto__", "eval", "function", "var", "let", "const"];
  if (reservedWords.includes(eventName.toLowerCase())) {
    return {
      valid: false,
      error: "Event name cannot be a reserved word"
    };
  }
  return { valid: true };
};
const isValidMetadata = (eventName, metadata, type) => {
  const sanitizedMetadata = sanitizeMetadata(metadata);
  const intro = `${type} "${eventName}" metadata error`;
  if (!isOnlyPrimitiveFields(sanitizedMetadata)) {
    return {
      valid: false,
      error: `${intro}: object has invalid types. Valid types are string, number, boolean or string arrays.`
    };
  }
  let jsonString;
  try {
    jsonString = JSON.stringify(sanitizedMetadata);
  } catch {
    return {
      valid: false,
      error: `${intro}: object contains circular references or cannot be serialized.`
    };
  }
  if (jsonString.length > MAX_CUSTOM_EVENT_STRING_SIZE) {
    return {
      valid: false,
      error: `${intro}: object is too large (max ${MAX_CUSTOM_EVENT_STRING_SIZE / 1024} KB).`
    };
  }
  const keyCount = Object.keys(sanitizedMetadata).length;
  if (keyCount > MAX_CUSTOM_EVENT_KEYS) {
    return {
      valid: false,
      error: `${intro}: object has too many keys (max ${MAX_CUSTOM_EVENT_KEYS} keys).`
    };
  }
  for (const [key, value] of Object.entries(sanitizedMetadata)) {
    if (Array.isArray(value)) {
      if (value.length > MAX_CUSTOM_EVENT_ARRAY_SIZE) {
        return {
          valid: false,
          error: `${intro}: array property "${key}" is too large (max ${MAX_CUSTOM_EVENT_ARRAY_SIZE} items).`
        };
      }
      for (const item of value) {
        if (typeof item === "string" && item.length > 500) {
          return {
            valid: false,
            error: `${intro}: array property "${key}" contains strings that are too long (max 500 characters).`
          };
        }
      }
    }
    if (typeof value === "string" && value.length > 1e3) {
      return {
        valid: false,
        error: `${intro}: property "${key}" is too long (max 1000 characters).`
      };
    }
  }
  return {
    valid: true,
    sanitizedMetadata
  };
};
const isEventValid = (eventName, metadata) => {
  const nameValidation = isValidEventName(eventName);
  if (!nameValidation.valid) {
    return nameValidation;
  }
  if (!metadata) {
    return { valid: true };
  }
  return isValidMetadata(eventName, metadata, "customEvent");
};
const normalizeUrl = (url, sensitiveQueryParams = []) => {
  try {
    const urlObject = new URL(url);
    const searchParams = urlObject.searchParams;
    let hasChanged = false;
    sensitiveQueryParams.forEach((param) => {
      if (searchParams.has(param)) {
        searchParams.delete(param);
        hasChanged = true;
      }
    });
    if (!hasChanged && url.includes("?")) {
      return url;
    }
    urlObject.search = searchParams.toString();
    return urlObject.toString();
  } catch {
    return url;
  }
};
const isUrlPathExcluded = (url, excludedPaths = []) => {
  if (excludedPaths.length === 0) {
    return false;
  }
  const path = new URL(url, window.location.origin).pathname;
  const isRegularExpression = (value) => typeof value === "object" && value !== void 0 && typeof value.test === "function";
  const escapeRegexString = (string_) => string_.replaceAll(/[$()*+.?[\\\]^{|}]/g, "\\$&");
  const wildcardToRegex = (string_) => new RegExp(
    "^" + string_.split("*").map((element) => escapeRegexString(element)).join(".+") + "$"
  );
  return excludedPaths.some((pattern) => {
    if (isRegularExpression(pattern)) {
      return pattern.test(path);
    }
    if (pattern.includes("*")) {
      return wildcardToRegex(pattern).test(path);
    }
    return pattern === path;
  });
};
const RETRY_BACKOFF_INITIAL = 1e3;
const RETRY_BACKOFF_MAX = 3e4;
const RATE_LIMIT_INTERVAL = 1e3;
const EVENT_EXPIRY_HOURS = 24;
class SenderManager extends StateManager {
  storeManager;
  queueStorageKey;
  retryDelay = RETRY_BACKOFF_INITIAL;
  retryTimeoutId = null;
  lastSendAttempt = 0;
  constructor(storeManager) {
    super();
    this.storeManager = storeManager;
    this.queueStorageKey = `${QUEUE_KEY}_${this.get("userId")}`;
    this.recoverPersistedEvents();
  }
  sendEventsQueue(body) {
    if (this.get("config")?.qaMode) {
      this.logQueue(body);
      return true;
    }
    if (!this.canSendNow()) {
      return false;
    }
    this.lastSendAttempt = Date.now();
    try {
      const success = this.sendQueue(body);
      if (success) {
        this.resetRetryState();
        this.clearPersistedEvents();
      } else {
        this.handleSendFailure(body);
      }
      return success;
    } catch {
      this.handleSendFailure(body);
      return false;
    }
  }
  recoverPersistedEvents() {
    try {
      const persistedData = this.getPersistedData();
      if (!persistedData || !this.isDataRecent(persistedData) || persistedData.events.length === 0) {
        this.clearPersistedEvents();
        return;
      }
      const recoveryBody = this.createRecoveryBody(persistedData);
      const success = this.sendQueue(recoveryBody);
      if (success) {
        this.clearPersistedEvents();
      } else {
        this.scheduleRetry(recoveryBody);
      }
    } catch (error) {
      this.logError("Failed to recover persisted events", error);
    }
  }
  canSendNow() {
    return Date.now() - this.lastSendAttempt >= RATE_LIMIT_INTERVAL;
  }
  sendQueue(body) {
    const blob = new Blob([JSON.stringify(body)], { type: "application/json" });
    if (navigator.sendBeacon && navigator.sendBeacon(this.get("config").apiUrl, blob)) {
      return true;
    }
    return false;
  }
  getPersistedData() {
    const persistedDataString = this.storeManager.getItem(this.queueStorageKey);
    return persistedDataString ? JSON.parse(persistedDataString) : null;
  }
  isDataRecent(data) {
    const ageInHours = (Date.now() - data.timestamp) / (1e3 * 60 * 60);
    return ageInHours < EVENT_EXPIRY_HOURS;
  }
  createRecoveryBody(data) {
    return {
      user_id: data.userId,
      session_id: data.sessionId,
      device: data.device,
      events: data.events,
      ...data.global_metadata && { global_metadata: data.global_metadata }
    };
  }
  logQueue(queue) {
    log(
      "info",
      `Queue structure: ${JSON.stringify({
        user_id: queue.user_id,
        session_id: queue.session_id,
        device: queue.device,
        events_count: queue.events.length,
        has_global_metadata: !!queue.global_metadata
      })}`
    );
  }
  handleSendFailure(body) {
    this.persistFailedEvents(body);
    this.scheduleRetry(body);
  }
  persistFailedEvents(body) {
    try {
      const persistedData = {
        userId: body.user_id,
        sessionId: body.session_id,
        device: body.device,
        events: body.events,
        timestamp: Date.now(),
        ...body.global_metadata && { global_metadata: body.global_metadata }
      };
      this.storeManager.setItem(this.queueStorageKey, JSON.stringify(persistedData));
    } catch (error) {
      this.logError("Failed to persist events", error);
    }
  }
  clearPersistedEvents() {
    this.storeManager.removeItem(this.queueStorageKey);
  }
  resetRetryState() {
    this.retryDelay = RETRY_BACKOFF_INITIAL;
    this.clearRetryTimeout();
  }
  scheduleRetry(body) {
    if (this.retryTimeoutId !== null) {
      return;
    }
    this.retryTimeoutId = window.setTimeout(() => {
      this.retryTimeoutId = null;
      this.sendEventsQueue(body);
    }, this.retryDelay);
    this.retryDelay = Math.min(this.retryDelay * 2, RETRY_BACKOFF_MAX);
  }
  clearRetryTimeout() {
    if (this.retryTimeoutId !== null) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  }
  logError(message, error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log("error", `${message}: ${errorMessage}`);
  }
}
class SamplingManager extends StateManager {
  isSampledIn() {
    const samplingRate = this.get("config").samplingRate ?? DEFAULT_SAMPLING_RATE;
    if (samplingRate >= 1) {
      return true;
    }
    if (samplingRate <= 0) {
      return false;
    }
    const userHash = this.getHash(this.get("userId"));
    const userValue = userHash % 100 / 100;
    const isSampled = userValue < samplingRate;
    return isSampled;
  }
  getHash(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
class EventManager extends StateManager {
  googleAnalytics;
  samplingManager;
  dataSender;
  eventsQueue = [];
  lastEvent = null;
  eventsQueueIntervalId = null;
  constructor(storeManager, googleAnalytics = null) {
    super();
    this.googleAnalytics = googleAnalytics;
    this.samplingManager = new SamplingManager();
    this.dataSender = new SenderManager(storeManager);
  }
  track({ type, page_url, from_page_url, scroll_data, click_data, custom_event }) {
    if (!this.samplingManager.isSampledIn()) {
      return;
    }
    const isDuplicatedEvent = this.isDuplicatedEvent({ type, page_url, scroll_data, click_data, custom_event });
    if (isDuplicatedEvent) {
      const now = Date.now();
      if (this.eventsQueue && this.eventsQueue.length > 0) {
        const lastEvent = this.eventsQueue.at(-1);
        if (lastEvent) {
          lastEvent.timestamp = now;
        }
      }
      if (this.lastEvent) {
        this.lastEvent.timestamp = now;
      }
      return;
    }
    const isRouteExcluded = isUrlPathExcluded(page_url, this.get("config").excludedUrlPaths);
    const isSessionEvent = [EventType.SESSION_START, EventType.SESSION_END].includes(type);
    if (isRouteExcluded && !isSessionEvent) {
      return;
    }
    const isFirstEvent = type === EventType.SESSION_START;
    const removePageUrl = isRouteExcluded && isSessionEvent;
    const utmParams = isFirstEvent ? getUTMParameters() : void 0;
    const payload = {
      type,
      page_url: removePageUrl ? "excluded" : page_url || this.get("pageUrl"),
      timestamp: Date.now(),
      ...isFirstEvent && { referrer: document.referrer || "Direct" },
      ...from_page_url && !removePageUrl && { from_page_url },
      ...scroll_data && { scroll_data },
      ...click_data && { click_data },
      ...custom_event && { custom_event },
      ...utmParams && { utm: utmParams },
      ...removePageUrl && { excluded_route: true }
    };
    this.lastEvent = payload;
    this.processAndSend(payload);
  }
  processAndSend(payload) {
    if (this.get("config")?.qaMode) {
      log("info", `${payload.type} event: ${JSON.stringify(payload)}`);
      if (this.googleAnalytics && payload.type === EventType.CUSTOM) {
        log("info", `Google Analytics event: ${JSON.stringify(payload)}`);
      }
    }
    this.eventsQueue.push(payload);
    if (this.eventsQueue.length > MAX_EVENTS_QUEUE_LENGTH) {
      this.eventsQueue.shift();
    }
    if (!this.eventsQueueIntervalId) {
      this.initEventsQueueInterval();
    }
    if (payload.type === EventType.SESSION_END && this.eventsQueue.length > 0) {
      this.sendEventsQueue();
    }
    if (this.googleAnalytics && payload.type === EventType.CUSTOM) {
      const customEvent = payload.custom_event;
      this.googleAnalytics.trackEvent(customEvent.name, customEvent.metadata ?? {});
    }
  }
  initEventsQueueInterval() {
    if (this.eventsQueueIntervalId) {
      return;
    }
    const interval = this.get("config")?.mode === "test" ? EVENT_SENT_INTERVAL_TEST : EVENT_SENT_INTERVAL;
    this.eventsQueueIntervalId = window.setInterval(() => {
      if (this.eventsQueue.length > 0) {
        this.sendEventsQueue();
      }
    }, interval);
  }
  sendEventsQueue() {
    if (this.eventsQueue.length === 0) {
      return;
    }
    const uniqueEvents = /* @__PURE__ */ new Map();
    for (const event2 of this.eventsQueue) {
      let key = `${event2.type}_${event2.page_url}`;
      if (event2.click_data) {
        key += `_${event2.click_data.x}_${event2.click_data.y}`;
      }
      if (event2.scroll_data) {
        key += `_${event2.scroll_data.depth}_${event2.scroll_data.direction}`;
      }
      if (event2.custom_event) {
        key += `_${event2.custom_event.name}`;
      }
      if (!uniqueEvents.has(key)) {
        uniqueEvents.set(key, event2);
      }
    }
    const deduplicatedEvents = [...uniqueEvents.values()];
    deduplicatedEvents.sort((a, b) => a.timestamp - b.timestamp);
    const body = {
      user_id: this.get("userId"),
      session_id: this.get("sessionId"),
      device: this.get("device"),
      events: deduplicatedEvents,
      ...this.get("config")?.globalMetadata && { global_metadata: this.get("config")?.globalMetadata }
    };
    const success = this.dataSender.sendEventsQueue(body);
    this.eventsQueue = success ? [] : deduplicatedEvents;
  }
  isDuplicatedEvent({ type, page_url, scroll_data, click_data, custom_event }) {
    if (!this.lastEvent) {
      return false;
    }
    if (this.lastEvent.type !== type) {
      return false;
    }
    const currentTime = Date.now();
    const timeDiff = currentTime - this.lastEvent.timestamp;
    const timeDiffThreshold = 1e3;
    if (timeDiff >= timeDiffThreshold) {
      return false;
    }
    switch (type) {
      case EventType.PAGE_VIEW: {
        return this.lastEvent.page_url === page_url;
      }
      case EventType.CLICK: {
        const coordinatesMatch = Math.abs((this.lastEvent.click_data?.x ?? 0) - (click_data?.x ?? 0)) <= 5 && Math.abs((this.lastEvent.click_data?.y ?? 0) - (click_data?.y ?? 0)) <= 5;
        const elementMatch = this.lastEvent.click_data?.tag === click_data?.tag && this.lastEvent.click_data?.id === click_data?.id && this.lastEvent.click_data?.text === click_data?.text;
        return coordinatesMatch && elementMatch;
      }
      case EventType.SCROLL: {
        return this.lastEvent.scroll_data?.depth === scroll_data?.depth && this.lastEvent.scroll_data?.direction === scroll_data?.direction;
      }
      case EventType.CUSTOM: {
        return this.lastEvent.custom_event?.name === custom_event?.name;
      }
      default: {
        return false;
      }
    }
  }
}
class UserManager extends StateManager {
  storageManager;
  constructor(storageManager) {
    super();
    this.storageManager = storageManager;
  }
  getId() {
    const storedUserId = this.storageManager.getItem(USER_ID_KEY);
    if (storedUserId) {
      return storedUserId;
    }
    const newUserId = generateUUID();
    this.storageManager.setItem(USER_ID_KEY, newUserId);
    return newUserId;
  }
}
class ActivityListenerManager {
  onActivity;
  options = { passive: true };
  constructor(onActivity) {
    this.onActivity = onActivity;
  }
  setup() {
    window.addEventListener("scroll", this.onActivity, this.options);
    window.addEventListener("resize", this.onActivity, this.options);
    window.addEventListener("focus", this.onActivity, this.options);
  }
  cleanup() {
    window.removeEventListener("scroll", this.onActivity);
    window.removeEventListener("resize", this.onActivity);
    window.removeEventListener("focus", this.onActivity);
  }
}
class TouchListenerManager {
  onActivity;
  options = { passive: true };
  motionThreshold;
  constructor(onActivity, motionThreshold) {
    this.onActivity = onActivity;
    this.motionThreshold = motionThreshold;
  }
  setup() {
    window.addEventListener("touchstart", this.onActivity, this.options);
    window.addEventListener("touchmove", this.onActivity, this.options);
    window.addEventListener("touchend", this.onActivity, this.options);
    window.addEventListener("orientationchange", this.onActivity, this.options);
    if ("DeviceMotionEvent" in window) {
      window.addEventListener("devicemotion", this.handleDeviceMotion, this.options);
    }
  }
  cleanup() {
    window.removeEventListener("touchstart", this.onActivity);
    window.removeEventListener("touchmove", this.onActivity);
    window.removeEventListener("touchend", this.onActivity);
    window.removeEventListener("orientationchange", this.onActivity);
    if ("DeviceMotionEvent" in window) {
      window.removeEventListener("devicemotion", this.handleDeviceMotion);
    }
  }
  handleDeviceMotion = (event2) => {
    const acceleration = event2.acceleration;
    if (acceleration) {
      const totalAcceleration = Math.abs(acceleration.x ?? 0) + Math.abs(acceleration.y ?? 0) + Math.abs(acceleration.z ?? 0);
      if (totalAcceleration > this.motionThreshold) {
        this.onActivity();
      }
    }
  };
}
class MouseListenerManager {
  onActivity;
  options = { passive: true };
  constructor(onActivity) {
    this.onActivity = onActivity;
  }
  setup() {
    window.addEventListener("mousemove", this.onActivity, this.options);
    window.addEventListener("mousedown", this.onActivity, this.options);
    window.addEventListener("wheel", this.onActivity, this.options);
  }
  cleanup() {
    window.removeEventListener("mousemove", this.onActivity);
    window.removeEventListener("mousedown", this.onActivity);
    window.removeEventListener("wheel", this.onActivity);
  }
}
class KeyboardListenerManager {
  onActivity;
  options = { passive: true };
  constructor(onActivity) {
    this.onActivity = onActivity;
  }
  setup() {
    window.addEventListener("keydown", this.onActivity, this.options);
    window.addEventListener("keypress", this.onActivity, this.options);
  }
  cleanup() {
    window.removeEventListener("keydown", this.onActivity);
    window.removeEventListener("keypress", this.onActivity);
  }
}
class VisibilityListenerManager {
  onActivity;
  onVisibilityChange;
  isMobile;
  options = { passive: true };
  constructor(onActivity, onVisibilityChange, isMobile) {
    this.onActivity = onActivity;
    this.onVisibilityChange = onVisibilityChange;
    this.isMobile = isMobile;
  }
  setup() {
    if ("visibilityState" in document) {
      document.addEventListener("visibilitychange", this.onVisibilityChange, this.options);
    }
    window.addEventListener("blur", this.onVisibilityChange, this.options);
    window.addEventListener("focus", this.onActivity, this.options);
    if ("onLine" in navigator) {
      window.addEventListener("online", this.onActivity, this.options);
      window.addEventListener("offline", this.onVisibilityChange, this.options);
    }
    if (this.isMobile) {
      this.setupMobileEvents();
    }
  }
  cleanup() {
    if ("visibilityState" in document) {
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
    }
    window.removeEventListener("blur", this.onVisibilityChange);
    window.removeEventListener("focus", this.onActivity);
    if ("onLine" in navigator) {
      window.removeEventListener("online", this.onActivity);
      window.removeEventListener("offline", this.onVisibilityChange);
    }
    if (this.isMobile) {
      this.cleanupMobileEvents();
    }
  }
  setupMobileEvents() {
    document.addEventListener("pause", this.onVisibilityChange, this.options);
    document.addEventListener("resume", this.onActivity, this.options);
    if ("orientation" in screen) {
      screen.orientation.addEventListener("change", this.onActivity, this.options);
    }
    window.addEventListener("pageshow", this.onActivity, this.options);
    window.addEventListener("pagehide", this.onActivity, this.options);
  }
  cleanupMobileEvents() {
    document.removeEventListener("pause", this.onVisibilityChange);
    document.removeEventListener("resume", this.onActivity);
    if ("orientation" in screen) {
      screen.orientation.removeEventListener("change", this.onActivity);
    }
    window.removeEventListener("pageshow", this.onActivity);
    window.removeEventListener("pagehide", this.onActivity);
  }
}
class UnloadListenerManager {
  onInactivity;
  options = { passive: true };
  constructor(onInactivity) {
    this.onInactivity = onInactivity;
  }
  setup() {
    window.addEventListener("beforeunload", this.onInactivity, this.options);
    window.addEventListener("pagehide", this.onInactivity, this.options);
  }
  cleanup() {
    window.removeEventListener("beforeunload", this.onInactivity);
    window.removeEventListener("pagehide", this.onInactivity);
  }
}
const DEFAULT_SESSION_CONFIG = {
  timeout: 3e4,
  throttleDelay: 1e3,
  visibilityTimeout: 2e3,
  motionThreshold: 2
};
class SessionManager extends StateManager {
  config;
  onActivity;
  onInactivity;
  deviceCapabilities;
  listenerManagers = [];
  isSessionActive = false;
  lastActivityTime = 0;
  inactivityTimer = null;
  sessionStartTime = 0;
  throttleTimeout = null;
  constructor(onActivity, onInactivity) {
    super();
    this.config = { ...DEFAULT_SESSION_CONFIG, timeout: this.get("config")?.sessionTimeout ?? SESSION_TIMEOUT_MS };
    this.onActivity = onActivity;
    this.onInactivity = onInactivity;
    this.deviceCapabilities = this.detectDeviceCapabilities();
    this.initializeListenerManagers();
    this.setupAllListeners();
  }
  startSession() {
    this.sessionStartTime = Date.now();
    this.isSessionActive = true;
    this.lastActivityTime = Date.now();
    this.resetInactivityTimer();
    return generateUUID();
  }
  endSession() {
    if (this.sessionStartTime === 0) {
      return 0;
    }
    const durationMs = Date.now() - this.sessionStartTime;
    this.sessionStartTime = 0;
    this.isSessionActive = false;
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    return durationMs;
  }
  destroy() {
    this.clearTimers();
    this.cleanupAllListeners();
    this.resetState();
  }
  detectDeviceCapabilities() {
    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const hasMouse = window.matchMedia("(pointer: fine)").matches;
    const hasKeyboard = !window.matchMedia("(pointer: coarse)").matches;
    const isMobile = getDeviceType() === DeviceType.Mobile;
    return { hasTouch, hasMouse, hasKeyboard, isMobile };
  }
  initializeListenerManagers() {
    this.listenerManagers.push(new ActivityListenerManager(this.handleActivity));
    if (this.deviceCapabilities.hasTouch) {
      this.listenerManagers.push(new TouchListenerManager(this.handleActivity, this.config.motionThreshold));
    }
    if (this.deviceCapabilities.hasMouse) {
      this.listenerManagers.push(new MouseListenerManager(this.handleActivity));
    }
    if (this.deviceCapabilities.hasKeyboard) {
      this.listenerManagers.push(new KeyboardListenerManager(this.handleActivity));
    }
    this.listenerManagers.push(
      new VisibilityListenerManager(this.handleActivity, this.handleVisibilityChange, this.deviceCapabilities.isMobile)
    );
    this.listenerManagers.push(new UnloadListenerManager(this.handleInactivity));
  }
  setupAllListeners() {
    this.listenerManagers.forEach((manager) => manager.setup());
  }
  cleanupAllListeners() {
    this.listenerManagers.forEach((manager) => manager.cleanup());
  }
  clearTimers() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    if (this.throttleTimeout) {
      clearTimeout(this.throttleTimeout);
      this.throttleTimeout = null;
    }
  }
  resetState() {
    this.isSessionActive = false;
    this.lastActivityTime = 0;
    this.sessionStartTime = 0;
  }
  handleActivity = () => {
    const now = Date.now();
    if (now - this.lastActivityTime < this.config.throttleDelay) {
      return;
    }
    this.lastActivityTime = now;
    if (this.isSessionActive) {
      this.resetInactivityTimer();
    } else {
      if (this.throttleTimeout) {
        clearTimeout(this.throttleTimeout);
      }
      this.throttleTimeout = window.setTimeout(() => {
        this.onActivity();
        this.throttleTimeout = null;
      }, 100);
    }
  };
  handleInactivity = () => {
    this.onInactivity();
  };
  handleVisibilityChange = () => {
    if (document.hidden) {
      if (this.isSessionActive) {
        if (this.inactivityTimer) {
          clearTimeout(this.inactivityTimer);
        }
        this.inactivityTimer = window.setTimeout(this.handleInactivity, this.config.visibilityTimeout);
      }
    } else {
      this.handleActivity();
    }
  };
  resetInactivityTimer = () => {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    this.inactivityTimer = window.setTimeout(this.handleInactivity, this.config.timeout);
  };
}
class SessionHandler extends StateManager {
  eventManager;
  storageManager;
  sessionManager = null;
  heartbeatInterval = null;
  constructor(storageManager, eventManager) {
    super();
    this.eventManager = eventManager;
    this.storageManager = storageManager;
  }
  startTracking() {
    if (this.sessionManager) {
      return;
    }
    this.checkOrphanedSessions();
    const onActivity = () => {
      if (this.get("sessionId")) {
        return;
      }
      const newSessionId = this.sessionManager.startSession();
      this.set("sessionId", newSessionId);
      this.trackSession(EventType.SESSION_START);
      this.persistSession(newSessionId);
      this.startHeartbeat();
    };
    const onInactivity = () => {
      if (!this.get("sessionId")) {
        return;
      }
      this.sessionManager.endSession();
      this.trackSession(EventType.SESSION_END);
      this.clearPersistedSession();
      this.stopHeartbeat();
      this.set("sessionId", null);
    };
    this.sessionManager = new SessionManager(onActivity, onInactivity);
    this.startInitialSession();
  }
  trackSession(eventType) {
    this.eventManager.track({
      type: eventType
    });
  }
  startInitialSession() {
    if (this.get("sessionId")) {
      return;
    }
    const newSessionId = this.sessionManager.startSession();
    this.set("sessionId", newSessionId);
    this.trackSession(EventType.SESSION_START);
    this.persistSession(newSessionId);
    this.startHeartbeat();
  }
  stopTracking() {
    if (this.sessionManager) {
      if (this.get("sessionId")) {
        this.sessionManager.endSession();
        this.trackSession(EventType.SESSION_END);
        this.clearPersistedSession();
        this.stopHeartbeat();
        this.set("sessionId", null);
      }
      this.sessionManager.destroy();
      this.sessionManager = null;
    }
  }
  checkOrphanedSessions() {
    const storedSessionData = this.storageManager.getItem(SESSION_STORAGE_KEY);
    if (storedSessionData) {
      try {
        const session = JSON.parse(storedSessionData);
        const now = Date.now();
        const timeSinceLastHeartbeat = now - session.lastHeartbeat;
        const sessionTimeout = this.get("config")?.sessionTimeout ?? SESSION_TIMEOUT_MS;
        if (timeSinceLastHeartbeat > sessionTimeout) {
          this.trackSession(EventType.SESSION_END);
          this.clearPersistedSession();
        }
      } catch {
        this.clearPersistedSession();
      }
    }
  }
  persistSession(sessionId) {
    const sessionData = {
      sessionId,
      startTime: Date.now(),
      lastHeartbeat: Date.now()
    };
    this.storageManager.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
  }
  clearPersistedSession() {
    this.storageManager.removeItem(SESSION_STORAGE_KEY);
  }
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      const storedSessionData = this.storageManager.getItem(SESSION_STORAGE_KEY);
      if (storedSessionData) {
        try {
          const session = JSON.parse(storedSessionData);
          session.lastHeartbeat = Date.now();
          this.storageManager.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        } catch {
          this.clearPersistedSession();
        }
      }
    }, SESSION_HEARTBEAT_INTERVAL_MS);
  }
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
class PageViewHandler extends StateManager {
  eventManager;
  onTrack;
  originalPushState;
  originalReplaceState;
  constructor(eventManager, onTrack) {
    super();
    this.eventManager = eventManager;
    this.onTrack = onTrack;
  }
  startTracking() {
    this.trackInitialPageView();
    this.trackCurrentPage();
    window.addEventListener("popstate", this.trackCurrentPage);
    window.addEventListener("hashchange", this.trackCurrentPage);
    this.patchHistory("pushState");
    this.patchHistory("replaceState");
  }
  stopTracking() {
    window.removeEventListener("popstate", this.trackCurrentPage);
    window.removeEventListener("hashchange", this.trackCurrentPage);
    if (this.originalPushState) {
      window.history.pushState = this.originalPushState;
    }
    if (this.originalReplaceState) {
      window.history.replaceState = this.originalReplaceState;
    }
  }
  patchHistory(method) {
    if (method === "pushState" && !this.originalPushState) {
      this.originalPushState = window.history.pushState;
    } else if (method === "replaceState" && !this.originalReplaceState) {
      this.originalReplaceState = window.history.replaceState;
    }
    const original = window.history[method];
    window.history[method] = (...args) => {
      original.apply(window.history, args);
      this.trackCurrentPage();
    };
  }
  trackCurrentPage = () => {
    const rawUrl = window.location.href;
    const normalizedUrl = normalizeUrl(rawUrl, this.get("config").sensitiveQueryParams);
    if (this.get("pageUrl") !== normalizedUrl) {
      const fromUrl = this.get("pageUrl");
      this.set("pageUrl", normalizedUrl);
      this.eventManager.track({
        type: EventType.PAGE_VIEW,
        page_url: this.get("pageUrl"),
        from_page_url: fromUrl
      });
      this.onTrack();
    }
  };
  trackInitialPageView() {
    this.eventManager.track({
      type: EventType.PAGE_VIEW,
      page_url: this.get("pageUrl")
    });
    this.onTrack();
  }
}
const HTML_DATA_ATTR_PREFIX = "data-taki";
const MAX_TEXT_LENGTH = 255;
const INTERACTIVE_SELECTORS = [
  "button",
  "a",
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  "select",
  "textarea",
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  "[routerLink]",
  "[ng-click]",
  "[data-action]",
  "[data-click]",
  "[data-navigate]",
  "[data-toggle]",
  "[onclick]",
  ".btn",
  ".button",
  ".clickable",
  ".nav-link",
  ".menu-item",
  "[data-testid]",
  '[tabindex="0"]'
];
class ClickHandler extends StateManager {
  eventManager;
  clickHandler;
  constructor(eventManager) {
    super();
    this.eventManager = eventManager;
  }
  startTracking() {
    if (this.clickHandler) {
      return;
    }
    this.clickHandler = (event2) => {
      const mouseEvent = event2;
      const clickedElement = mouseEvent.target;
      if (!clickedElement) return;
      const trackingElement = this.findTrackingElement(clickedElement);
      const relevantClickElement = this.getRelevantClickElement(clickedElement);
      const coordinates = this.calculateClickCoordinates(mouseEvent, clickedElement);
      if (trackingElement) {
        const trackingData = this.extractTrackingData(trackingElement);
        if (trackingData) {
          const attributeData = this.createCustomEventData(trackingData);
          this.eventManager.track({
            type: EventType.CUSTOM,
            custom_event: {
              name: attributeData.name,
              ...attributeData.value && { metadata: { value: attributeData.value } }
            }
          });
        }
      }
      const clickData = this.generateClickData(clickedElement, relevantClickElement, coordinates);
      this.eventManager.track({
        type: EventType.CLICK,
        page_url: window.location.href,
        click_data: clickData
      });
    };
    window.addEventListener("click", this.clickHandler, true);
  }
  stopTracking() {
    if (this.clickHandler) {
      window.removeEventListener("click", this.clickHandler, true);
      this.clickHandler = void 0;
    }
  }
  findTrackingElement(element) {
    if (element.hasAttribute(`${HTML_DATA_ATTR_PREFIX}-name`)) {
      return element;
    }
    const closest = element.closest(`[${HTML_DATA_ATTR_PREFIX}-name]`);
    return closest || void 0;
  }
  getRelevantClickElement(element) {
    for (const selector of INTERACTIVE_SELECTORS) {
      try {
        if (element.matches(selector)) {
          return element;
        }
      } catch {
        continue;
      }
    }
    for (const selector of INTERACTIVE_SELECTORS) {
      try {
        const parent = element.closest(selector);
        if (parent) {
          return parent;
        }
      } catch {
        continue;
      }
    }
    return element;
  }
  calculateClickCoordinates(event2, element) {
    const rect = element.getBoundingClientRect();
    const x = event2.clientX;
    const y = event2.clientY;
    const relativeX = rect.width > 0 ? Math.max(0, Math.min(1, Number(((x - rect.left) / rect.width).toFixed(3)))) : 0;
    const relativeY = rect.height > 0 ? Math.max(0, Math.min(1, Number(((y - rect.top) / rect.height).toFixed(3)))) : 0;
    return { x, y, relativeX, relativeY };
  }
  extractTrackingData(trackingElement) {
    const name = trackingElement.getAttribute(`${HTML_DATA_ATTR_PREFIX}-name`);
    const value = trackingElement.getAttribute(`${HTML_DATA_ATTR_PREFIX}-value`);
    if (!name) {
      return void 0;
    }
    return {
      element: trackingElement,
      name,
      ...value && { value }
    };
  }
  generateClickData(clickedElement, relevantElement, coordinates) {
    const { x, y, relativeX, relativeY } = coordinates;
    const text = this.getRelevantText(clickedElement, relevantElement);
    const attributes = this.extractElementAttributes(relevantElement);
    const href = relevantElement.getAttribute("href");
    const title = relevantElement.getAttribute("title");
    const alt = relevantElement.getAttribute("alt");
    const role = relevantElement.getAttribute("role");
    const ariaLabel = relevantElement.getAttribute("aria-label");
    return {
      x,
      y,
      relativeX,
      relativeY,
      tag: relevantElement.tagName.toLowerCase(),
      ...relevantElement.id && { id: relevantElement.id },
      ...relevantElement.className && { class: relevantElement.className },
      ...text && { text },
      ...href && { href },
      ...title && { title },
      ...alt && { alt },
      ...role && { role },
      ...ariaLabel && { ariaLabel },
      ...Object.keys(attributes).length > 0 && { dataAttributes: attributes }
    };
  }
  getRelevantText(clickedElement, relevantElement) {
    const LARGE_CONTAINER_TAGS = ["main", "section", "article", "body", "html", "header", "footer", "aside", "nav"];
    const clickedText = clickedElement.textContent?.trim() ?? "";
    const relevantText = relevantElement.textContent?.trim() ?? "";
    if (!clickedText && !relevantText) {
      return "";
    }
    if (clickedText && clickedText.length <= MAX_TEXT_LENGTH) {
      return clickedText;
    }
    const isLargeContainer = LARGE_CONTAINER_TAGS.includes(relevantElement.tagName.toLowerCase());
    const hasExcessiveText = relevantText.length > MAX_TEXT_LENGTH * 2;
    if (isLargeContainer && hasExcessiveText) {
      return clickedText && clickedText.length <= MAX_TEXT_LENGTH ? clickedText : "";
    }
    if (relevantText.length <= MAX_TEXT_LENGTH) {
      return relevantText;
    }
    if (clickedText && clickedText.length < relevantText.length * 0.1) {
      return clickedText.length <= MAX_TEXT_LENGTH ? clickedText : clickedText.slice(0, MAX_TEXT_LENGTH) + "...";
    }
    return relevantText.slice(0, MAX_TEXT_LENGTH) + "...";
  }
  extractElementAttributes(element) {
    const commonAttributes = ["id", "class", "data-testid", "aria-label", "title", "href", "type", "name"];
    const result = {};
    for (const attributeName of commonAttributes) {
      const value = element.getAttribute(attributeName);
      if (value) {
        result[attributeName] = value;
      }
    }
    return result;
  }
  createCustomEventData(trackingData) {
    return {
      name: trackingData.name,
      ...trackingData.value && { value: trackingData.value }
    };
  }
}
class ScrollHandler extends StateManager {
  eventManager;
  containers = [];
  constructor(eventManager) {
    super();
    this.eventManager = eventManager;
  }
  startTracking() {
    const raw = this.get("config").scrollContainerSelectors;
    const selectors = Array.isArray(raw) ? raw : typeof raw === "string" ? [raw] : [];
    const elements = selectors.map((sel) => document.querySelector(sel)).filter((element) => element instanceof HTMLElement);
    if (elements.length === 0) {
      elements.push(window);
    }
    for (const element of elements) {
      this.setupScrollContainer(element);
    }
  }
  stopTracking() {
    for (const container of this.containers) {
      if (container.debounceTimer) {
        clearTimeout(container.debounceTimer);
      }
      if (container.element instanceof Window) {
        window.removeEventListener("scroll", container.listener);
      } else {
        container.element.removeEventListener("scroll", container.listener);
      }
    }
    this.containers.length = 0;
  }
  setupScrollContainer(element) {
    const container = {
      element,
      lastScrollPos: 0,
      debounceTimer: null,
      listener: () => {
      }
      // Will be set below
    };
    const handleScroll = () => {
      if (this.get("suppressNextScroll")) {
        this.set("suppressNextScroll", false);
        return;
      }
      if (container.debounceTimer) {
        clearTimeout(container.debounceTimer);
      }
      container.debounceTimer = setTimeout(() => {
        const scrollData = this.calculateScrollData(container);
        if (scrollData) {
          this.eventManager.track({
            type: EventType.SCROLL,
            scroll_data: scrollData
          });
        }
        container.debounceTimer = null;
      }, SCROLL_DEBOUNCE_TIME);
    };
    container.listener = handleScroll;
    this.containers.push(container);
    if (element instanceof Window) {
      window.addEventListener("scroll", handleScroll, { passive: true });
    } else {
      element.addEventListener("scroll", handleScroll, { passive: true });
    }
  }
  calculateScrollData(container) {
    const { element, lastScrollPos } = container;
    const scrollTop = this.getScrollTop(element);
    const viewportHeight = this.getViewportHeight(element);
    const scrollHeight = this.getScrollHeight(element);
    const direction = scrollTop > lastScrollPos ? ScrollDirection.DOWN : ScrollDirection.UP;
    const depth = scrollHeight > viewportHeight ? Math.min(100, Math.max(0, Math.floor(scrollTop / (scrollHeight - viewportHeight) * 100))) : 0;
    const positionDelta = Math.abs(scrollTop - lastScrollPos);
    if (positionDelta < SIGNIFICANT_SCROLL_DELTA) {
      return null;
    }
    container.lastScrollPos = scrollTop;
    return { depth, direction };
  }
  getScrollTop(element) {
    return element instanceof Window ? window.scrollY : element.scrollTop;
  }
  getViewportHeight(element) {
    return element instanceof Window ? window.innerHeight : element.clientHeight;
  }
  getScrollHeight(element) {
    return element instanceof Window ? document.documentElement.scrollHeight : element.scrollHeight;
  }
}
class GoogleAnalyticsIntegration extends StateManager {
  isInitialized = false;
  constructor() {
    super();
    if (this.isInitialized) {
      return;
    }
    const measurementId = this.get("config").integrations?.googleAnalytics?.measurementId;
    if (!measurementId?.trim()) {
      log("warning", "Google Analytics initialization skipped: measurementId not configured");
      return;
    }
    const userId = this.get("userId");
    if (!userId?.trim()) {
      log("warning", "Google Analytics initialization skipped: userId not available");
      return;
    }
    this.loadScript(measurementId);
    this.configureGtag(measurementId, userId);
    this.isInitialized = true;
  }
  trackEvent(eventName, metadata) {
    if (!eventName?.trim()) {
      log("warning", "Google Analytics event tracking skipped: invalid eventName");
      return;
    }
    if (!this.isInitialized || typeof window.gtag !== "function") {
      return;
    }
    try {
      window.gtag("event", eventName, metadata);
    } catch (error) {
      log(
        "warning",
        `Error tracking Google Analytics event (${eventName}): ${error instanceof Error ? error.message : error}`
      );
    }
  }
  cleanup() {
    this.isInitialized = false;
    const script = document.getElementById("datataki-ga-script");
    if (script) {
      script.remove();
    }
  }
  loadScript(measurementId) {
    if (document.getElementById("datataki-ga-script")) {
      return;
    }
    try {
      const script = document.createElement("script");
      script.id = "datataki-ga-script";
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      script.onerror = () => {
        log("warning", "Failed to load Google Analytics script");
      };
      document.head.appendChild(script);
    } catch (error) {
      log("warning", `Error loading Google Analytics script: ${error instanceof Error ? error.message : error}`);
    }
  }
  configureGtag(measurementId, userId) {
    window.gtag = window.gtag ?? function(...args) {
      (window.dataLayer = window.dataLayer ?? []).push(args);
    };
    window.gtag("js", /* @__PURE__ */ new Date());
    window.gtag("config", measurementId, {
      user_id: userId
    });
  }
}
class StorageManager {
  storage = null;
  fallbackStorage = /* @__PURE__ */ new Map();
  constructor() {
    this.storage = this.init();
  }
  getItem(key) {
    try {
      if (this.storage) {
        return this.storage.getItem(key);
      }
      return this.fallbackStorage.get(key) ?? null;
    } catch {
      return this.fallbackStorage.get(key) ?? null;
    }
  }
  setItem(key, value) {
    try {
      if (this.storage) {
        this.storage.setItem(key, value);
        return;
      }
      this.fallbackStorage.set(key, value);
    } catch {
      this.fallbackStorage.set(key, value);
    }
  }
  removeItem(key) {
    try {
      if (this.storage) {
        this.storage.removeItem(key);
        return;
      }
      this.fallbackStorage.delete(key);
    } catch {
      this.fallbackStorage.delete(key);
    }
  }
  init() {
    try {
      const test = "__storage_test__";
      const storage = window["localStorage"];
      storage.setItem(test, test);
      storage.removeItem(test);
      return storage;
    } catch {
      return null;
    }
  }
}
class App extends StateManager {
  isInitialized = false;
  googleAnalytics = null;
  storageManager;
  eventManager;
  sessionHandler;
  pageViewHandler;
  clickHandler;
  scrollHandler;
  suppressNextScrollTimer = null;
  init(config) {
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
  sendCustomEvent(name, metadata) {
    const { valid, error, sanitizedMetadata } = isEventValid(name, metadata);
    if (valid) {
      this.eventManager.track({
        type: EventType.CUSTOM,
        custom_event: {
          name,
          ...sanitizedMetadata && { metadata: sanitizedMetadata }
        }
      });
    } else if (this.get("config")?.qaMode) {
      throw new Error(
        `custom event "${name}" validation failed (${error ?? "unknown error"}). Please, review your event data and try again.`
      );
    }
  }
  destroy() {
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
  async setState(config) {
    this.setConfig(config);
    this.setUserId();
    this.setDevice();
    this.setPageUrl();
  }
  setConfig(config) {
    this.set("config", {
      ...config,
      ...["test", "demo"].includes(config.mode) && {
        qaMode: true,
        samplingRate: 1
      }
    });
  }
  setUserId() {
    const userManager = new UserManager(this.storageManager);
    const userId = userManager.getId();
    this.set("userId", userId);
  }
  setDevice() {
    const device = getDeviceType();
    this.set("device", device);
  }
  setPageUrl() {
    const initialUrl = normalizeUrl(window.location.href, this.get("config").sensitiveQueryParams);
    this.set("pageUrl", initialUrl);
  }
  setIntegrations() {
    const measurementId = this.get("config").integrations?.googleAnalytics?.measurementId;
    if (measurementId?.trim()) {
      this.googleAnalytics = new GoogleAnalyticsIntegration();
    }
  }
  initHandlers() {
    this.initSessionHandler();
    this.initPageViewHandler();
    this.initClickHandler();
    this.initScrollHandler();
  }
  initStorage() {
    this.storageManager = new StorageManager();
  }
  setEventManager() {
    this.eventManager = new EventManager(this.storageManager, this.googleAnalytics);
  }
  initSessionHandler() {
    this.sessionHandler = new SessionHandler(this.storageManager, this.eventManager);
    this.sessionHandler.startTracking();
  }
  initPageViewHandler() {
    const onPageViewTrack = () => this.onPageViewTrack();
    this.pageViewHandler = new PageViewHandler(this.eventManager, onPageViewTrack);
    this.pageViewHandler.startTracking();
  }
  onPageViewTrack() {
    this.set("suppressNextScroll", true);
    if (this.suppressNextScrollTimer) {
      clearTimeout(this.suppressNextScrollTimer);
    }
    this.suppressNextScrollTimer = setTimeout(() => {
      this.set("suppressNextScroll", false);
    }, SCROLL_DEBOUNCE_TIME * 2);
  }
  initClickHandler() {
    this.clickHandler = new ClickHandler(this.eventManager);
    this.clickHandler.startTracking();
  }
  initScrollHandler() {
    this.scrollHandler = new ScrollHandler(this.eventManager);
    this.scrollHandler.startTracking();
  }
}
const types = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  DeviceType,
  EventType,
  ScrollDirection
}, Symbol.toStringTag, { value: "Module" }));
let app = null;
let isInitializing = false;
const init = (config) => {
  try {
    if (app) {
      throw new Error("App is already initialized. Call getApp() to get the existing instance.");
    }
    if (isInitializing) {
      throw new Error("App initialization is already in progress");
    }
    isInitializing = true;
    const validatedConfig = validateAndNormalizeConfig(config);
    const instance = new App();
    instance.init(validatedConfig);
    app = instance;
  } catch (error) {
    app = null;
    log("error", `Initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  } finally {
    isInitializing = false;
  }
};
const event = (name, metadata) => {
  try {
    if (!app) {
      throw new Error("App not initialized");
    }
    app.sendCustomEvent(name, metadata);
  } catch (error) {
    log("error", `Event tracking failed: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.message === "App not initialized") {
      throw error;
    }
  }
};
const destroy = () => {
  try {
    if (!app) {
      throw new Error("App not initialized");
    }
    app.destroy();
    app = null;
    isInitializing = false;
  } catch (error) {
    log("error", `Cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};
const api = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  SESSION_TIMEOUT_MS,
  Types: types,
  destroy,
  event,
  init
}, Symbol.toStringTag, { value: "Module" }));
export {
  api as Datataki
};
