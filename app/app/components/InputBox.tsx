import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ArrowUp } from 'lucide-react';
import CodeMirrorEditor, {
    type CodemirrorEditorRef,
} from './Codemirror/Codemirror';
import { Button } from './ui/button';

type InputBoxProps = {
    handleSubmit: (text: string) => void;
    placeholderText: string;
};

const InputBox: React.FC<InputBoxProps> = ({
    handleSubmit,
    placeholderText,
}) => {
    const [inputContent, setInputContent] = useState('');
    const editorRef = useRef<CodemirrorEditorRef>(null);

    const focusOnEditor = useCallback(() => {
        editorRef.current?.focus();
    }, []);

    useEffect(() => {
        focusOnEditor();
    }, [focusOnEditor]);

    useEffect(() => {
        const _handleSubmit = (e: KeyboardEvent) => {
            if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                !e.metaKey &&
                !e.ctrlKey &&
                !e.altKey
            ) {
                e.preventDefault();
                handleSubmit(inputContent);
                editorRef.current?.clear();
            }
        };

        document.addEventListener('keydown', _handleSubmit);

        return () => {
            document.removeEventListener('keydown', _handleSubmit);
        };
    }, [inputContent, handleSubmit]);

    return (
        // biome-ignore lint/a11y/useKeyWithClickEvents: This is technically a text input
        <div
            className="flex items-start w-full h-full overflow-y-scroll bg-muted p-2"
            onClick={() => focusOnEditor()}
        >
            <CodeMirrorEditor
                ref={editorRef}
                initialValue=""
                placeholderText={placeholderText}
                onChange={setInputContent}
            />
            <div className="w-8 relative">
                <SubmitButton
                    onSubmit={() => handleSubmit(inputContent)}
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
