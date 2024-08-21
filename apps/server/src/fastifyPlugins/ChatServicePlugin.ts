import AIService from '@/AIService/AIService';
import ChatService from '@/ChatService/ChatService';
import fp from 'fastify-plugin';

declare module 'fastify' {
    interface FastifyInstance {
        chatService: ChatService;
    }
}

export default fp(async (fastify) => {
    const aiService = AIService.getInstance();
    const chatService = new ChatService(aiService);

    fastify.decorate('chatService', chatService);
});
