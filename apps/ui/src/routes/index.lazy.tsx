import { MilkdownEditor } from '@/components/Milkdown/Milkdown';
import { Button } from '@/components/ui/button';
import { editorViewCtx } from '@milkdown/core';
import type { Ctx } from '@milkdown/ctx';
import { TextSelection } from '@milkdown/prose/state';
import { MilkdownProvider, useInstance } from '@milkdown/react';
import { getMarkdown } from '@milkdown/utils';
import { createLazyFileRoute, useRouter } from '@tanstack/react-router';
import { ArrowUp } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export const Route = createLazyFileRoute('/')({
    component: Index,
});

function Index() {
    const router = useRouter();

    const handleSubmit = () => {
        console.log('Submitting!');
    };

    return (
        <div className="w-full h-full justify-center items-center flex flex-col p-2">
            <h1 className="text-4xl">Good afternoon, Colin :)</h1>
            <MilkdownProvider>
                <InputBox handleSubmit={handleSubmit} />
            </MilkdownProvider>
        </div>
    );
}

type InputBoxProps = {
    handleSubmit: () => void;
};
const InputBox: React.FC<InputBoxProps> = ({ handleSubmit }) => {
    const [loading, getEditor] = useInstance();
    const editorAction = useCallback(
        (fn: (ctx: Ctx) => void) => {
            if (loading) return null;
            return getEditor().action(fn);
        },
        [loading, getEditor],
    );

    const [inputHasContent, setInputHasContent] = useState(false);

    const handleContentUpdated = useCallback(() => {
        editorAction((ctx) => {
            const md = getMarkdown()(ctx);
            setInputHasContent(md.length > 0);
        });
    }, [editorAction]);

    const handleKeyUp = useCallback(
        (e: KeyboardEvent) => {
            if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                !e.ctrlKey &&
                !e.altKey &&
                !e.metaKey
            ) {
                e.preventDefault();
                handleSubmit();
            }
            handleContentUpdated();
        },
        [handleContentUpdated, handleSubmit],
    );

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
    }, [editorAction, handleContentUpdated, handleKeyUp]);

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
            className="flex items-start w-full max-w-[36rem] min-h-24 max-h-36 overflow-y-scroll bg-muted rounded-md p-2 border-[0.5px] border-border border-opacity-30 mt-8"
            onClick={() => focusOnEditor()}
        >
            <MilkdownEditor />
            {inputHasContent && <SubmitButton onSubmit={handleSubmit} />}
        </div>
    );
};

type SubmitButtonProps = {
    onSubmit: () => void;
};
const SubmitButton: React.FC<SubmitButtonProps> = ({ onSubmit }) => {
    return (
        <Button
            className="w-8 h-8 p-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center"
            onClick={onSubmit}
        >
            <ArrowUp className="w-4 h-4" />
        </Button>
    );
};
