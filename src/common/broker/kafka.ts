import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';
import config from '../config';
import logger from '../utils/logger';

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
  if (!producer) {
    producer = getKafka().producer();
    await producer.connect();
  }

  return producer;
};

export const createConsumer = async (groupId?: string): Promise<Consumer> => {
  const consumer = getKafka().consumer({ groupId: groupId || config.kafka.groupId });
  await consumer.connect();
  return consumer;
};

export const publishEvent = async (topic: string, payload: Record<string, unknown>): Promise<void> => {
  try {
    const kafkaProducer = await getProducer();
    await kafkaProducer.send({
      topic,
      messages: [
        {
          value: JSON.stringify(payload),
        },
      ],
    });
  } catch (error) {
    logger.error(`Kafka publish failed: ${error}`);
  }
};
