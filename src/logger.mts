import { styleText } from "node:util";
import console from "node:console";
/**
 * Additional surprise for users - error: RED, log: GRAY, info: GREEN, warn: YELLOW, group: CYAN, time: MAGENTA
 * Remember - it is SLOWING DOWN YOUR SERVER (built on top of node:console it is quite inefficient).
 */
var logger = {
  error(main, ...data) {
    console.error(styleText(["bgRed"], main), ...data);
  },
  log(main, ...data) {
    console.log(styleText(["gray"], main), ...data);
  },
  info(main, ...data) {
    console.info(styleText(["bgGreen"], main), ...data);
  },
  warn(main, ...data) {
    console.warn(styleText(["bgYellow"], main), ...data);
  },
  group(label) {
    console.group(styleText(["cyan"], "--- logs " + label + "---"));
  },
  groupEnd() {
    console.groupEnd();
  },
  time(label) {
    console.time(styleText(["magentaBright"], "time " + label));
  },
  timeEnd(label) {
    console.timeEnd(styleText(["magentaBright"], "time " + label));
  },
} as Record<"error" | "warn" | "log" | "info", stdConsoleFn> &
  Record<"group" | "time" | "timeEnd", lightConsoleFn> & {
    groupEnd(): void;
  };
type stdConsoleFn = (main: string, ...data: any[]) => any;
type lightConsoleFn = (label: string) => void;
export { logger };
