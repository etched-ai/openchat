import { resolve } from 'node:path';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

export default defineConfig({
    main: {
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
            },
        },
        plugins: [react()],
    },
});
