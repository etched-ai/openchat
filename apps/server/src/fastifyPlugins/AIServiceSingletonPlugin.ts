import AIService from '@/AIService/AIService';
import fp from 'fastify-plugin';

declare module 'fastify' {
    interface FastifyInstance {
        aiService: AIService;
    }
}

export default fp(async (fastify) => {
    fastify.decorate('aiService', AIService.getInstance());
});
