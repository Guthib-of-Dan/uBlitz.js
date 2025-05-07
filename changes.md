# Changes, so that you don't fear of not working code tomorrow

- 1.0.\* - Initial version with prototype support of multipart requests
- 1.1.0 - Support of Multipart requests, but broken globalOnAbort, which was replaced by res.emitter.once("abort", ()=>{})
- 1.1.1 - No globalOnAbort at all, added "shared" property on HeavyRoute and LightRoute (use it like this.shared!.any), removed try-catch from functional controllers (now look to static.mts in examples to see the usage)
- 1.2.0 Dynamic code generation for request handlers
