import { MilkdownEditor } from '@/components/Milkdown/Milkdown';
import { editorViewCtx } from '@milkdown/core';
import { TextSelection } from '@milkdown/prose/state';
import { MilkdownProvider, useInstance } from '@milkdown/react';
import { createLazyFileRoute } from '@tanstack/react-router';

export const Route = createLazyFileRoute('/')({
    component: Index,
});

function Index() {
    return (
        <div className="w-full h-full justify-center items-center flex flex-col p-2">
            <h1 className="text-4xl">Good afternoon, Colin :)</h1>
            <MilkdownProvider>
                <InputBox />
            </MilkdownProvider>
        </div>
    );
}

const InputBox: React.FC = () => {
    const [loading, getEditor] = useInstance();

    function focusOnEditor() {
        const editor = getEditor();
        if (editor) {
            editor.action((ctx) => {
                const view = ctx.get(editorViewCtx);
                const { state } = view;
                if (state.selection?.empty) {
                    const selection = TextSelection.create(state.doc, 1);
                    view.focus();
                    view.dispatch(state.tr.setSelection(selection));
                } else {
                    view.focus();
                }
            });
        }
    }

    return (
        // biome-ignore lint/a11y/useKeyWithClickEvents: This is technically a text input
        <div
            className="flex items-start w-full max-w-[36rem] min-h-24 bg-muted rounded-md p-4 border-[0.5px] border-border border-opacity-30 mt-8"
            onClick={() => focusOnEditor()}
        >
            <MilkdownEditor />
        </div>
    );
};
