import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function capitalize(str: string) : string {
  const strs = str.split(" ");
  if(strs.length === 1) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  return strs.map(capitalize).join(" ");
}