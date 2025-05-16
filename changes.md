# Changes, so that you don't fear of not working code tomorrow

- 1.0.\* - Initial version with prototype support of multipart requests
- 1.1.0 - Support of Multipart requests, but broken globalOnAbort, which was replaced by res.emitter.once("abort", ()=>{})
- 1.1.1 - No globalOnAbort at all, added "shared" property on HeavyRoute and LightRoute (use it like this.shared!.any), removed try-catch from functional controllers (now look to static.mts in examples to see the usage)
- 1.2.0 - Dynamic code generation for request handlers; removed automatic error handling from functional controllers; Renamed HeavyRoute and LightRoute to HeavyMethod and LightMethod; improved sendFile function - now it returns an error, if it has occurred; added some of the CORS headers; changed HeadersMap.prepare() which now returns only the function to set headers;
- 1.2.1 - Added "finished" property on the response as a second flag along with "aborted"; fixed an issue, which didn't let the "parseFormDataBody" to end, if files sent were too small; removed not needed abstractions from "any" http method in router.
- 1.2.2 - Wrote documentation for DeclarativeResponse (which uWS doesn't provide yet), for ws.sendFirstFragment, ws.sendFragment, and ws.sendLastFragment methods.
- 1.2.3 - fixed issue with names of multipart files, when they are saved to disk.
- 1.2.4 - corked response in "http-codes" handlers
- 1.3.0 - updated uWebSockets.js to 20.52.0; wrote several examples; improved WebSockets' types; added several headers to HeadersMap; separated imports from the package with "export" field in package.json; improved support for websockets; Added one method to DeclarativeResponse; Removed tests (for now).
- 1.3.1 - moved source code to javascript and interfaces to declaration files (Now using bundler, compiler or special library is not required); added router.prefix() method, which adds prefix to next "define" methods
