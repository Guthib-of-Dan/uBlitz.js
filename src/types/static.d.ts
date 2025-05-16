import type { HttpResponse } from "./index";
/**
 * Efficiently send file with size over 500 megabytes with low-level tricks and automated backpressure handling. Automatically closes the response if an error happens.
 * @returns Error or undefined (if ok).
 */
export function sendFile(opts: {
  path: string;
  contentType: string;
  res: HttpResponse & {
    done?: boolean;
    unsentChunk?: ArrayBuffer;
    lastOffset?: number;
    error?: undefined | Error;
  };
  totalSize: number;
}): Promise<undefined | Error>;
