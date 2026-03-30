/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actionItems from "../actionItems.js";
import type * as crons from "../crons.js";
import type * as environments from "../environments.js";
import type * as healthChecks from "../healthChecks.js";
import type * as klaviyo_actions from "../klaviyo/actions.js";
import type * as klaviyo_client from "../klaviyo/client.js";
import type * as klaviyo_scoring from "../klaviyo/scoring.js";
import type * as klaviyo_thresholds from "../klaviyo/thresholds.js";
import type * as lib_environments from "../lib/environments.js";
import type * as metrics from "../metrics.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  actionItems: typeof actionItems;
  crons: typeof crons;
  environments: typeof environments;
  healthChecks: typeof healthChecks;
  "klaviyo/actions": typeof klaviyo_actions;
  "klaviyo/client": typeof klaviyo_client;
  "klaviyo/scoring": typeof klaviyo_scoring;
  "klaviyo/thresholds": typeof klaviyo_thresholds;
  "lib/environments": typeof lib_environments;
  metrics: typeof metrics;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
