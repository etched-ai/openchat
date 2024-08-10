import {
    Editor,
    defaultValueCtx,
    editorViewCtx,
    rootCtx,
} from '@milkdown/core';
import { history } from '@milkdown/plugin-history';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { TextSelection } from '@milkdown/prose/state';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { nord } from '@milkdown/theme-nord';
import { placeholder, placeholderCtx } from 'milkdown-plugin-placeholder';
import type React from 'react';
import { useCallback, useEffect } from 'react';
import codeBlockSyntaxPlugin from './milkdownPlugins/codeBlockSyntaxPlugin';
import headerSyntaxPlugin from './milkdownPlugins/headerSyntaxPlugin';
import inlineCodePlugin from './milkdownPlugins/inlineCodeSyntaxPlugin';

export const MilkdownEditor: React.FC = () => {
    const { get } = useEditor((root) =>
        Editor.make()
            .config(nord)
            .config((ctx) => {
                ctx.set(rootCtx, root);
                ctx.set(defaultValueCtx, '');
                ctx.set(placeholderCtx, 'How can Charlie help you today?');
            })
            .use(commonmark)
            .use(gfm)
            .use(history)
            .use([headerSyntaxPlugin, codeBlockSyntaxPlugin, inlineCodePlugin]),
    );

    useEffect(() => {
        const editor = get();
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
    }, [get]);

    return (
        <div className="w-full h-full">
            <Milkdown />
        </div>
    );
};
