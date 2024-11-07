import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function truncateString(str: string, n: number) {
    return str.length > n ? `${str.slice(0, n - 1)}...` : str;
}

export type AppConfig = {
    modelOptions: [
        {
            backend: 'OpenAI';
            models: { name: string; url?: string }[];
        },
        {
            backend: 'SGLang';
            endpoints: { name: string; url: string }[];
        },
    ];
    openaiApiKey?: string;
    selectedModel?:
        | {
              backend: 'SGLang';
              endpoint: { url: string; name: string };
          }
        | {
              backend: 'OpenAI';
              model: { url?: string; name: string };
          };
};
