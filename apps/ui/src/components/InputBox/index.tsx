import { editorViewCtx } from '@milkdown/core';
import type { Ctx } from '@milkdown/ctx';
import { TextSelection } from '@milkdown/prose/state';
import { MilkdownProvider, useInstance } from '@milkdown/react';
import { getMarkdown } from '@milkdown/utils';
import { ArrowUp } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { MilkdownEditor } from '../Milkdown/Milkdown';
import { Button } from '../ui/button';

type InputBoxProps = {
    handleSubmit: (text: string) => void;
    placeholderText: string;
};

const InputBox: React.FC<InputBoxProps> = (props) => {
    return (
        <MilkdownProvider>
            <InputBoxInner {...props} />
        </MilkdownProvider>
    );
};

const InputBoxInner: React.FC<InputBoxProps> = ({
    handleSubmit,
    placeholderText,
}) => {
    // This gets the instance of the Milkdown editor thats in the input box. We then
    // use this to intercept keyboard events and get the state of the editor.
    const [loading, getEditor] = useInstance();
    const editorAction = useCallback(
        (fn: (ctx: Ctx) => void) => {
            if (loading) return null;
            return getEditor().action(fn);
        },
        [loading, getEditor],
    );

    const [inputContent, setInputContent] = useState('');

    const _handleSubmit = useCallback((): void => {
        editorAction((ctx) => {
            const md = getMarkdown()(ctx);
            handleSubmit(md);
        });
    }, [handleSubmit, editorAction]);

    useEffect(() => {
        const handleContentUpdated = () =>
            editorAction((ctx) => {
                const md = getMarkdown()(ctx);
                setInputContent(md);
            });

        const handleKeyUp = (e: KeyboardEvent) => {
            if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                !e.ctrlKey &&
                !e.altKey &&
                !e.metaKey
            ) {
                e.preventDefault();
                _handleSubmit();
            }
            handleContentUpdated();
        };

        handleContentUpdated();

        editorAction((ctx) => {
            // I know there is a milkdown listener plugin. However, it's really slow.
            // It's much faster to just listen to the key events themselves and press.
            const view = ctx.get(editorViewCtx);
            view.dom.addEventListener('keyup', handleKeyUp);

            return () => {
                view.dom.removeEventListener('keyup', handleKeyUp);
            };
        });
    }, [editorAction, _handleSubmit]);

    const focusOnEditor = useCallback(() => {
        editorAction((ctx) => {
            const view = ctx.get(editorViewCtx);
            const { state } = view;
            if (!state.selection) {
                const selection = TextSelection.create(state.doc, 1);
                view.focus();
                view.dispatch(state.tr.setSelection(selection));
            } else {
                view.focus();
            }
        });
    }, [editorAction]);

    useEffect(() => {
        focusOnEditor();
    }, [focusOnEditor]);

    return (
        // biome-ignore lint/a11y/useKeyWithClickEvents: This is technically a text input
        <div
            className="flex items-start w-full h-full overflow-y-scroll bg-muted p-2"
            onClick={() => focusOnEditor()}
        >
            <MilkdownEditor placeholderText={placeholderText} />
            <div className="w-8 relative">
                <SubmitButton
                    onSubmit={_handleSubmit}
                    show={inputContent.length > 0}
                />
            </div>
        </div>
    );
};

type SubmitButtonProps = {
    onSubmit: () => void;
    show: boolean;
};
const SubmitButton: React.FC<SubmitButtonProps> = ({ onSubmit, show }) => {
    return (
        <Button
            // We only want to show the submit button if there is content in the box.
            className={`
                    transition-all duration-200 ease-in-out
                    ${show ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}
                    fixed w-8 h-8 p-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center
                `}
            onClick={onSubmit}
        >
            <ArrowUp className="w-4 h-4" />
        </Button>
    );
};

export default InputBox;
