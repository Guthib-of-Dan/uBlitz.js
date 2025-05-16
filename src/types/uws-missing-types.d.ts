import type {
  CompressOptions,
  RecognizedString,
  us_socket_context_t,
  WebSocket,
} from "uWebSockets.js";
import type { BaseHeaders, HttpRequest, HttpResponse } from ".";
/**
 * Thanks to "acarstoiu" github user for listing such methods here: "https://github.com/uNetworking/uWebSockets.js/issues/1165".
 */
type WebSocketFragmentation = {
  /** Sends the first frame of a multi-frame message. More fragments are expected (possibly none), followed by a last fragment. Care must be taken so as not to interleave these fragments with whole messages (sent with WebSocket.send) or with other messages' fragments.
   *
   * Returns 1 for success, 2 for dropped due to backpressure limit, and 0 for built up backpressure that will drain over time. You can check backpressure before or after sending by calling getBufferedAmount().
   *
   * Make sure you properly understand the concept of backpressure. Check the backpressure example file.
   */
  sendFirstFragment(
    message: RecognizedString,
    isBinary?: boolean,
    compress?: boolean
  ): number;
  /** Sends a continuation frame of a multi-frame message. More fragments are expected (possibly none), followed by a last fragment. In terms of sending data, a call to this method must follow a call to WebSocket.sendFirstFragment.
   *
   * Returns 1 for success, 2 for dropped due to backpressure limit, and 0 for built up backpressure that will drain over time. You can check backpressure before or after sending by calling getBufferedAmount().
   *
   * Make sure you properly understand the concept of backpressure. Check the backpressure example file.
   */
  sendFragment(message: RecognizedString, compress?: boolean): number;
  /** Sends the last continuation frame of a multi-frame message. In terms of sending data, a call to this method must follow a call to WebSocket.sendFirstFragment or WebSocket.sendFragment.
   *
   * Returns 1 for success, 2 for dropped due to backpressure limit, and 0 for built up backpressure that will drain over time. You can check backpressure before or after sending by calling getBufferedAmount().
   *
   * Make sure you properly understand the concept of backpressure. Check the backpressure example file.
   */
  sendLastFragment(message: RecognizedString, compress?: boolean): number;
};
export type MoreDocumentedWebSocket<UserData> = WebSocket<UserData> &
  WebSocketFragmentation;
export interface MoreDocumentedWebSocketBehavior<UserData extends object> {
  /** Maximum length of received message. If a client tries to send you a message larger than this, the connection is immediately closed. Defaults to 16 * 1024. */
  maxPayloadLength?: number;
  /** Whether or not we should automatically close the socket when a message is dropped due to backpressure. Defaults to false. */
  closeOnBackpressureLimit?: boolean;
  /** Maximum number of minutes a WebSocket may be connected before being closed by the server. 0 disables the feature. */
  maxLifetime?: number;
  /** Maximum amount of seconds that may pass without sending or getting a message. Connection is closed if this timeout passes. Resolution (granularity) for timeouts are typically 4 seconds, rounded to closest.
   * Disable by using 0. Defaults to 120.
   */
  idleTimeout?: number;
  /** What permessage-deflate compression to use. uWS.DISABLED, uWS.SHARED_COMPRESSOR or any of the uWS.DEDICATED_COMPRESSOR_xxxKB. Defaults to uWS.DISABLED. */
  compression?: CompressOptions;
  /** Maximum length of allowed backpressure per socket when publishing or sending messages. Slow receivers with too high backpressure will be skipped until they catch up or timeout. Defaults to 64 * 1024. */
  maxBackpressure?: number;
  /** Whether or not we should automatically send pings to uphold a stable connection given whatever idleTimeout. */
  sendPingsAutomatically?: boolean;
  /** Handler for new WebSocket connection. WebSocket is valid from open to close, no errors. */
  open?: (ws: MoreDocumentedWebSocket<UserData>) => void | Promise<void>;
  /** Handler for a WebSocket message. Messages are given as ArrayBuffer no matter if they are binary or not. Given ArrayBuffer is valid during the lifetime of this callback (until first await or return) and will be neutered. */
  message?: (
    ws: MoreDocumentedWebSocket<UserData>,
    message: ArrayBuffer,
    isBinary: boolean
  ) => void | Promise<void>;
  /** Handler for a dropped WebSocket message. Messages can be dropped due to specified backpressure settings. Messages are given as ArrayBuffer no matter if they are binary or not. Given ArrayBuffer is valid during the lifetime of this callback (until first await or return) and will be neutered. */
  dropped?: (
    ws: MoreDocumentedWebSocket<UserData>,
    message: ArrayBuffer,
    isBinary: boolean
  ) => void | Promise<void>;
  /** Handler for when WebSocket backpressure drains. Check ws.getBufferedAmount(). Use this to guide / drive your backpressure throttling. */
  drain?: (ws: MoreDocumentedWebSocket<UserData>) => void;
  /** Handler for close event, no matter if error, timeout or graceful close. You may not use WebSocket after this event. Do not send on this WebSocket from within here, it is closed. */
  close?: (
    ws: MoreDocumentedWebSocket<UserData>,
    code: number,
    message: ArrayBuffer
  ) => void;
  /** Handler for received ping control message. You do not need to handle this, pong messages are automatically sent as per the standard. */
  ping?: (ws: MoreDocumentedWebSocket<UserData>, message: ArrayBuffer) => void;
  /** Handler for received pong control message. */
  pong?: (ws: MoreDocumentedWebSocket<UserData>, message: ArrayBuffer) => void;
  /** Handler for subscription changes. */
  subscription?: (
    ws: MoreDocumentedWebSocket<UserData>,
    topic: ArrayBuffer,
    newCount: number,
    oldCount: number
  ) => void;
  /** Upgrade handler used to intercept HTTP upgrade requests and potentially upgrade to WebSocket.
   * See UpgradeAsync and UpgradeSync example files.
   */
  upgrade?: (
    res: HttpResponse<UserData>,
    req: HttpRequest,
    context: us_socket_context_t
  ) => void | Promise<void>;
}
export type DeclarativeResType = {
  writeHeader(key: string, value: string): DeclarativeResType;
  writeQueryValue(key: string): DeclarativeResType;
  writeHeaderValue(key: string): DeclarativeResType;
  /**
   * Write a chunk to the precompiled response
   */
  write(value: string): DeclarativeResType;
  writeParameterValue(key: string): DeclarativeResType;
  /**
   * Method to finalize forming a response.
   */
  end(value: string): any;
  writeBody(): DeclarativeResType;
  /**
   * additional method from ublitz.js
   */
  writeHeaders<Opts extends BaseHeaders>(headers: Opts): DeclarativeResType;
};
/**
 * Almost nothing different from uWS.DeclarativeResponse. The only modification - writeHeaders method (several methods, typescript intellisense)
 */
export var DeclarativeResponse: {
  new (): DeclarativeResType;
};
