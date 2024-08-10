import type { Node as ProsemirrorNode } from '@milkdown/prose/model';
import {
    type EditorState,
    Plugin,
    PluginKey,
    Selection,
    type Transaction,
} from '@milkdown/prose/state';
import { $prose } from '@milkdown/utils';

const headerSyntaxPluginKey = new PluginKey('header-syntax');

const headerSyntaxPlugin = $prose(() => {
    let lastFocusedHeadingPos: number | null = null;

    return new Plugin({
        key: headerSyntaxPluginKey,
        appendTransaction: (transactions, oldState, newState) => {
            if (transactions.some((tr) => tr.docChanged || tr.selectionSet)) {
                return adjustHeaders(
                    newState,
                    oldState,
                    lastFocusedHeadingPos,
                    (pos) => {
                        lastFocusedHeadingPos = pos;
                    },
                );
            }
            return null;
        },
    });
});

function adjustHeaders(
    newState: EditorState,
    oldState: EditorState,
    lastFocusedPos: number | null,
    setLastFocusedPos: (pos: number | null) => void,
): Transaction | null {
    const tr = newState.tr;
    let changed = false;

    const { $from } = newState.selection;
    const node = $from.parent;
    const pos = $from.before();
    const oldNode = oldState.doc.nodeAt(pos);

    changed =
        handleLastFocusedHeading(
            tr,
            newState,
            lastFocusedPos,
            pos,
            node,
            setLastFocusedPos,
        ) || changed;

    if (node.type.name === 'heading' || node.type.name === 'paragraph') {
        changed =
            handleHeadingOrParagraph(
                tr,
                newState,
                oldState,
                node,
                oldNode,
                pos,
                setLastFocusedPos,
            ) || changed;
    }

    return changed ? tr : null;
}

function handleLastFocusedHeading(
    tr: Transaction,
    newState: EditorState,
    lastFocusedPos: number | null,
    currentPos: number,
    currentNode: ProsemirrorNode,
    setLastFocusedPos: (pos: number | null) => void,
): boolean {
    if (
        lastFocusedPos !== null &&
        (lastFocusedPos !== currentPos || currentNode.type.name !== 'heading')
    ) {
        const lastFocusedNode = newState.doc.nodeAt(lastFocusedPos);
        if (lastFocusedNode && lastFocusedNode.type.name === 'heading') {
            const newText = removeHashesFromHeading(
                lastFocusedNode.textContent,
            );
            if (newText !== lastFocusedNode.textContent) {
                tr.insertText(
                    newText,
                    lastFocusedPos + 1,
                    lastFocusedPos + lastFocusedNode.nodeSize - 1,
                );
                setLastFocusedPos(null);
                return true;
            }
        }
        setLastFocusedPos(null);
    }
    return false;
}

function handleHeadingOrParagraph(
    tr: Transaction,
    newState: EditorState,
    oldState: EditorState,
    node: ProsemirrorNode,
    oldNode: ProsemirrorNode | null,
    pos: number,
    setLastFocusedPos: (pos: number | null) => void,
): boolean {
    const { newLevel, newText } = parseHeaderContent(
        node.textContent,
        node,
        oldNode,
    );

    if (newLevel !== (node.attrs.level || 0) || newText !== node.textContent) {
        const oldCursorPos = newState.selection.from;
        const oldNodeText = node.textContent;

        updateNodeMarkup(tr, newState, pos, newLevel);
        if (newLevel > 0) {
            setLastFocusedPos(pos);
        }

        tr.insertText(newText, pos + 1, pos + node.nodeSize - 1);

        const newCursorPos = determineNewCursorPosition(
            oldCursorPos,
            oldNodeText,
            newText,
            pos,
        );

        const $newPos = tr.doc.resolve(newCursorPos);
        tr.setSelection(Selection.near($newPos));

        return true;
    }

    return false;
}

function updateNodeMarkup(
    tr: Transaction,
    state: EditorState,
    pos: number,
    newLevel: number,
): void {
    if (newLevel === 0) {
        tr.setNodeMarkup(pos, state.schema.nodes.paragraph);
    } else {
        tr.setNodeMarkup(pos, state.schema.nodes.heading, {
            level: newLevel,
        });
    }
}

function determineNewCursorPosition(
    oldCursorPos: number,
    oldText: string,
    newText: string,
    nodeStartPos: number,
): number {
    const relativeOldCursorPos = oldCursorPos - nodeStartPos - 1;

    const newTextHashMatch = newText.match(/^(#+)([\s\u00A0]*)/);
    if (newTextHashMatch) {
        const [, hashes, space] = newTextHashMatch;
        const hashAndSpaceLength = hashes.length + space.length;

        if (!oldText.startsWith('#')) {
            // New heading created, place cursor after the space
            return nodeStartPos + 1 + hashAndSpaceLength;
        }
        if (relativeOldCursorPos <= hashAndSpaceLength) {
            // Cursor was in the hash or space area, keep it there
            return (
                nodeStartPos +
                1 +
                Math.min(relativeOldCursorPos, hashAndSpaceLength)
            );
        }
    }

    // For other cases, try to maintain the cursor position relative to the content
    return nodeStartPos + 1 + Math.min(relativeOldCursorPos, newText.length);
}

function parseHeaderContent(
    text: string,
    currentNode: ProsemirrorNode,
    oldNode: ProsemirrorNode | null,
): { newLevel: number; newText: string } {
    const headerRegex = /^(#+)([\s\u00A0]*)(.*)$/;
    const match = text.match(headerRegex);

    // This could be a few things:
    // 1. Newly focused heading. In this case, we need to add the #s
    // 2. Heading level change. This has the same behavior as 1.
    // 3. Newly created heading. This has the same behavior as 1.
    // 4. Heading that turned into a paragraph. In this case we return level 0.
    //    There is a caveat here: If the user deletes the space between the # and the
    //    text then it should become a paragraph.
    // 5. Paragraph that turned into a heading. In thise case we return level 1.

    if (isHeadingNode(currentNode, oldNode)) {
        return handleHeadingNode(text, currentNode, oldNode, match);
    }

    if (isParagraphToHeadingConversion(currentNode, oldNode)) {
        return { newLevel: 1, newText: `#\u00A0${text}` };
    }

    // Otherwise we just assume its a paragraph and don't do anything
    return { newLevel: 0, newText: text };
}

function isHeadingNode(
    currentNode: ProsemirrorNode,
    oldNode: ProsemirrorNode | null,
): boolean {
    return (
        currentNode.type.name === 'heading' &&
        (!oldNode || oldNode?.type.name === 'heading')
    );
}

function isParagraphToHeadingConversion(
    currentNode: ProsemirrorNode,
    oldNode: ProsemirrorNode | null,
): boolean {
    return (
        currentNode.type.name === 'heading' &&
        oldNode?.type.name === 'paragraph'
    );
}

function handleHeadingNode(
    text: string,
    currentNode: ProsemirrorNode,
    oldNode: ProsemirrorNode | null,
    match: RegExpMatchArray | null,
): { newLevel: number; newText: string } {
    if (match) {
        const [, hashes, space, content] = match;
        if (space === '') {
            // Caveat for 4. Change to para.
            return { newLevel: 0, newText: text };
        }
        const newLevel = Math.min(Math.max(hashes.length, 1), 6);
        return { newLevel, newText: text };
    }

    // Manual 5. If you delete the hashes then it should just become a para
    if (!text.startsWith('#') && oldNode?.textContent.startsWith('#')) {
        return { newLevel: 0, newText: text };
    }

    // Otherwise, we need to put in the hash's
    const currentLevel = currentNode.attrs.level as number;
    return {
        newLevel: currentLevel,
        newText: `${'#'.repeat(currentLevel)}\u00A0${text}`,
    };
}

function removeHashesFromHeading(text: string): string {
    return text.replace(/^#+[\s\u00A0]*/, '');
}

export default headerSyntaxPlugin;
