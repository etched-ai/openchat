import type { ReplicacheChatMessage } from '@preload/shared';
import ProgramState, { OpenAIBackend } from 'enochian-js';
import { DateTime } from 'luxon';
import type { Replicache } from 'replicache';
import { ulid } from 'ulid';
import type { M } from './replicache/mutators';

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
unless the user explicitly requests it.

Now, let's think step-by-step.`;
}

// On complex questions, Charlie ALWAYS thinks through the problem
// step-by-step. When thinking through problems step-by-step, Charlie
// ALWAYS uses the following format, including the thinking tags:

// <charlie_thinking>
// ## Step 1: [Concise description]
// [Brief explanation]

// ## Step 2: [Concise description]
// [Brief explanation]
// </charlie_thinking>

// After ending the thinking stage, Charlie always follows it up with
// a brief summary and conclusion of the answer to the user's question.

export async function createChat(replicache: Replicache<M>, userID: string) {
    const chatID = ulid();

    return await replicache.mutate.upsertChat({
        chatID,
        chat: {
            id: chatID,
            userID,
            previewName: '',
            createdAt: DateTime.now().toISO(),
            updatedAt: DateTime.now().toISO(),
        },
    });
}

export async function sendChatMessage(
    replicache: Replicache<M>,
    userID: string,
    chatID: string,
    prevMessages: ReplicacheChatMessage[],
    newMessage: string,
) {
    const userMessageID = ulid();
    const assistantMessageID = ulid();

    await replicache.mutate.upsertChatMessage({
        chatID,
        chatMessage: {
            id: userMessageID,
            userID,
            chatID,
            messageType: 'user',
            messageContent: newMessage,
            createdAt: DateTime.now().toISO(),
            updatedAt: DateTime.now().toISO(),
        },
    });

    // const s = new ProgramState();
    // await s.setModel(import.meta.env.VITE_DEFAULT_MODEL_URL ?? '');
    const s = new ProgramState(
        new OpenAIBackend({
            apiKey: import.meta.env.VITE_OPENAI_API_KEY,
            dangerouslyAllowBrowser: true,
        }),
    );
    s.setModel('gpt-4o-mini');

    s.add(s.system`${getDefaultSystemPrompt()}`);
    for (const message of prevMessages) {
        s.add(
            message.messageType === 'assistant'
                ? s.assistant`${message.messageContent}`
                : s.user`${message.messageContent}`,
        );
    }
    const generator = s
        .add(s.user`${newMessage}`)
        .add(s.assistant`${s.gen('response', { stream: true })}`);

    let fullMessage = '';
    for await (const chunk of generator) {
        fullMessage += chunk.content;
        await replicache.mutate.upsertChatMessage({
            chatID,
            chatMessage: {
                id: assistantMessageID,
                userID,
                chatID,
                messageType: 'assistant',
                messageContent: fullMessage,
                createdAt: DateTime.now().toISO(),
                updatedAt: DateTime.now().toISO(),
            },
        });
    }
}

export async function updateChatPreview(
    replicache: Replicache<M>,
    chatID: string,
) {
    const messageHistory = await replicache.query(
        async (tx) =>
            await tx
                .scan<ReplicacheChatMessage>({
                    indexName: 'chatID',
                    prefix: chatID,
                })
                .values()
                .toArray(),
    );
    // const s = new ProgramState();
    // await s.setModel(import.meta.env.VITE_DEFAULT_MODEL_URL ?? '');
    const s = new ProgramState(
        new OpenAIBackend({
            apiKey: import.meta.env.VITE_OPENAI_API_KEY,
            dangerouslyAllowBrowser: true,
        }),
    );
    s.setModel('gpt-4o-mini');

    const generator = s
        .add(s.user`Summarize the contents of this conversation `)
        .add(s.user`into a single phrase that describes the main idea `)
        .add(s.user`the two parties are talking about. Here is `)
        .add(s.user`the conversation history:\n\n---BEGIN CONVERSATION---\n`)
        .add(
            s.user`${messageHistory.map((m) => (m.messageType === 'assistant' ? 'ASSISTANT: ' : 'USER:') + m.messageContent).join('\n')}`,
        )
        .add(s.user`---END CONVERSATION---\n\nNow respond with the phrase `)
        .add(s.user`and nothing else`)
        .add(s.assistant`${s.gen('response', { stream: true })}`);

    let fullResponse = '';
    for await (const chunk of generator) {
        fullResponse += chunk.content;
        console.log('CHAT PREVIEW', fullResponse);
        await replicache.mutate.upsertChat({
            chatID,
            chat: {
                id: chatID,
                previewName: fullResponse,
            },
        });
    }
}
