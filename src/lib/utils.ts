import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/+$/, "") ?? "";

export const withBasePath = (path: string) =>
  basePath && path.startsWith("/") && !path.startsWith("//") && path !== basePath && !path.startsWith(`${basePath}/`)
    ? `${basePath}${path}`
    : path;

export const initials = (name: string) =>
  name.replace(/^Rtr\.?\s*/i, "").split(" ").map((p) => p[0]).slice(0, 2).join("");

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(iso));
