import { resolve } from 'node:path';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
    main: {
        resolve: {
            alias: {
                '@preload': resolve('src/preload'),
            },
        },
        plugins: [externalizeDepsPlugin()],
        build: {
            watch: {
                include: ['src/main/**/*.{js,ts}', 'src/server/**/*.{js,ts}'],
            },
        },
    },
    preload: {
        plugins: [
            externalizeDepsPlugin(),
            TanStackRouterVite({
                routesDirectory: './src/renderer/src/routes',
                generatedRouteTree: './src/renderer/src/routeTree.gen.ts',
            }),
        ],
    },
    renderer: {
        resolve: {
            alias: {
                '@renderer': resolve('src/renderer/src'),
                '@preload': resolve('src/preload'),
            },
        },
        plugins: [react(), nodePolyfills()],
    },
});
