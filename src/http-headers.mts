import { toAB, type HttpResponse } from "./index.mts";
var headers = {
  /**
   * if client fetched resource, but its MIME type is different - abort request
   */
  "X-Content-Type-Options": "nosniff",
  /**
   * Safari doesn't support it
   */
  "X-DNS-Prefetch-Control": "off" as "on" | "off",
  /**
   * Sites can use this to avoid clickjacking (<iframe> html tag)
   */
  "X-Frame-Options": "DENY" as "DENY" | "SAMEORIGIN",
  /**
   * whether you need info about client.
   */
  "Referrer-Policy": "same-origin" as
    | "no-referrer"
    | "no-referrer-when-downgrade"
    | "origin"
    | "origin-when-cross-origin"
    | "same-origin"
    | "strict-origin"
    | "strict-origin-when-cross-origin"
    | "unsafe-url",
  /**
   * usually for Adobe Acrobat or Microsoft Silverlight.
   */
  "X-Permitted-Cross-Domain-Policies": "none" as
    | "none"
    | "master-only"
    | "by-content-type"
    | "by-ftp-filename"
    | "all"
    | "none-this-response",
  /**
   * Whether downloaded files should be run on the client side immediately. For IE8
   */
  "X-Download-Options": "noopen",
  /**
   * From where should client fetch resources
   */
  "Cross-Origin-Resource-Policy": "same-origin" as
    | "same-site"
    | "same-origin"
    | "cross-origin",
  /**
   * whether new page opened via Window.open() should be treated differently for performance reasons
   */
  "Cross-Origin-Opener-Policy": "same-origin" as
    | "unsafe-none"
    | "same-origin-allow-popups"
    | "same-origin"
    | "noopener-allow-popups",
  /**
   *  By adding this header you can declare that your site should only load resources that have explicitly opted-in to being loaded across origins.
   * "require-corp" LETS YOU USE new SharedArrayBuffer()
   */
  "Cross-Origin-Embedder-Policy": "require-corp" as
    | "unsafe-none"
    | "require-corp"
    | "credentialless",
  /**
   * similar to COOP, where ?1 is true
   */
  "Origin-Agent-Cluster": "?1" as "?0" | "?1",
  /**
   * get it from setCSP()
   */
  "Content-Security-Policy": "" as string,
  //"Content-Security-Policy-Report-Only":"",
  //"Strict-Transport-Security":`max-age=${60 * 60 * 24 * 365}; includeSubDomains`,
} as const;
type BaseHeaders = Partial<typeof headers & { [key: string]: string }>;
/**
 * A map containing all headers as ArrayBuffers, so speed remains. There are several use cases of it:
 * 1) Don't define them in requests ( post(res){new HeadersMap({...headers}).prepare().toRes(res)} ). This is slow. Define maps BEFORE actual usage.
 * 2) You can pass them in LightRoute or HeavyRoute (they will fill response as soon as request starts)
 * 3) As a default use HeadersMap.default. It can't be edited, because it is already "prepared". When route isn't some LightRoute or HeavyRoute you should use .toRes(res)
 */
class HeadersMap<Opts extends BaseHeaders> extends Map {
  private currentHeaders: undefined | Opts;
  constructor(opts: Opts) {
    super();
    this.currentHeaders = opts;
  }
  /**
   * remove several headers from this map. Use BEFORE map.prepare(), because it will compare them by location in memory (string !== ArrayBuffer)
   * @example HeadersMap.default.remove("Content-Security-Policy", "X-DNS-Prefetch-Control", ...otherHeaders).prepare()
   */
  remove(...keys: (keyof Opts)[]): this {
    keys.forEach((key) => this.delete(key));
    return this;
  }
  /**
   * last function before "going to response". It converts all string to ArrayBuffers, so that you can delete some keys before it
   * @example
   * new HeadersMap({...HeadersMap.baseObj}).remove("Content-Security-Policy").prepare();
   */
  prepare(): this {
    var key: any;
    for (key in this.currentHeaders!)
      this.set(toAB(key), toAB(this.currentHeaders![key] as string));
    this.currentHeaders = undefined;
    return this;
  }
  /**
   * write all static headers to response. Use AFTER map.prepare function, if you want speed.
   * @example
   * headersMap.toRes(res);
   * // if you want dynamic headers, use BASE:
   * res.writeHeader(toAB(headerVariable),toAB(value))
   */
  toRes(res: HttpResponse): void {
    res.cork(() => this.forEach((value, key) => res.writeHeader(key, value)));
  }
  /**
   * obj, containing basic headers, which u can use as a background for own headers
   * @example
   * new HeadersMap({...HeadersMap.baseObj, "ownHeader":"hello world"}).remove("X-Download-Options")
   */
  static baseObj = headers;
  /**
   * map with default headers
   */
  static default = new HeadersMap({ ...HeadersMap.baseObj }).prepare();
}
function setCSP<T extends CSP>(mainCSP: T, ...remove: (keyof CSP)[]): string {
  var key: keyof T;
  var CSPstring: string = "";
  remove.forEach((dir) => delete mainCSP[dir]);
  for (key in mainCSP)
    CSPstring += `${key as string} ${(mainCSP[key] as string[]).join(" ")}; `;
  return CSPstring;
}
/**
 * Usual CSP directories. If you want more dirs:
 * 1) I will put more in soon
 * 2) use string concatenation (use BASE)
 * @example
 * new HeadersMap({...HeadersMap.baseObj, "Content-Security-Policy":setCSP({...CSPDirs}) + " your-dir: 'self';"})
 */
var CSPDirs = {
  /**
   * basic urls for resources, if other directives are missing
   */
  "default-src": ["'self'"] as string[],
  /**
   *used for html <base> tag
   */
  "base-uri": ["'self'"] as string[],
  /**
   * urls valid for css at-rule @font-face
   */
  "font-src": ["'self'"] as string[],
  /**
   * urls, allowed for <form action=""> action attribute. Forbidden at all='none'
   */
  "form-action": ["'self'"] as string[],
  /**
   * urls of sites, WHICH can embed YOUR page via <iframe> etc. 'none' = forbidden at all
   */
  "frame-ancestors": ["'none'"] as string[],
  /**
   * valid image urls. 'none' = forbidden at all
   */
  "img-src": ["'self'"] as string[],
  /**
   * controls urls of WebSocket, fetch, fetchLater, EventSources and Navigator.sendBeacon functions or ping attribute of <a> tag.
   */
  "connect-src": ["'self'"] as string[],
  /**
   * usually stuff it has influence on is deprecated, so put 'none'
   */
  "object-src": ["'none'"] as string[],
  /**
   * Urls for script tags. But also it forbids inline js scripts. 'none' - forbidden, 'self' - your site's scripts, 'unsafe-inline' - allows inline scripts
   */
  "script-src": ["'self'"] as string[],
  /**
   * More important than "script-src", specifies inline js scripts. 'unsafe-inline' - allow onclick and other inline attributes
   */
  "script-src-attr": ["'none'"] as string[],
  /**
   * More important than "script-src", specifies urls for <script> tag. 'none' - forbidden; 'unsafe-inline' - allow <script> tag without src=""; 'unsafe-eval' - for protobufjs;
   */
  "script-src-elem": ["'self'"] as string[],
  /**
   * Urls for style tags. But also it forbids inline css styles. 'none' - forbidden, 'self' - your site's styles, 'unsafe-inline' - allows inline styles
   */
  "style-src": ["'self'"] as string[],
  /**
   * More important than "style-src", specifies inline css styles.
   */
  "style-src-attr": ["'none'"] as string[],
  /**
   * More important than "style-src", specifies urls for <link> tag
   */
  "style-src-elem": ["'self'"] as string[],
  /**
   * Trusted Types XSS DOM API names. 'allow-duplicates', 'none'. Works for Chrome and Edge.
   */
  "trusted-types": ["'none'"] as string[],
  /**
   * for websites with deprecated urls.
   */
  "upgrade-insecure-requests": [],
  /**
   * specifies valid sources for Worker, SharedWorker, or ServiceWorker scripts.
   */
  "worker-src": ["'self'"] as string[],
  /**
   * specifies valid sources for loading media using the <audio> and <video> elements.
   */
  "media-src": ["'self'"] as string[],
} as const satisfies Record<string, string[]>;
type CSP = Partial<typeof CSPDirs>;
export { HeadersMap, type BaseHeaders, setCSP, CSPDirs };
