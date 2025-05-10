/**
 * The example below refers to abort handling with async functions. For scalability still use Router and extendApp.
 */
import { setTimeout, clearTimeout } from "node:timers";
import uWS, { type HttpRequest } from "uWebSockets.js";
import { registerAbort, HeadersMap, type HttpResponse } from "ublitz.js";
import { logger } from "ublitz.js/logger";
const port = 9001;
const stopAllEvent = Symbol();
const setHeaders = new HeadersMap({
  "Content-Type": "application/json",
}).prepare();
type Answers = "NO" | "OK";
type Task = Promise<Answers>;
function someAsyncTask(res: HttpResponse, delay: number): Task {
  return new Promise<Answers>((resolve) => {
    const timeout = setTimeout(() => {
      res.emitter
        .removeListener("abort", onAborted)
        .removeListener(stopAllEvent, onAborted);
      resolve("OK");
    }, delay);
    function onAborted() {
      clearTimeout(timeout);
      /*still resolve, because all timeout need to be stopped */
      resolve("NO");
    }
    res.emitter.once("abort", onAborted).once(stopAllEvent, onAborted);
  });
}
function getRandomTask(res: uWS.HttpResponse): Task {
  const delay = Math.random() * 1000 + 200;
  return someAsyncTask(res as any, delay);
}
function getRandomTasks(res: uWS.HttpResponse): Task[] {
  const randomArray = new Array();
  var i = 0;
  var max = Math.round(Math.random() * 10);
  do {
    randomArray[i] = getRandomTask(res);
  } while (++i < max);
  return randomArray;
}

async function handler(res: HttpResponse, req: HttpRequest) {
  logger.group("request from " + req.getUrl());
  /* register abort handler, which adds an event extensible event emitter for abort and "res.aborted" flag */
  registerAbort(res);

  /*get all async random tasks (imagine here a fetch call or db query)*/
  var tasks = getRandomTasks(res);

  /*These tasks are protected against abort*/
  const onAborted = () => {
    logger.warn("aborted request");
    res.emitter.emit(stopAllEvent);
  };
  res.emitter.once("abort", onAborted);
  var resultsArray = await Promise.all(tasks);

  /*clean up*/
  res.emitter.removeListener("abort", onAborted);

  /*count successes and failures*/
  var counts: Record<Answers, number> = { OK: 0, NO: 0 };
  resultsArray.forEach((v) => counts[v]++);
  const resultsString = JSON.stringify(counts);
  logger.log(resultsString);
  logger.groupEnd();
  /* If we were aborted, you cannot respond */
  if (res.aborted) return;
  setHeaders(res);
  res.cork(() => {
    res.end(resultsString);
  });
}
uWS
  .App()
  .get("/*", handler as any)
  .listen(port, (token) => {
    if (token) {
      logger.info("Listening to port " + port);
    } else {
      logger.error("Failed to listen to port " + port);
    }
  });
