import fp from 'fastify-plugin';
import AIService from '../AIService/AIService';

declare module 'fastify' {
    interface FastifyInstance {
        aiService: AIService;
    }
}

export default fp(async (fastify) => {
    fastify.decorate('aiService', AIService.getInstance());
});
