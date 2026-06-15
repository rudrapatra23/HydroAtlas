import { clsx, type ClassValue } from "clsx";

/**
 * Minimal class-name composition helper.
 * Avoids pulling in tailwind-merge for a landing page.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
