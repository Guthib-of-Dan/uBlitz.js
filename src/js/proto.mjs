function simpleProtoEnc(message, type) {
  var uint8 = type.encode(type.create(message)).finish();
  return uint8.slice(0, uint8.byteLength);
}
export { simpleProtoEnc };
