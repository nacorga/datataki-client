# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-04

### 🎉 Initial Release

This is the first stable release of Datataki Client - a lightweight client-side event tracking library for modern web applications.

### ✨ Features

#### **Core Tracking**
- **Automatic Session Tracking**: Intelligent session management with configurable timeout (default 15 minutes)
- **Page View Tracking**: Automatic tracking of page views with support for Single Page Applications (SPA)
- **Click Event Tracking**: Comprehensive click tracking with element identification and metadata
- **Scroll Event Tracking**: Debounced scroll tracking with customizable container selectors
- **Custom Events**: Flexible custom event tracking with validation and rich metadata support

#### **Device & Environment Detection**
- **Device Type Detection**: Automatic detection of mobile, tablet, and desktop devices
- **Touch/Mouse/Keyboard Capability Detection**: Smart detection of input capabilities
- **UTM Parameter Extraction**: Automatic extraction and tracking of UTM campaign parameters
- **URL Normalization**: Intelligent URL cleaning with sensitive parameter filtering

#### **Privacy & Performance**
- **Privacy-Focused**: No cookies used, localStorage only for session persistence
- **Performance Optimized**: Event batching, debouncing, and smart queuing (< 15KB bundle size)
- **Sampling Support**: Configurable sampling rates for high-traffic applications
- **Background Processing**: Non-blocking event processing with intelligent batching

#### **Developer Experience**
- **TypeScript Ready**: Full TypeScript definitions and type safety
- **Multiple Module Formats**: Support for ESM, CommonJS, and browser bundles
- **Validation System**: Comprehensive event and configuration validation
- **QA Mode**: Enhanced error reporting and debugging capabilities
- **Flexible Configuration**: Extensive configuration options for customization

#### **Integration Support**
- **Google Analytics Integration**: Optional Google Analytics 4 integration
- **Custom API Endpoints**: Configurable API endpoints for data transmission
- **Event Queue Management**: Intelligent queue management with overflow protection
- **Error Handling**: Graceful error handling with detailed logging

#### **Session Management**
- **Activity Detection**: Multi-input activity detection (mouse, keyboard, touch, device motion)
- **Session Persistence**: Robust session persistence across page reloads
- **Heartbeat System**: Periodic session validation and orphaned session cleanup
- **Visibility Handling**: Smart handling of page visibility changes and tab switching

#### **Advanced Features**
- **SPA Navigation Support**: Native support for pushState/replaceState navigation
- **Custom Scroll Containers**: Support for tracking scroll within specific elements
- **Event Deduplication**: Intelligent duplicate event detection and prevention
- **Excluded URL Patterns**: Configurable URL exclusion patterns
- **Global Metadata**: Automatic attachment of global metadata to all events

### 🛠️ Technical Specifications

- **Bundle Size**: < 15KB gzipped
- **Browser Support**: Modern browsers with ES2017+ support
- **Dependencies**: Zero runtime dependencies
- **Module Formats**: ESM, CommonJS, Browser UMD
- **TypeScript**: Full TypeScript support with complete type definitions

### 📦 Package Exports

- **ESM**: `./dist/esm/public-api.js`
- **CommonJS**: `./dist/cjs/public-api.js`
- **Types**: `./dist/esm/public-api.d.ts`
- **Browser**: Available via build process

### 🔒 Privacy Features

- **No Cookies**: Uses localStorage exclusively for session management
- **Sensitive Data Filtering**: Automatic filtering of sensitive URL parameters
- **Local Processing**: All event processing happens client-side
- **Configurable Data Collection**: Fine-grained control over what data is collected

### 🚀 Getting Started

```typescript
import { Datataki } from '@datataki/client';

// Initialize tracking
Datataki.init({
  apiUrl: 'https://your-api-endpoint.com',
  mode: 'default',
  sessionTimeout: 900000, // 15 minutes
  samplingRate: 1.0,
  globalMetadata: {
    appVersion: '1.0.0',
    environment: 'production'
  }
});

// Send custom event
Datataki.event('user_signup', {
  method: 'email',
  plan: 'premium',
  source: 'landing_page'
});
```
