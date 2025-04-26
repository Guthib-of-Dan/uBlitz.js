/**
 * interface of protobufjs Message, so that you aren't required to download protobufjs
 */
interface PBMessage {
  toJSON(): object;
}
/**
 * interface of protobufjs Type, so that you aren't required to download protobufjs
 */
interface PBType {
  decode(arr: Uint8Array, length?: number): PBMessage;
  [k: string]: any;
}
/**
 * just put in your message and proto type to encode it with (just for DRY principle)
 */
function simpleProtoEnc(message: object, type: PBType): Uint8Array {
  var uint8 = type.encode(type.create(message)).finish();
  return uint8.slice(0, uint8.byteLength);
}
export { simpleProtoEnc, type PBMessage, type PBType };
