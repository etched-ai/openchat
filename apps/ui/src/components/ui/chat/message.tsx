import type { DBChatMessage } from '@repo/db';
import type React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import UserIcon from '../userIcon';

type MessageProps = {
    message: DBChatMessage;
};
const Message: React.FC<MessageProps> = ({ message }) => {
    if (message.messageType === 'assistant') {
        return <AssistantMessage message={message.messageContent} />;
    } else {
        return <UserMessage message={message.messageContent} />;
    }
};
type SpecificMessageProps = {
    message: string;
};
export const UserMessage: React.FC<SpecificMessageProps> = ({ message }) => {
    return (
        <div className="w-[40vw] p-2 rounded-lg mt-2 mb-2 flex flex-row bg-accent">
            <div>
                <UserIcon userId="temp" className="mr-4" />
            </div>
            <div className="flex-1 pt-2">
                <MarkdownRenderer content={message} />
            </div>
        </div>
    );
};
export const AssistantMessage: React.FC<SpecificMessageProps> = ({
    message,
}) => {
    return (
        <div className="w-[40vw] p-3 rounded-lg mt-2 mb-2 flex flex-row bg-muted/85">
            <div className="flex w-full">
                <MarkdownRenderer content={message} />
            </div>
        </div>
    );
};

type MarkdownRendererProps = {
    content: string;
};
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    return (
        <div className="milkdown w-full">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
    );
};

export default Message;
