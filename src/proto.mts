import protobufjs from "protobufjs";
/**
 * just put in your message and proto type to encode it with (just for DRY principle)
 */
function simpleProtoEnc(message: object, type: protobufjs.Type): Uint8Array {
  var uint8 = type.encode(type.create(message)).finish();
  return uint8.slice(0, uint8.byteLength);
}
export { simpleProtoEnc };
