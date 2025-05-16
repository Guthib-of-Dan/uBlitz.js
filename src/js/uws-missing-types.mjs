import uWS from "uWebSockets.js";
var DeclarativeResponse = uWS.DeclarativeResponse;
DeclarativeResponse.prototype.writeHeaders = function (headers) {
  for (const key in headers) this.writeHeader(key, headers[key]);
  return this;
};
export { DeclarativeResponse };
