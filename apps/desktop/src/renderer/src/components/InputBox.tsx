import { zodResolver } from '@hookform/resolvers/zod';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { AppConfig } from '@renderer/lib/utils';
import { ArrowUp, ChevronDown, Plus } from 'lucide-react';
import OpenAIIcon from '../assets/openai-icon.png';
import SGLIcon from '../assets/sgl-icon.png';
import CodeMirrorEditor, {
    type CodemirrorEditorRef,
} from './Codemirror/Codemirror';
import { Button } from './ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Form, FormControl, FormField, FormItem, FormLabel } from './ui/form';
import { Input } from './ui/input';

const defaultConfig = {
    modelOptions: [
        {
            backend: 'OpenAI',
            models: [{ name: 'gpt-4o' }],
        },
        {
            backend: 'SGLang',
            endpoints: [],
        },
    ],
};

type InputBoxProps = {
    handleSubmit: (text: string) => void;
    placeholderText: string;
};

const InputBox: React.FC<InputBoxProps> = ({
    handleSubmit,
    placeholderText,
}) => {
    const [inputContent, setInputContent] = useState('');
    const [currentConfig, setCurrentConfig] =
        // @ts-ignore
        useState<AppConfig>(defaultConfig);

    const setSelectedModel = (
        selectedModel: NonNullable<AppConfig['selectedModel']>,
    ) => {
        window.electron.ipcRenderer.send('updateConfig', { selectedModel });
        setCurrentConfig((cur) => ({
            ...cur,
            selectedModel,
        }));
    };
    const createAndSelectModel = (
        selectedModel: NonNullable<AppConfig['selectedModel']>,
    ) => {
        const newConfig = {
            ...currentConfig,
            selectedModel,
        };
        if (selectedModel.backend === 'OpenAI') {
            newConfig.modelOptions[0].models.push(selectedModel.model);
        } else {
            newConfig.modelOptions[1].endpoints.push(selectedModel.endpoint);
        }
        window.electron.ipcRenderer.send('writeConfig', newConfig);
        setCurrentConfig(newConfig);
    };
    const setOpenAIAPIKey = (apiKey: string) => {
        window.electron.ipcRenderer.send('updateConfig', {
            openaiApiKey: apiKey,
        });
        setCurrentConfig((cur) => ({
            ...cur,
            openaiApiKey: apiKey,
        }));
    };

    useEffect(() => {
        (async () => {
            const config =
                await window.electron.ipcRenderer.invoke('readConfig');
            setCurrentConfig(config as AppConfig);
        })();
    }, []);

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
            className="flex flex-col items-start w-full h-full overflow-y-scroll bg-muted p-2"
            onClick={() => focusOnEditor()}
        >
            <div className="flex flex-1 w-full">
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
            <ModelSelectorDropdown
                modelOptions={currentConfig.modelOptions}
                selectedModel={currentConfig.selectedModel}
                setSelectedModel={setSelectedModel}
                createAndSelectModel={createAndSelectModel}
                openaiApiKey={currentConfig.openaiApiKey}
                setOpenAIApiKey={setOpenAIAPIKey}
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
                    fixed w-8 h-8 p-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center
                `}
            onClick={onSubmit}
        >
            <ArrowUp className="w-4 h-4" />
        </Button>
    );
};

const newOpenAIModelFormSchema = z.object({
    modelName: z.string(),
    url: z.string(),
});
const newSGLModelFormSchema = z.object({
    url: z.string(),
});
type ModelSelectorDropdownProps = {
    modelOptions: AppConfig['modelOptions'];
    selectedModel: AppConfig['selectedModel'];
    setSelectedModel: (
        newModel: NonNullable<AppConfig['selectedModel']>,
    ) => void;
    createAndSelectModel: (
        newModel: NonNullable<AppConfig['selectedModel']>,
    ) => void;
    openaiApiKey: string | undefined;
    setOpenAIApiKey: (apiKey: string) => void;
};
const ModelSelectorDropdown: React.FC<ModelSelectorDropdownProps> = ({
    modelOptions,
    selectedModel,
    setSelectedModel,
    createAndSelectModel,
    openaiApiKey,
    setOpenAIApiKey,
}) => {
    const [isOpenAINewModelExpanded, setIsOpenAINewModelExpanded] =
        useState(false);
    const [isSGLNewModelExpanded, setIsSGLNewModelExpanded] = useState(false);

    const newOpenAIModelForm = useForm<
        z.infer<typeof newOpenAIModelFormSchema>
    >({
        resolver: zodResolver(newOpenAIModelFormSchema),
        defaultValues: {
            modelName: '',
            url: '',
        },
    });
    function onSubmitNewOpenAIModelForm(
        values: z.infer<typeof newOpenAIModelFormSchema>,
    ) {
        createAndSelectModel({
            backend: 'OpenAI',
            model: { url: values.url, name: values.modelName },
        });
    }

    const newSGLModelForm = useForm<z.infer<typeof newSGLModelFormSchema>>({
        resolver: zodResolver(newSGLModelFormSchema),
        defaultValues: {
            url: '',
        },
    });
    async function onSubmitNewSGLModelForm(
        values: z.infer<typeof newSGLModelFormSchema>,
    ) {
        const GetModelInfoSchema = z.object({
            model_path: z.string(),
            is_generation: z.boolean(),
        });
        const resp = await fetch(`${values.url}/get_model_info`, {
            method: 'GET',
        });
        const json = await resp.json();
        const modelInfo = GetModelInfoSchema.parse(json);

        createAndSelectModel({
            backend: 'SGLang',
            endpoint: { url: values.url, name: modelInfo.model_path },
        });
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger>
                {selectedModel ? (
                    <div className="flex flex-row items-center">
                        <img
                            src={
                                selectedModel.backend === 'OpenAI'
                                    ? OpenAIIcon
                                    : SGLIcon
                            }
                            alt={
                                selectedModel.backend === 'OpenAI'
                                    ? 'OpenAI Icon'
                                    : 'SGLang Icon'
                            }
                            className="w-4 h-4"
                        />
                        <span className="font-light text-sm text-gray-500 ml-1">
                            {selectedModel.backend === 'OpenAI'
                                ? selectedModel.model.name
                                : selectedModel.endpoint.name}
                        </span>
                        <ChevronDown
                            className="w-4 text-gray-500 ml-[2px] mt-[2px]"
                            strokeWidth={1.6}
                        />
                    </div>
                ) : (
                    <span className="font-light text-sm text-gray-500 ml-1">
                        Select a model
                    </span>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="overflow-y-auto max-h-80">
                <DropdownMenuLabel>OpenAI</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    {modelOptions[0].models.map((m) => (
                        <DropdownMenuItem
                            key={m.name}
                            onClick={() =>
                                setSelectedModel({
                                    backend: 'OpenAI',
                                    model: m,
                                })
                            }
                        >
                            {/* @ts-ignore */}
                            {m.name} {m.url ? `(${m.url})` : ''}
                        </DropdownMenuItem>
                    ))}
                    <Button
                        variant={'ghost'}
                        className="flex flex-row w-full px-2 py-1.5 h-8 justify-start gap-1"
                        onClick={() =>
                            setIsOpenAINewModelExpanded((prev) => !prev)
                        }
                    >
                        <Plus />
                        New model
                    </Button>
                    <div
                        className={`px-2 transition-all duration-100 ease-in-out ${!isOpenAINewModelExpanded ? 'h-0' : 'py-1.5'}`}
                    >
                        {isOpenAINewModelExpanded && (
                            <Form {...newOpenAIModelForm}>
                                <form
                                    onSubmit={newOpenAIModelForm.handleSubmit(
                                        onSubmitNewOpenAIModelForm,
                                    )}
                                    className="space-y-3"
                                >
                                    <FormField
                                        control={newOpenAIModelForm.control}
                                        name="modelName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Model</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="gpt-4o-mini"
                                                        {...field}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={newOpenAIModelForm.control}
                                        name="url"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>URL</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="https://localhost:30000/v1"
                                                        {...field}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" className="h-8">
                                        Submit
                                    </Button>
                                </form>
                            </Form>
                        )}
                    </div>
                    <div className="w-full px-2 my-2">
                        <Input
                            placeholder="API Key"
                            value={openaiApiKey}
                            // defaultValue={openaiApiKey}
                            onChange={(e) => setOpenAIApiKey(e.target.value)}
                        />
                    </div>
                </DropdownMenuGroup>
                <DropdownMenuLabel>SGLang</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    {modelOptions[1].endpoints.map((e) => (
                        <DropdownMenuItem
                            key={e.url}
                            onClick={() =>
                                setSelectedModel({
                                    backend: 'SGLang',
                                    endpoint: e,
                                })
                            }
                        >
                            {e.name} ({e.url})
                        </DropdownMenuItem>
                    ))}
                    <Button
                        variant={'ghost'}
                        className="flex flex-row w-full px-2 py-1.5 h-8 justify-start gap-1"
                        onClick={() =>
                            setIsSGLNewModelExpanded((prev) => !prev)
                        }
                    >
                        <Plus />
                        New model
                    </Button>
                    <div
                        className={`px-2 transition-all duration-100 ease-in-out ${!isSGLNewModelExpanded ? 'h-0' : 'py-1.5'}`}
                    >
                        {isSGLNewModelExpanded && (
                            <Form {...newSGLModelForm}>
                                <form
                                    onSubmit={newSGLModelForm.handleSubmit(
                                        onSubmitNewSGLModelForm,
                                    )}
                                    className="space-y-3"
                                >
                                    <FormField
                                        control={newSGLModelForm.control}
                                        name="url"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>URL</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="https://localhost:30000"
                                                        {...field}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" className="h-8">
                                        Submit
                                    </Button>
                                </form>
                            </Form>
                        )}
                    </div>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default InputBox;
