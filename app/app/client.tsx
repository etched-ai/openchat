import { StartClient } from '@tanstack/start';
/// <reference types="vinxi/types/client" />
import { hydrateRoot } from 'react-dom/client';
import { createRouter } from './router';

const router = createRouter();

const root = document.getElementById('root');
if (!root) {
    throw new Error('Root element not found');
}

hydrateRoot(root, <StartClient router={router} />);
