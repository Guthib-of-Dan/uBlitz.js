/**
 * interface of protobufjs Message, so that you aren't required to download protobufjs
 */
export interface PBMessage {
  toJSON(): object;
  [k: string]: any;
}
/**
 * interface of protobufjs Type, so that you aren't required to download protobufjs
 */
export interface PBType {
  decode(arr: Uint8Array, length?: number): PBMessage;
  [k: string]: any;
}
/**
 * just put in your message and proto type to encode it with (just for DRY principle)
 */
export function simpleProtoEnc(message: object, type: PBType): Uint8Array;
