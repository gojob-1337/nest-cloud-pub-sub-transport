/**
 * Message objects provide a simple interface for users to get
 * message data and acknowledge the message.
 * @see https://cloud.google.com/nodejs/docs/reference/pubsub/0.28.x/Message
 */
export type CloudPubSubMessage = {
  /** ID used to acknowledge the message receival. */
  ackId: string;
  /** Optional attributes for this message. */
  attributes: Record<string, string>;
  /** Contents of the message. */
  // data: Uint8Array;
  data: Buffer;
  /** ID of the message. */
  id: string;
  /** The length of the message data. */
  length: number;
  /** The time at which the message was published. */
  publishTime: string;
  /** The time at which the message was recieved by the subscription. */
  received: number;
  /** Acknowledge the message. */
  ack: () => void;
  /**
   * Removes the message from our inventory and schedules it to be redelivered.
   * If the `delay` parameter is unset, it will be redelivered immediately.
   *
   * Do not acknowledge the message (allows more messages to be
   * retrieved if your limit was hit).
   *
   * @param delay The desired time to wait before the redelivery occurs.
   */
  nack: (delay?: number) => void;
};

export type CloudPubSubMessageData = {
  /** "pattern" to be matched for the current message  */
  pattern: string;
  /** (optional) payload embedding custom data for the current message */
  data?: Record<string, unknown>;
};
