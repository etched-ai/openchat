import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export type AsyncGeneratorYieldType<
    T extends AsyncGenerator<unknown, unknown, unknown>,
> = T extends AsyncGenerator<infer Y, unknown, unknown> ? Y : never;

export function truncateString(str: string, n: number) {
    return str.length > n ? `${str.slice(0, n - 1)}...` : str;
}
