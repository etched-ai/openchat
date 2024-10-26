import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function truncateString(str: string, n: number) {
    return str.length > n ? `${str.slice(0, n - 1)}...` : str;
}
