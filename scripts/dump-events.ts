/**
 * Print the canonical webhook event registry as JSON. Used to keep the
 * Python SDK mirror in sync with the TypeScript source of truth.
 *
 * Usage:
 *   npx tsx ouro-js/scripts/dump-events.ts > ouro-py/tests/fixtures/webhook_events.json
 */
import { WEBHOOK_EVENT_TYPES } from "../src/schema/events"

console.log(JSON.stringify(WEBHOOK_EVENT_TYPES, null, 2))
