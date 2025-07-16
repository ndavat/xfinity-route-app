# Sentry Integration Guide

This document provides a comprehensive overview of the Sentry integration for the Xfinity Router App. It covers the configuration, architecture, and usage of Sentry for remote debugging and error monitoring.

## 1. Overview

Sentry is integrated into this project to provide robust remote logging, crash reporting, and performance monitoring. The integration is designed to work alongside the existing custom logging system, providing a powerful combination of local and remote debugging capabilities.

## 2. Configuration

The Sentry integration is configured through three main files:

- **`App.tsx`**: This is where the Sentry SDK is initialized. The DSN (Data Source Name) is configured here.
- **`app.config.js`**: The Sentry Expo plugin is configured in this file. This plugin handles the automatic upload of source maps and native configuration.
- **`sentry.properties`**: This file contains the Sentry CLI configuration, including the organization slug, project slug, and auth token.

**IMPORTANT**: Before building the application, you must replace the placeholder values in these files with your actual Sentry credentials.

## 3. Architecture

The Sentry integration is designed to be a transport layer for the existing custom `Logger`. The `SentryTransport` class is responsible for forwarding logs and crash reports to the Sentry SDK.

The data flow is as follows:

1.  The application calls the custom `Logger`'s methods (`info`, `warn`, `error`, etc.).
2.  The `Logger` processes the log entry and writes it to the local log file.
3.  The `Logger` then forwards the log entry to the `SentryTransport`.
4.  The `SentryTransport` converts the log entry into a Sentry breadcrumb or event and sends it to the Sentry SDK.
5.  The Sentry SDK sends the data to the Sentry.io service.

## 4. Usage

### Logging

All logs with a level of `INFO` or higher are automatically sent to Sentry as breadcrumbs. Errors and fatal exceptions are sent as Sentry events.

### User and Session Tracking

The `Logger.setUser()` method can be used to associate logs and errors with the current user. This is useful for tracking user-specific issues.

### Testing

A `SentryDebugScreen` is available at the `/SentryDebug` route. This screen provides buttons to:

-   Send informational, warning, and error logs to Sentry.
-   Trigger a native crash to test crash reporting.
-   Set the current user for Sentry reporting.

This screen is essential for verifying that the Sentry integration is working correctly.

## 5. Source Map Uploads

Source maps are automatically uploaded during the build process by the Sentry Expo plugin. This ensures that stack traces in Sentry are readable and point to the correct source code.

For source map uploads to work, you must have a valid `sentry.properties` file with a correct auth token.

## 6. Obtaining Sentry Credentials

To get the required credentials, you will need to log in to your Sentry account at [sentry.io](https://sentry.io).

### DSN (Data Source Name)

1.  Navigate to **Settings > Projects**.
2.  Select your project.
3.  In the project settings, go to **Client Keys (DSN)**.
4.  Copy the DSN value and paste it into `App.tsx`.

### Organization and Project Slugs

Your organization and project slugs are part of the URL when you are viewing your project in Sentry. For example, if your project URL is `https://sentry.io/organizations/my-cool-org/projects/my-awesome-app/`, then:

-   **Organization Slug**: `my-cool-org`
-   **Project Slug**: `my-awesome-app`

You can also find these in your organization and project settings.

### Auth Token

1.  Navigate to **Settings > Developer Settings**.
2.  Click on **New Internal Integration**.
3.  Give the integration a name (e.g., "Xfinity App CLI").
4.  Under "Permissions", select "Admin" for "Project" and "Read" for "Organization".
5.  Click **Save Changes**.
6.  On the next screen, you will see your auth token. Copy this token and paste it into your `sentry.properties` file.

**Note**: Treat your auth token like a password. Do not commit it to your version control system. It is recommended to use environment variables or a secret management system to handle the auth token in a production environment.