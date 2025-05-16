/**
 * Additional surprise for users - error: RED, log: GRAY, info: GREEN, warn: YELLOW, group: CYAN, time: MAGENTA
 * Remember - it is SLOWING DOWN YOUR SERVER (built on top of node:console it is quite inefficient).
 */
export var logger: Record<"error" | "warn" | "log" | "info", stdConsoleFn> &
  Record<"group" | "time" | "timeEnd", lightConsoleFn> & {
    groupEnd(): void;
  };
type stdConsoleFn = (main: string, ...data: any[]) => any;
type lightConsoleFn = (label: string) => void;
