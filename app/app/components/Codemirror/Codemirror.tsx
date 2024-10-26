import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import { indentWithTab, standardKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder } from '@codemirror/view';

export interface CodemirrorEditorRef {
    focus: () => void;
    clear: () => void;
}

type Props = {
    initialValue: string;
    placeholderText: string;
    onChange: (content: string) => void;
};

const CodeMirrorEditor = forwardRef<CodemirrorEditorRef, Props>(
    ({ initialValue, placeholderText, onChange }, ref) => {
        const editorRef = useRef<HTMLDivElement>(null);
        const viewRef = useRef<EditorView>(null);

        useImperativeHandle(ref, () => ({
            focus: () => {
                if (viewRef.current) {
                    return viewRef.current.focus();
                }
            },
            clear: () => {
                if (viewRef.current) {
                    viewRef.current.dispatch({
                        changes: {
                            from: 0,
                            to: viewRef.current.state.doc.length,
                            insert: '',
                        },
                    });
                }
            },
        }));

        useEffect(() => {
            if (!editorRef.current) return;

            const customKeymap = keymap.of([
                {
                    key: 'Shift-Enter',
                    run: (view) => {
                        view.dispatch(view.state.replaceSelection('\n'));
                        return true;
                    },
                },
            ]);

            const state = EditorState.create({
                doc: initialValue,
                extensions: [
                    keymap.of([...standardKeymap, indentWithTab]),
                    customKeymap,
                    markdown(),
                    placeholder(placeholderText),
                    EditorView.updateListener.of((update) => {
                        if (update.docChanged) {
                            onChange(update.state.doc.toString());
                        }
                    }),
                ],
            });

            const view = new EditorView({
                state,
                parent: editorRef.current,
            });

            viewRef.current = view;

            return () => {
                view.destroy();
            };
        }, [initialValue, placeholderText, onChange]);

        return <div ref={editorRef} className="w-full h-full p-0 m-0" />;
    },
);

export default CodeMirrorEditor;
