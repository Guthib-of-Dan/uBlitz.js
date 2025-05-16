import { styleText } from "node:util";
import console from "node:console";
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
};
export { logger };
