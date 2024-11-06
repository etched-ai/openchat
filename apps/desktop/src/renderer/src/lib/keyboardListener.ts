import { useEffect } from 'react';
import { ulid } from 'ulid';

type Shortcut = {
    key: string;
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
};

type AsyncCallback = () => Promise<void>;
type SyncCallback = () => void;

type Command = {
    id: string;
    shortcut: Shortcut;
    callback: AsyncCallback | SyncCallback;
};

let commands: Command[] = [];

export function registerCommand(
    shortcut: Shortcut,
    callback: AsyncCallback | SyncCallback,
): string {
    const id = ulid();
    commands.push({ id, shortcut, callback });
    return id;
}

export function unregisterCommand(id: string) {
    commands = commands.filter((cmd) => cmd.id !== id);
}

function isShortcutEqual(shortcut: Shortcut, event: KeyboardEvent): boolean {
    return (
        shortcut.key.toLowerCase() === event.key.toLowerCase() &&
        (shortcut.ctrlKey ?? false) === event.ctrlKey &&
        (shortcut.metaKey ?? false) === event.metaKey &&
        (shortcut.shiftKey ?? false) === event.shiftKey &&
        (shortcut.altKey ?? false) === event.altKey
    );
}

async function handleKeyDown(event: KeyboardEvent) {
    for (const cmd of commands) {
        if (isShortcutEqual(cmd.shortcut, event)) {
            event.preventDefault();
            try {
                await cmd.callback();
            } catch (error) {
                console.error(
                    'Error executing keyboard shortcut callback:',
                    error,
                );
            }
        }
    }
}

let isInitialized = false;

export function init() {
    if (!isInitialized) {
        window.addEventListener('keydown', handleKeyDown);
        isInitialized = true;
    }
}

export function cleanup() {
    if (isInitialized && commands.length === 0) {
        window.removeEventListener('keydown', handleKeyDown);
        isInitialized = false;
    }
}

export const useKeyboardListener = (commands: Omit<Command, 'id'>[]) => {
    useEffect(() => {
        const commandIDs: string[] = [];

        for (const command of commands) {
            const commandID = registerCommand(
                command.shortcut,
                command.callback,
            );
            commandIDs.push(commandID);
        }

        init();

        return () => {
            for (const commandID of commandIDs) unregisterCommand(commandID);
            cleanup();
        };
    }, [commands]);
};
