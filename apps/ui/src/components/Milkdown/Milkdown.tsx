import { Editor, defaultValueCtx, rootCtx } from '@milkdown/core';
import { history } from '@milkdown/plugin-history';
import { listener } from '@milkdown/plugin-listener';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { Milkdown, useEditor } from '@milkdown/react';
import { nord } from '@milkdown/theme-nord';
import { placeholder, placeholderCtx } from 'milkdown-plugin-placeholder';
import type React from 'react';
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
            .use(listener)
            .use(commonmark)
            .use(gfm)
            .use(history)
            .use(placeholder)
            .use([headerSyntaxPlugin, codeBlockSyntaxPlugin, inlineCodePlugin]),
    );

    return (
        <div className="w-full h-full p-2">
            <Milkdown />
        </div>
    );
};
