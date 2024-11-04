import type React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type { ReplicacheChatMessage } from '@preload/shared';
import { Button } from '@renderer/components/ui/button';
import UserIcon from '@renderer/components/ui/userIcon';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

type MessageProps = {
    message: ReplicacheChatMessage;
};
const Message: React.FC<MessageProps> = ({ message }) => {
    if (message.messageType === 'assistant') {
        return <AssistantMessage message={message.messageContent} />;
    } else {
        return (
            <UserMessage
                userID={message.userID}
                message={message.messageContent}
            />
        );
    }
};
type BaseMessageProps = {
    message: string;
};

type UserMessageProps = BaseMessageProps & {
    userID: string;
};
export const UserMessage: React.FC<UserMessageProps> = ({
    message,
    userID,
}) => {
    return (
        <div className="w-[40vw] p-2 rounded-lg mt-2 mb-2 flex flex-row bg-accent">
            <div>
                <UserIcon userID={userID} className="mr-4" />
            </div>
            <div className="flex-1 pt-2">
                <MarkdownRenderer content={message} />
            </div>
        </div>
    );
};
export const AssistantMessage: React.FC<BaseMessageProps> = ({ message }) => {
    return (
        <div className="w-[40vw] p-3 rounded-lg mt-2 mb-2 flex flex-row bg-muted/85">
            <div className="flex w-full">
                <MarkdownRenderer content={message} />
            </div>
        </div>
    );
};

type CollapsibleThinkingProps = {
    children: React.ReactNode;
};
const CollapsibleThinking: React.FC<CollapsibleThinkingProps> = ({
    children,
}) => {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="flex flex-col w-full mb-1">
            <Button
                variant="ghost"
                onClick={() => setExpanded((prev) => !prev)}
                className="text-sm text-gray-400 w-24 gap-0"
            >
                Thinking... {expanded ? <ChevronUp /> : <ChevronDown />}
            </Button>
            {expanded ? children : null}
        </div>
    );
};

type MarkdownRendererProps = {
    content: string;
};
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    const processContent = () => {
        // Match either:
        // 1. Complete tag pair: <charlie_thinking>content</charlie_thinking>
        // 2. Opening tag only: <charlie_thinking>remaining content
        const regex = /<charlie_thinking>(.*?)(?:<\/charlie_thinking>|$)/gs;

        return content.split(regex).map((part, index) => {
            if (index % 2 === 1) {
                // This is the content after <charlie_thinking>
                // (either until </charlie_thinking> or end of string)
                return (
                    <CollapsibleThinking key={part}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {part}
                        </ReactMarkdown>
                    </CollapsibleThinking>
                );
            }
            // This is the content outside the tags
            return (
                <ReactMarkdown key={part} remarkPlugins={[remarkGfm]}>
                    {part}
                </ReactMarkdown>
            );
        });
    };
    return <div className="markdown-container w-full">{processContent()}</div>;
};

export default Message;
