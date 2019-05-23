type mockedMethods = 'createSubscription' | 'createTopic' | 'topic' | 'subscription';
type ClientMock = Record<mockedMethods, jest.Mock>;

type SubcriptionMock = Record<'on', jest.Mock | ((...args: any) => any)>;

const initialModule = jest.genMockFromModule('@google-cloud/pubsub');

const mockSubscription = (): SubcriptionMock => ({ on: jest.fn() });
const mockPubSubClient = (sub: SubcriptionMock = mockSubscription()): ClientMock => ({
  createSubscription: jest.fn().mockResolvedValue([sub]),
  createTopic: jest.fn().mockResolvedValue([{}]),
  subscription: jest.fn().mockReturnValue(sub),
  topic: jest.fn(),
});

/**
 * Reset the given `mock` to its initial state (no history, initial mocked implementation).
 * Optionally, the resetted `mock` will provide `sub` as a Subscription, through methods
 * `createSubscription` and `subscription`.
 *
 * @param mock Mock to reset.
 * @param sub Optional mock of subscription.
 */
const resetClientMock = (mock: ClientMock, sub: SubcriptionMock = mockSubscription()) => Object.assign(mock, mockPubSubClient(sub));

const mockClient = mockPubSubClient();
const mockedModule = {
  ...initialModule,
  __clientMock: mockClient,
  __resetClientMock: resetClientMock,
  PubSub: jest.fn().mockImplementation(() => mockClient),
};

export = mockedModule;

declare module '@google-cloud/pubsub' {
  // tslint:disable:variable-name
  export const __clientMock: ClientMock;
  export const __resetClientMock: typeof resetClientMock;
}
