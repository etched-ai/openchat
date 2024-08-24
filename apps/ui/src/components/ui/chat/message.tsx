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
