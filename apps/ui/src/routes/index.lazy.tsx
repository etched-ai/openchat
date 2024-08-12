import { MilkdownEditor } from '@/components/Milkdown/Milkdown';
import { Button } from '@/components/ui/button';
import { editorViewCtx } from '@milkdown/core';
import type { Ctx } from '@milkdown/ctx';
import { TextSelection } from '@milkdown/prose/state';
import { MilkdownProvider, useInstance } from '@milkdown/react';
import { getMarkdown } from '@milkdown/utils';
import { createLazyFileRoute, useRouter } from '@tanstack/react-router';
import { ArrowUp } from 'lucide-react';
import { DateTime } from 'luxon';
import { useCallback, useEffect, useState } from 'react';

export const Route = createLazyFileRoute('/')({
    component: Index,
});

function Index() {
    const router = useRouter();

    const getGreeting = () => {
        const hour = DateTime.local().hour;
        if (hour < 12) {
            return 'morning';
        } else if (hour < 18) {
            return 'afternoon';
        } else {
            return 'evening';
        }
    };

    const handleSubmit = (text: string): void => {
        console.log('Submitting!');
    };

    return (
        <div className="w-full h-full justify-center items-center flex flex-col p-2">
            <h1 className="text-4xl">Good {getGreeting()}, Colin :)</h1>
            <MilkdownProvider>
                <InputBox handleSubmit={handleSubmit} />
            </MilkdownProvider>
        </div>
    );
}

type InputBoxProps = {
    handleSubmit: (text: string) => void;
};
const InputBox: React.FC<InputBoxProps> = ({ handleSubmit }) => {
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
        handleSubmit(inputContent);
    }, [handleSubmit, inputContent]);

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

    // biome-ignore lint/correctness/useExhaustiveDependencies: We don't need to nor should `useCallback` these
    useEffect(() => {
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
    }, [editorAction]);

    const focusOnEditor = () =>
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

    // biome-ignore lint/correctness/useExhaustiveDependencies: Don't need to wrap this in `useCallback`
    useEffect(() => {
        focusOnEditor();
    }, []);

    return (
        // biome-ignore lint/a11y/useKeyWithClickEvents: This is technically a text input
        <div
            className="flex items-start w-full max-w-[36rem] min-h-24 max-h-36 overflow-y-scroll bg-muted rounded-md p-2 border-[0.5px] border-border border-opacity-30 mt-8"
            onClick={() => focusOnEditor()}
        >
            <MilkdownEditor />
            <SubmitButton
                onSubmit={_handleSubmit}
                show={inputContent.length > 0}
            />
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
                    w-8 h-8 p-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center
                `}
            onClick={onSubmit}
        >
            <ArrowUp className="w-4 h-4" />
        </Button>
    );
};
