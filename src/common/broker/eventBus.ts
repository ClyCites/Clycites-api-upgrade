/**
 * eventBus.ts — transport-agnostic event publishing
 *
 * All application modules should import `publish` (and optionally
 * `isEventBusLive`) from this file instead of importing directly
 * from kafka.ts.  This keeps business logic decoupled from the
 * underlying broker so the API runs in two modes:
 *
 *  Mode A — Kafka enabled  (KAFKA_ENABLED=true in env)
 *    Events are sent to the configured Kafka cluster.
 *
 *  Mode B — Kafka disabled (default / no env var)
 *    Events are logged locally at DEBUG level and dropped.
 *    No connection to Kafka is attempted, so the API starts fine
 *    without a running Kafka cluster.
 *
 * To switch modes just set / unset the environment variable:
 *   KAFKA_ENABLED=true   → Mode A
 *   KAFKA_ENABLED=false  → Mode B  (or omit the variable entirely)
 */

import logger from '../utils/logger';
import { publishEvent, isKafkaEnabled } from './kafka';

// ─── Boot-time log ────────────────────────────────────────────────────────────
const mode = isKafkaEnabled() ? 'Kafka (KAFKA_ENABLED=true)' : 'local/no-op (KAFKA_ENABLED not set)';
logger.info(`[EventBus] Running in ${mode} mode`);

/**
 * Publish a domain event.
 *
 * @param topic   - Kafka topic name (also used as event category in local mode)
 * @param payload - Arbitrary JSON-serialisable event payload
 */
export const publish = async (
  topic: string,
  payload: Record<string, unknown>,
): Promise<void> => {
  await publishEvent(topic, payload);
};

/**
 * Returns true when the API is connected to a real Kafka cluster.
 * Use this for health-check endpoints or conditional consumer setup.
 */
export const isEventBusLive = (): boolean => isKafkaEnabled();

// Re-export the low-level helper for modules that need it (e.g. consumer setup)
export { isKafkaEnabled, publishEvent, createConsumer, getProducer, disconnectProducer } from './kafka';
