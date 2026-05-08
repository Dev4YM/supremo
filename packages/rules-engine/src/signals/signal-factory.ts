import { Signal, SignalType } from '../types';

export class SignalFactory {
  /**
   * Create a message signal
   */
  static createMessageSignal(data: {
    guildId: string;
    userId: string;
    channelId: string;
    messageId: string;
    content: string;
    author: any;
    timestamp?: Date;
  }): Signal {
    return {
      type: SignalType.MESSAGE_SENT,
      timestamp: data.timestamp || new Date(),
      guildId: data.guildId,
      userId: data.userId,
      channelId: data.channelId,
      messageId: data.messageId,
      data: {
        message: {
          content: data.content,
          author: data.author,
        },
        content: data.content,
        author: data.author,
      },
    };
  }

  /**
   * Create a user join signal
   */
  static createUserJoinSignal(data: {
    guildId: string;
    userId: string;
    user: any;
    timestamp?: Date;
  }): Signal {
    return {
      type: SignalType.USER_JOINED,
      timestamp: data.timestamp || new Date(),
      guildId: data.guildId,
      userId: data.userId,
      data: {
        user: data.user,
      },
    };
  }

  /**
   * Create a custom signal
   */
  static createCustomSignal(data: {
    guildId: string;
    userId?: string;
    channelId?: string;
    messageId?: string;
    customData: Record<string, any>;
    timestamp?: Date;
  }): Signal {
    return {
      type: SignalType.CUSTOM,
      timestamp: data.timestamp || new Date(),
      guildId: data.guildId,
      userId: data.userId,
      channelId: data.channelId,
      messageId: data.messageId,
      data: data.customData,
    };
  }
}