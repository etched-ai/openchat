import { Redis } from '@upstash/redis';
import { Redis as ioRedis } from 'ioRedis';
import z from 'zod';
import { DBChatMessageSchema } from './db';

const redis = Redis.fromEnv();
const ioredis = new ioRedis(process.env.UPSTASH_REDIS_URL as string);

export const subscriptionChannels = {
    chatMessages: (chatID: string) => `chat_messages:${chatID}`,
};
export const subscriptionChannelTypes = {
    chatMessages: z.object({
        type: z
            .literal('chunk')
            .or(z.literal('completed'))
            .or(z.literal('canceled')),
        message: DBChatMessageSchema,
    }),
};
export const getRedisSubscriber = () => {
    return ioredis.duplicate();
};

export default redis;
