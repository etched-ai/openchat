import type { Node as ProsemirrorNode } from '@milkdown/prose/model';
import {
    type EditorState,
    NodeSelection,
    Plugin,
    PluginKey,
    Selection,
    type Transaction,
} from '@milkdown/prose/state';
import { $prose } from '@milkdown/utils';

const inlineCodePluginKey = new PluginKey('single-backtick-syntax');

const inlineCodePlugin = $prose(() => {
    let lastFocusedInlineCode: NodeSelection | null = null;

    return new Plugin({
        key: inlineCodePluginKey,
        appendTransaction: (transactions, oldState, newState) => {
            if (transactions.some((tr) => tr.docChanged || tr.selectionSet)) {
                return adjustInlineCode(
                    newState,
                    oldState,
                    lastFocusedInlineCode,
                    (pos) => {
                        lastFocusedInlineCode = pos;
                    },
                );
            }
            return null;
        },
    });
});

function adjustInlineCode(
    newState: EditorState,
    oldState: EditorState,
    lastFocusedInlineCode: NodeSelection | null,
    setLastFocusedInlineCode: (pos: NodeSelection | null) => void,
): Transaction | null {
    const tr = newState.tr;
    let changed = false;

    const { $from } = newState.selection;
    const node = $from.parent;
    const pos = $from.before();

    if (
        node.type.name === 'text' &&
        node.marks.some((mark) => mark.type.name === 'code')
    ) {
        changed =
            handleInlineCodeFocus(
                tr,
                newState,
                node,
                pos,
                setLastFocusedInlineCode,
            ) || changed;
    } else {
        if (lastFocusedInlineCode !== null) {
            changed =
                handleInlineCodeBlur(
                    tr,
                    newState,
                    pos,
                    lastFocusedInlineCode,
                    setLastFocusedInlineCode,
                ) || changed;
        }
        changed =
            handlePotentialInlineCodeCreation(
                tr,
                newState,
                node,
                pos,
                setLastFocusedInlineCode,
            ) || changed;
    }

    return changed ? tr : null;
}

function handleInlineCodeFocus(
    tr: Transaction,
    state: EditorState,
    node: ProsemirrorNode,
    pos: number,
    setLastFocusedInlineCode: (pos: NodeSelection | null) => void,
): boolean {
    const text = node.text || '';
    if (!text.startsWith('`') || !text.endsWith('`')) {
        const newText = `\`${text}\``;
        const mark = node.marks.find((m) => m.type.name === 'code');
        if (mark) {
            tr.removeMark(pos, pos + node.nodeSize, mark);
            tr.insertText(newText, pos);
            tr.addMark(pos, pos + newText.length, mark);

            // Adjust cursor position
            const selection = tr.selection;
            const newPos = selection.from + 1; // Move cursor one position to the right (after the added backtick)
            tr.setSelection(Selection.near(tr.doc.resolve(newPos)));

            setLastFocusedInlineCode(NodeSelection.create(tr.doc, pos));
            return true;
        }
    }
    return false;
}

function handleInlineCodeBlur(
    tr: Transaction,
    newState: EditorState,
    pos: number,
    lastFocusedInlineCode: NodeSelection,
    setLastFocusedInlineCode: (pos: NodeSelection | null) => void,
): boolean {
    const lastFocusedPos = lastFocusedInlineCode.from;
    const node = newState.doc.nodeAt(lastFocusedPos);

    if (node?.isText && node.marks.some((mark) => mark.type.name === 'code')) {
        const text = node.text || '';
        if (text.startsWith('`') && text.endsWith('`')) {
            const newText = text.slice(1, -1);
            const mark = node.marks.find((m) => m.type.name === 'code');
            if (mark) {
                tr.removeMark(
                    lastFocusedPos,
                    lastFocusedPos + node.nodeSize,
                    mark,
                );
                tr.insertText(newText, lastFocusedPos);
                tr.addMark(
                    lastFocusedPos,
                    lastFocusedPos + newText.length,
                    mark,
                );

                // Adjust cursor position
                const selection = tr.selection;
                const newPos = selection.from - 1; // Move cursor one position to the left (before the removed backtick)
                tr.setSelection(Selection.near(tr.doc.resolve(newPos)));

                setLastFocusedInlineCode(null);
                return true;
            }
        }
    }
    setLastFocusedInlineCode(null);
    return false;
}

function handlePotentialInlineCodeCreation(
    tr: Transaction,
    state: EditorState,
    node: ProsemirrorNode,
    pos: number,
    setLastFocusedInlineCode: (pos: NodeSelection | null) => void,
): boolean {
    if (node.isText && node.text) {
        const text = node.text;
        const backtickIndex = text.indexOf('`');

        if (backtickIndex !== -1) {
            // Check for a matching backtick
            const endBacktickIndex = text.indexOf('`', backtickIndex + 1);

            if (endBacktickIndex !== -1) {
                // We found a matching pair of backticks
                const startPos = pos + backtickIndex;
                const endPos = pos + endBacktickIndex + 1;
                const content = text.slice(backtickIndex + 1, endBacktickIndex);

                // Remove the existing text
                tr.delete(startPos, endPos);

                // Insert the new inline code
                const mark = state.schema.marks.code.create();
                tr.insertText(content, startPos);
                tr.addMark(startPos, startPos + content.length, mark);

                // Adjust cursor position
                const newPos = startPos + content.length;
                tr.setSelection(Selection.near(tr.doc.resolve(newPos)));

                setLastFocusedInlineCode(
                    NodeSelection.create(tr.doc, startPos),
                );
                return true;
            }
        }
    }
    return false;
}

export default inlineCodePlugin;
