import { PubSub, SubscriptionOptions } from '@google-cloud/pubsub';

export interface CloudPubSubLogger {
  log(message: string, meta?: any): any;
  warn(message: string, meta?: any): any;
  error(message: string, meta?: any): any;
}

export type CloudPubSubConfig = {
  /** Configuration options, passed as-is to `PubSub` from `@google-cloud/pubsub`. */
  clientConfig?: ConstructorParameters<typeof PubSub>[0];
  /** Subscription options, used by `PubSub.subscription` from `@google-cloud/pubsub`. */
  subscriptionOptions?: SubscriptionOptions;
  /** Configuration of the custom transport strategy */
  options?: {
    /** (default to true) Whether the server should logs incoming message */
    enableLogger?: boolean;
    /** Name of the topic to listen to immediately (if none is given, none is used). */
    defaultTopic?: string;
    /** Name of the subscription to `defaultTopic` (if none is given, none is used). */
    defaultSubscription?: string;
    /** Custom implementation of `CloudPubSubLogger`. Default to `Logger` from `@nestjs/common`. */
    logger?: CloudPubSubLogger;
    /**
     * If `true`, messages will only be ACKed once their handler has
     * been executed without throwing error. This also involves that
     * the message has been considered as structurally valid.
     *
     * Default to `false` (message is ACKed as soon as it is received, before
     * running any structural check or handler).
     */
    ackAfterHandler?: boolean;
  };
};
