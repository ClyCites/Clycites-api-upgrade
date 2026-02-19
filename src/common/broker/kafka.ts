import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';
import config from '../config';
import logger from '../utils/logger';

// ─── Runtime flag ─────────────────────────────────────────────────────────────
// Set  KAFKA_ENABLED=true  in your environment to activate Kafka.
// When the flag is absent or set to anything other than "true" the broker
// silently skips publishing so the API runs without a Kafka cluster.
// ─────────────────────────────────────────────────────────────────────────────

export const isKafkaEnabled = (): boolean => config.kafka.enabled;

let kafka: Kafka | null = null;
let producer: Producer | null = null;

const getKafka = (): Kafka => {
  if (!kafka) {
    kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
      logLevel: logLevel.ERROR,
    });
  }
  return kafka;
};

export const getProducer = async (): Promise<Producer> => {
  if (!isKafkaEnabled()) {
    throw new Error(
      'Kafka is disabled (KAFKA_ENABLED != true). Set KAFKA_ENABLED=true to use the producer.',
    );
  }
  if (!producer) {
    producer = getKafka().producer();
    await producer.connect();
  }
  return producer;
};

export const createConsumer = async (groupId?: string): Promise<Consumer> => {
  if (!isKafkaEnabled()) {
    throw new Error(
      'Kafka is disabled (KAFKA_ENABLED != true). Set KAFKA_ENABLED=true to use consumers.',
    );
  }
  const consumer = getKafka().consumer({ groupId: groupId || config.kafka.groupId });
  await consumer.connect();
  return consumer;
};

/**
 * Publish an event to a Kafka topic.
 *
 * - When KAFKA_ENABLED=true  → sends the message to the real Kafka broker.
 * - When KAFKA_ENABLED≠true  → logs the event locally and returns (no-op).
 *
 * The function never throws; failures are swallowed and logged so that
 * the calling business logic is never interrupted by broker issues.
 */
export const publishEvent = async (
  topic: string,
  payload: Record<string, unknown>,
): Promise<void> => {
  if (!isKafkaEnabled()) {
    logger.debug(`[EventBus/local] topic=${topic} payload=${JSON.stringify(payload)}`);
    return;
  }

  try {
    const kafkaProducer = await getProducer();
    await kafkaProducer.send({
      topic,
      messages: [{ value: JSON.stringify(payload) }],
    });
  } catch (error) {
    logger.error(`Kafka publish failed on topic "${topic}": ${error}`);
  }
};

/**
 * Gracefully disconnect the shared producer.
 * Call this during application shutdown when Kafka is enabled.
 */
export const disconnectProducer = async (): Promise<void> => {
  if (producer) {
    await producer.disconnect();
    producer = null;
  }
};
