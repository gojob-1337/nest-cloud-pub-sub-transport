import { waitForAssertion } from '@gojob/wait-for-assertion';
import { __clientMock, __resetClientMock } from '@google-cloud/pubsub';
import { INestApplication } from '@nestjs/common';
import { MessageHandler } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { EventEmitter } from 'events';

import { CloudServerPubSub } from '../../server/server-cloud-pub-sub';
import { CloudPubSubMessage } from '../../typings/cloud-pub-sub-message';

type MockLogger = Record<'log' | 'error', jest.Mock>;
type StrategyOptions = Required<ConstructorParameters<typeof CloudServerPubSub>>[0]['options'];

const topicName = 'nest-test-topic';
const subscriptionName = 'nest-test-subscription';

const createTestApp = async (
  mockLogger: MockLogger,
  strategyOptions?: StrategyOptions,
): Promise<[INestApplication, Map<string, MessageHandler>]> => {
  const testingModule = await Test.createTestingModule({})
    .overrideProvider('LoggerService')
    .useValue(mockLogger)
    .compile();

  const app = await testingModule.createNestApplication();
  const strategy = new CloudServerPubSub({
    options: {
      defaultTopic: topicName,
      defaultSubscription: subscriptionName,
      logger: mockLogger as any,
      ...strategyOptions,
    },
  });
  app.connectMicroservice({ strategy });

  await app.startAllMicroservices();
  await app.init();

  return [app, strategy.getHandlers()];
};

describe('CloudServerPubSub', () => {
  let app: INestApplication;
  let eventHandlers: Map<string, MessageHandler>;
  let mockLogger: MockLogger;

  let mockSubscription: EventEmitter;
  let mockEventHandler: jest.Mock;

  beforeAll(() => {
    mockLogger = { log: jest.fn(), error: jest.fn() };
    mockEventHandler = jest.fn();
  });

  beforeEach(() => {
    mockLogger.log.mockReset();
    mockLogger.error.mockReset();
    mockEventHandler.mockReset();
  });

  describe('Handling messages from Google Pub/Sub Clients', () => {
    const pattern = 'mission-updated';
    const emitMessage = (message: Partial<CloudPubSubMessage>) => mockSubscription.emit('message', message);
    const buildMessage = (stringifiedData: string): Partial<CloudPubSubMessage> => ({
      ack: jest.fn(),
      nack: jest.fn(),
      data: Buffer.from(stringifiedData),
    });

    /**
     * Prepare the app and its strategy for testing: create mocks and before/after
     * hooks. Allow configuring the strategy without boilerplating the app
     * bootstrapping and closing.
     *
     * @param options Optional object with extra configuration for the CloudServerPubSub strategy.
     */
    const prepareStrategyTesting = (options?: StrategyOptions) => {
      beforeAll(async () => {
        mockSubscription = new EventEmitter();

        __resetClientMock(__clientMock, mockSubscription);
        [app, eventHandlers] = await createTestApp(mockLogger, options);
        eventHandlers.set(pattern, mockEventHandler);
      });

      afterAll(async () => {
        await app.close();
      });
    };

    describe('When directly ACKing messages', () => {
      // bootstrap the app with a default configuration for the strategy
      prepareStrategyTesting();

      describe('Invalid messages', () => {
        it('ACKs the message and logs an error if it has an invalid structure', () => {
          const rawData = 'huhu';
          const message = buildMessage(rawData);

          emitMessage(message);

          expect(message.ack).toHaveBeenCalled();
          expect(mockLogger.error).toHaveBeenCalledWith(`Invalid message received (${subscriptionName})`, {
            rawData,
            subscriptionName,
          });
          expect(mockEventHandler).not.toHaveBeenCalled();
        });

        it('ACKs the message and logs an error when no handler exists for its pattern', () => {
          const unknownPattern = 'this-one-does-not-exist';
          const messageData = { pattern: unknownPattern, data: {} };
          const message = buildMessage(JSON.stringify(messageData));

          emitMessage(message);

          expect(message.ack).toHaveBeenCalled();
          expect(mockLogger.error).toHaveBeenCalledWith(`No handler exists for "${unknownPattern}"`, {
            messageData,
            subscriptionName,
          });
          expect(mockEventHandler).not.toHaveBeenCalled();
        });
      });

      describe('Valid messages', () => {
        it('ACKS the message and calls the proper handler for its pattern', () => {
          const data = { input: 4 };
          const message = buildMessage(JSON.stringify({ pattern, data }));

          emitMessage(message);

          expect(message.ack).toHaveBeenCalled();
          expect(mockEventHandler).toHaveBeenCalledWith(data);
        });
      });
    });

    describe('When "ackAfterHandler" is true', () => {
      // customize the strategy to enable the "post-handler ACK"
      prepareStrategyTesting({ ackAfterHandler: true });

      describe('Invalid messages', () => {
        it('does not ACK the message if it is invalid', () => {
          const message = buildMessage('huhu');

          emitMessage(message);

          expect(message.ack).not.toHaveBeenCalled();
        });
      });

      describe('Valid messages', () => {
        it('does not ACK the message if its handler throws an error, but logs it', () => {
          const error = new Error('Handlers gonna handle');
          mockEventHandler.mockRejectedValue(error);
          const data = { input: 4 };
          const message = buildMessage(JSON.stringify({ pattern, data }));

          emitMessage(message);

          return waitForAssertion(() => {
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/error from the handler/i), {
              error,
              messageData: { pattern, data },
              subscriptionName,
            });
            expect(message.nack).toHaveBeenCalled();
          });
        });

        it('ACK the message if its handler does not throw', () => {
          const data = { input: 4 };
          const message = buildMessage(JSON.stringify({ pattern, data }));

          emitMessage(message);

          return waitForAssertion(() => expect(message.ack).toHaveBeenCalled());
        });
      });
    });
  });
});
