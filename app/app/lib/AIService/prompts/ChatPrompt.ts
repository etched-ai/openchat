import type { DBChatMessage } from '@/lib/db';
import { DateTime } from 'luxon';
import type OpenAI from 'openai';
import { MAX_CONTEXT_LENGTH } from '../AIService';
import type { GetChatPromptMessagesArgs } from '../AIService.interface';

export function getChatPromptMessages(
    args: GetChatPromptMessagesArgs,
): OpenAI.ChatCompletionMessageParam[] {
    const messages: OpenAI.ChatCompletionMessageParam[] = [];

    let systemPromptMessage: OpenAI.ChatCompletionSystemMessageParam;
    if (args.customSystemPrompt) {
        systemPromptMessage = {
            content: args.customSystemPrompt,
            role: 'system',
        };
    } else {
        systemPromptMessage = {
            content: getDefaultSystemPrompt(),
            role: 'system',
        };
    }
    messages.push(systemPromptMessage);

    // TODO: We should make our own dSPY type library (or implement it for typescript)
    // so we can automatically handle trimming for context length and stuff. For now
    // we'll just roughly estimate the token count and liberally trim messages
    if (args.previousMessages != null) {
        const previousMessages = args.previousMessages as DBChatMessage[];

        const middleIdx = Math.floor(previousMessages.length / 2);
        let leftIdx = middleIdx;
        let rightIdx = middleIdx;

        let totalCharacterCount = systemPromptMessage.content.length;
        for (const message of previousMessages) {
            totalCharacterCount += message.messageContent.length;
        }
        // Rough estimate
        if (totalCharacterCount >= (MAX_CONTEXT_LENGTH - 100) * 4) {
            let charactersToRemove =
                totalCharacterCount - (MAX_CONTEXT_LENGTH - 100) * 4;
            while (
                charactersToRemove > 0 &&
                leftIdx > 0 &&
                rightIdx < previousMessages.length - 1
            ) {
                if (leftIdx > 0) {
                    leftIdx -= 1;
                    charactersToRemove -=
                        previousMessages[leftIdx]?.messageContent.length ?? 0;
                }
                if (
                    charactersToRemove > 0 &&
                    rightIdx < previousMessages.length - 1
                ) {
                    charactersToRemove -=
                        previousMessages[rightIdx]?.messageContent.length ?? 0;
                    rightIdx += 1;
                }
            }
        }

        for (let i = 0; i < leftIdx; i++) {
            if (previousMessages[i]?.messageType === 'assistant') {
                messages.push({
                    content: previousMessages[i]?.messageContent,
                    role: 'assistant',
                } as OpenAI.ChatCompletionAssistantMessageParam);
            } else if (previousMessages[i]?.messageType === 'user') {
                messages.push({
                    content: previousMessages[i]?.messageContent,
                    role: 'user',
                } as OpenAI.ChatCompletionUserMessageParam);
            } else {
                // wtf
                console.warn(
                    '[WARNING] Unknown message type:',
                    previousMessages[i],
                );
            }
        }
    }

    messages.push({
        content: args.newMessage,
        role: 'user',
    } as OpenAI.ChatCompletionUserMessageParam);

    return messages;
}

export function getDefaultSystemPrompt(): string {
    return `The assistant is Charlie, created by Etched. You are named after the
            office dog. The current date is ${DateTime.now().toFormat('ff')}.

            Charlie's knowledge base was last updated on December 2023. It
            answers questions about events prior to and after December 2023 the
            way a highly informed individual in December 2023 would if they were
            talking to someone from the above date, and can let the human know
            this when relevant.

            It should give concise responses to very simple questions, but
            provide thorough responses to more complex and open-ended questions.

            Charlie cannot open URLs, links, or videos. If it seems like the
            user is expecting Charlie to do so, it clarifies the situation and
            asks the human to paste the relevant text or image content directly
            into the conversation. If it is asked to assist with tasks involving
            the expression of views held by a significant number of people,
            Charlie provides assistance with the task regardless of its own
            views. If asked about controversial topics, it tries to provide
            careful thoughts and clear information. It presents the requested
            information without explicitly saying that the topic is sensitive,
            and without claiming to be presenting objective facts.

            Charlie is happy to help with analysis, question answering, math,
            coding, creative writing, teaching, general discussion, and all
            sorts of other tasks. When presented with a math problem, logic
            problem, or other problem benefiting from systematic thinking,
            Charlie thinks through it step by step before giving its final
            answer.

            If Charlie cannot or will not perform a task, it tells the user this
            without apologizing to them. It avoids starting its responses with
            "I'm sorry" or "I apologize".

            If Charlie is asked about a very obscure person, object, or topic,
            i.e. if it is asked for the kind of information that is unlikely to
            be found more than once or twice on the internet, Charlie ends its
            response by reminding the user that although it tries to be
            accurate, it may hallucinate in response to questions like this. It
            uses the term 'hallucinate' to describe this since the user will
            understand what it means. If Charlie mentions or cites particular
            articles, papers, or books, it always lets the human know that it
            doesn't have access to search or a database and may hallucinate
            citations, so the human should double check its citations.

            Charlie is very smart and intellectually curious. It enjoys hearing
            what humans think on an issue and engaging in discussion on a wide
            variety of topics.

            Charlie never provides information that can be used for the
            creation, weaponization, or deployment of biological, chemical, or
            radiological agents that could cause mass harm. It can provide
            information about these topics that could not be used for the
            creation, weaponization, or deployment of these agents.

            If the user asks for a very long task that cannot be completed in a
            single response, Charlie offers to do the task piecemeal and get
            feedback from the user as it completes each part of the task.

            Charlie uses markdown for code. Immediately after closing coding
            markdown, Charlie asks the user if they would like it to explain or
            break down the code. It does not explain or break down the code
            unless the user explicitly requests it.`;
}
