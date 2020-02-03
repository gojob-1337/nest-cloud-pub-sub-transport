import { __clientMock, __resetClientMock, PubSub } from '@google-cloud/pubsub';
import { Logger } from '@nestjs/common';
import { Server } from '@nestjs/microservices';

import { CloudServerPubSub } from '../../server/cloud-server-pub-sub';

describe('CloudServerPubSub', () => {
  let spyLogger: jest.SpyInstance;
  const DEFAULT_LOGGER_CONTEXT = Server.name;
  let mockPubSubClient: Record<keyof typeof __clientMock, jest.Mock>;

  beforeEach(() => {
    mockPubSubClient = __clientMock;
    __resetClientMock(mockPubSubClient);

    // spy the base class, regardingless if a custom implem of `Logger` is given in ctor options
    spyLogger = jest.spyOn(Logger, 'log');
  });

  afterEach(() => {
    spyLogger.mockRestore();
  });

  describe('constructor', () => {
    it('throws an error if options contain a subscription but no topic', () => {
      const throwingStatement = () => new CloudServerPubSub({ options: { defaultSubscription: 'let-it-be' } });
      expect(throwingStatement).toThrowError(/subscription name provided without a topic/i);
    });

    it('passes the given "clientConfig" as-is to the PubSub constructor', () => {
      type CloudServerPubSubParams = ConstructorParameters<typeof CloudServerPubSub>['0'];

      const cloudPubSubConfig: CloudServerPubSubParams = { clientConfig: { projectId: 'nest-is-in-gcp' } };
      const { clientConfig } = cloudPubSubConfig;
      new CloudServerPubSub({ clientConfig });

      expect(PubSub).toHaveBeenCalledWith(clientConfig);
    });

    it('allows passing a custom implementation of nestjs Logger', () => {
      const customLogger = new Logger();
      const cloudServerPubSub = new CloudServerPubSub({ options: { logger: customLogger } });

      // "logger" is a protected prop. of class Server from @nestjs/microservices
      expect((cloudServerPubSub as any).customLogger).toBe(customLogger);
    });

    it('should allow custom pubsub instance', () => {
      const customPubsub = new PubSub();
      const cloudServerPubSub = new CloudServerPubSub(customPubsub);

      expect((cloudServerPubSub as any).pubSubClient).toBe(customPubsub);
    });
  });

  describe('createTopic', () => {
    it('logs and executes the creation of the topic with the given name', async () => {
      const topicName = 'custom-topic-with-logger';
      await new CloudServerPubSub().createTopic(topicName);

      expect(spyLogger).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`creating topic ${topicName}`, 'i')),
        DEFAULT_LOGGER_CONTEXT,
        false,
      );
      expect(mockPubSubClient.createTopic).toHaveBeenCalled();
    });

    it('does not log if logging is disabled', async () => {
      const cloudServerPubSub = new CloudServerPubSub({ options: { enableLogger: false } });
      await cloudServerPubSub.createTopic('custom-topic-without-logger');

      expect(spyLogger).not.toHaveBeenCalled();
    });

    it('catches errors with code 6 (topic already existing) silently', async () => {
      mockPubSubClient.createTopic = jest
        .fn()
        .mockRejectedValue({ code: 6, message: 'Resource already exists in the project' });

      expect.assertions(1);

      const error = await new CloudServerPubSub().createTopic('custom-topic-already-existing').catch(e => e);
      expect(error).toBeUndefined();
    });

    it('throws any error with an other code than 6', async () => {
      const expectedError = { code: 7, message: 'PERMISSION_DENIED: User not authorized to perform this action.' };
      mockPubSubClient.createTopic = jest.fn().mockRejectedValue(expectedError);

      expect.assertions(2);

      try {
        await new CloudServerPubSub().createTopic('custom-topic-without-permission');
      } catch (err) {
        expect(err).toBe(expectedError);
        expect(mockPubSubClient.topic).not.toHaveBeenCalled();
      }
    });
  });

  describe('createSubscription', () => {
    let topicName: string;
    let subscriptionName: string;

    beforeEach(() => {
      topicName = 'custom-topic';
      subscriptionName = 'subscription-to-custom-topic';
    });

    it('logs and executes the creation of the subscription with the given name', async () => {
      await new CloudServerPubSub().createSubscription(topicName, subscriptionName);

      expect(spyLogger).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`creating subscription ${subscriptionName} to topic ${topicName}`, 'i')),
        DEFAULT_LOGGER_CONTEXT,
        false,
      );
      expect(mockPubSubClient.createSubscription).toHaveBeenCalled();
    });

    it('does not log if logging is disabled', async () => {
      await new CloudServerPubSub({ options: { enableLogger: false } }).createSubscription(topicName, subscriptionName);

      expect(spyLogger).not.toHaveBeenCalled();
    });

    it('catches errors with code 6 (subscription already existing) and create a subscription object', async () => {
      mockPubSubClient.createSubscription = jest
        .fn()
        .mockRejectedValue({ code: 6, message: 'Resource already exists in the project' });

      await new CloudServerPubSub().createSubscription(topicName, subscriptionName);
      expect(mockPubSubClient.subscription).toHaveBeenCalled();
    });

    it('throws any error with an other code than 6', async () => {
      const expectedError = { code: 7, message: 'PERMISSION_DENIED: User not authorized to perform this action.' };
      mockPubSubClient.createSubscription = jest.fn().mockRejectedValue(expectedError);

      expect.assertions(2);

      try {
        await new CloudServerPubSub().createSubscription(topicName, subscriptionName);
      } catch (err) {
        expect(err).toBe(expectedError);
        expect(mockPubSubClient.subscription).not.toHaveBeenCalled();
      }
    });

    it('subscribes to event "message" of the subscription', async () => {
      const mockSubscription = { on: jest.fn() };
      __resetClientMock(mockPubSubClient, mockSubscription);

      await new CloudServerPubSub().createSubscription(topicName, subscriptionName);
      expect(mockSubscription.on).toHaveBeenCalledWith('message', expect.any(Function));
    });
  });

  describe('listen', () => {
    it('executes the given callback', async () => {
      const callback = jest.fn();
      await new CloudServerPubSub().listen(callback);

      expect(callback).toHaveBeenCalled();
    });

    it('creates the topic if any given', async () => {
      const defaultTopic = 'my-topic';
      const cloudServerPubSub = new CloudServerPubSub({ options: { defaultTopic } });

      await cloudServerPubSub.listen(() => undefined);
      expect(mockPubSubClient.createTopic).toHaveBeenCalledWith(defaultTopic, undefined);
    });

    it('creates the subscription if any has been given (additionally to the given topic)', async () => {
      const defaultTopic = 'my-topic';
      const defaultSubscription = 'my-subscription';
      const cloudServerPubSub = new CloudServerPubSub({ options: { defaultTopic, defaultSubscription } });

      await cloudServerPubSub.listen(() => undefined);
      expect(mockPubSubClient.createTopic).toHaveBeenCalledWith(defaultTopic, undefined);
      expect(mockPubSubClient.createSubscription).toHaveBeenCalledWith(defaultTopic, defaultSubscription, undefined);
    });
  });

  describe('close', () => {
    it('closes all its subscriptions', async () => {
      const createMock = () => ({ close: jest.fn(), on: jest.fn() });
      const mockSubscriptions = Array.from({ length: 5 }, createMock);
      const cloudServerPubSub = new CloudServerPubSub();

      await Promise.all(
        mockSubscriptions.map(async (mockSubscription, i) => {
          mockPubSubClient.createSubscription = jest.fn().mockResolvedValue([mockSubscription]);
          await cloudServerPubSub.createSubscription('my-topic', `subscription${i}`);
        }),
      );

      await cloudServerPubSub.close();
      return mockSubscriptions.map(mockSubscription => expect(mockSubscription.close).toHaveBeenCalled());
    });

    it('closes its initial subscription (if any)', async () => {
      const mockSubscription = { on: jest.fn(), close: jest.fn() };
      mockPubSubClient.createSubscription = jest.fn().mockResolvedValue([mockSubscription]);

      const cloudServerPubSub = new CloudServerPubSub({
        options: { defaultTopic: 'custom-topic', defaultSubscription: 'my-sub' },
      });
      await cloudServerPubSub.listen(() => undefined);
      await cloudServerPubSub.close();
      return expect(mockSubscription.close).toHaveBeenCalled();
    });
  });
});
