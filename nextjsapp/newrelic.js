"use strict";

/**
 * New Relic Node.js agent configuration.
 * Loaded via NODE_OPTIONS on `next start` and Docker only.
 *
 * @see https://docs.newrelic.com/docs/apm/agents/nodejs-agent/installation-configuration/nodejs-agent-configuration
 */
exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME || "nextjsapp"],
  license_key: process.env.NEW_RELIC_LICENSE_KEY || "",
  distributed_tracing: {
    enabled: true,
  },
  application_logging: {
    enabled: true,
    forwarding: {
      enabled: true,
    },
    metrics: {
      enabled: true,
    },
  },
  logging: {
    level: "info",
  },
  allow_all_headers: true,
  attributes: {
    exclude: [
      "request.headers.cookie",
      "request.headers.authorization",
      "request.headers.proxyAuthorization",
      "request.headers.setCookie*",
      "request.headers.x*",
      "response.headers.cookie",
      "response.headers.authorization",
      "response.headers.proxyAuthorization",
      "response.headers.setCookie*",
      "response.headers.x*",
    ],
  },
};

// Attach release version for APM (same Major.Minor.Patch.Revision as Pino / Docker).
if (typeof process !== "undefined" && process.env) {
  process.env.NEW_RELIC_METADATA_SERVICE_VERSION =
    process.env.NEW_RELIC_METADATA_SERVICE_VERSION ||
    process.env.APP_VERSION ||
    "0.0.0.0-local";
}
