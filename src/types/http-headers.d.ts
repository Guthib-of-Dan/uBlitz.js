import type { HttpResponse } from "./index";
import type { HttpResponse as uwsHttpResponse } from "uWebSockets.js";
type allHeaders = {
  /**
   * Headers, which may change for different responses. Use the same value for all methods of a given url.
   * @example
   * "Content-Type, Content-Length"
   */
  Vary: string;
  /**
   * confirms that client "really wants" to request that an HTTP client is upgraded to become a WebSocket.
   */
  "Sec-Websocket-Key": string;
  /**
   * protocol, you are communicating with using WebSockets
   * @see https://www.iana.org/assignments/websocket/websocket.xml#subprotocol-name
   */
  "Sec-Websocket-Protocol": string;
  "Sec-Websocket-Extensions": string;
  Server: string;
  "Set-Cookie": string;
  Upgrade: string;
  "User-Agent": string;
  Origin: string;
  Range: string;
  Location: string;
  "Last-Modified": string;
  Host: string;
  Forwarded: string;
  Cookie: string;
  Allow: string;
  "Access-Control-Request-Headers": string;
  "Access-Control-Request-Method": string;
  /**
   * indicates which content types, expressed as MIME types, the sender is able to understand
   */
  Accept: string;

  /**
   * if client fetched resource, but its MIME type is different - abort request
   */
  "X-Content-Type-Options": "nosniff";
  /**
   * Safari doesn't support it
   */
  "X-DNS-Prefetch-Control": "on" | "off";
  /**
   * Sites can use this to avoid clickjacking (<iframe> html tag)
   */
  "X-Frame-Options": "DENY" | "SAMEORIGIN";
  /**
   * whether you need info about client.
   */
  "Referrer-Policy":
    | "no-referrer"
    | "no-referrer-when-downgrade"
    | "origin"
    | "origin-when-cross-origin"
    | "same-origin"
    | "strict-origin"
    | "strict-origin-when-cross-origin"
    | "unsafe-url";
  /**
   * usually for Adobe Acrobat or Microsoft Silverlight.
   */
  "X-Permitted-Cross-Domain-Policies":
    | "none"
    | "master-only"
    | "by-content-type"
    | "by-ftp-filename"
    | "all"
    | "none-this-response";
  /**
   * Whether downloaded files should be run on the client side immediately. For IE8
   */
  "X-Download-Options": "noopen";
  /**
   * From where should client fetch resources
   */
  "Cross-Origin-Resource-Policy": "same-site" | "same-origin" | "cross-origin";
  /**
   * whether new page opened via Window.open() should be treated differently for performance reasons
   */
  "Cross-Origin-Opener-Policy":
    | "unsafe-none"
    | "same-origin-allow-popups"
    | "same-origin"
    | "noopener-allow-popups";
  /**
   *  By adding this header you can declare that your site should only load resources that have explicitly opted-in to being loaded across origins.
   * "require-corp" LETS YOU USE new SharedArrayBuffer()
   */
  "Cross-Origin-Embedder-Policy":
    | "unsafe-none"
    | "require-corp"
    | "credentialless";
  /**
   * similar to COOP, where ?1 is true
   */
  "Origin-Agent-Cluster": "?0" | "?1";
  /**
   * You know this one. It is "text/html" or "video/mp4" or whatever
   */
  "Content-Type": string;
  /**
   * Length in bytes of content, you send or receive.
   * @type number. BUT here it is a string
   */
  "Content-Length": string;
  /**
   * get it from setCSP()
   */
  "Content-Security-Policy": string;
  //"Content-Security-Policy-Report-Only":"",
  //"Strict-Transport-Security":`max-age=${60 * 60 * 24 * 365}; includeSubDomains`,
  /**
   * Allowed origins to get the resource. * - all, https://example.com - some website.
   */
  "Access-Control-Allow-Origin": string;
  /**
   * Allowed headers in the request.
   */
  "Access-Control-Allow-Headers": string;
  /**
   * CORS version of Allow header
   */
  "Access-Control-Allow-Methods": string;
  /**
   * How much time the response should be cached.
   * 1) must-revalidate
   * 2) no-cache
   * 3) no-store
   * 4) no-transform
   * 5) public -> cached anyhow
   * 6) private
   * 7) proxy-revalidate
   * 8) max-age=<seconds>
   * 9) s-maxage=<seconds>;
   * @but those below aren't supported everywhere:
   * 1) immutable
   * 2) stale-while-revalidate=<seconds>
   * 3) stale-if-error=<seconds>
   */
  "Cache-Control": string;
  "Access-Control-Max-Age": string;
};
export type BaseHeaders = Partial<allHeaders & { [key: string]: string }>;
/**
 * A map containing all headers as ArrayBuffers, so speed remains. There are several use cases of it:
 * 1) Don't define them in requests ( post(res){new HeadersMap({...headers}).prepare().toRes(res)} ). This is slow. Define maps BEFORE actual usage.
 * 2) You can pass them in LightMethod or HeavyMethod in shared property (but handle it manually)
 * 3) As a default use HeadersMap.default. It can't be edited, because it is already "prepared".
 * 4) Don't define them before writing status on request. uWebSockets.js after first written header considers response successful and puts "200" code automatically. Set headers AFTER validation in class controllers (handler function) and after writing status (or don't write it at all. It will be 200).
 */
export class HeadersMap<Opts extends BaseHeaders> extends Map {
  public currentHeaders: undefined | Opts;
  constructor(opts: Opts);
  /**
   * remove several headers from this map. Use BEFORE map.prepare(), because it will compare them by location in memory (string !== ArrayBuffer)
   * @example HeadersMap.default.remove("Content-Security-Policy", "X-DNS-Prefetch-Control", ...otherHeaders).prepare()
   */
  remove(...keys: (keyof Opts)[]): this;
  /**
   * last function before "going to response". It converts all strings to ArrayBuffers, so you should delete unwanted headers before it
   * @returns function, which sets all headers on the response.
   * @example
   * new HeadersMap({...HeadersMap.baseObj,"a":"a"}).remove("a").prepare();
   */
  prepare(): (res: uwsHttpResponse) => HttpResponse;
  /**
   * write all static headers to response. Use AFTER map.prepare function, if you want speed.
   * @example
   * headersMap.toRes(res);
   * // if you want dynamic headers, use BASE:
   * res.writeHeader(toAB(headerVariable),toAB(value))
   */
  toRes(res: uwsHttpResponse): HttpResponse;

  /**
   * obj, containing basic headers, which u can use as a background for own headers
   * @example
   * new HeadersMap({...HeadersMap.baseObj, "ownHeader":"hello world"}).remove("X-Download-Options")
   */
  static baseObj: Partial<BaseHeaders>;
  /**
   * map with default headers
   */
  static default: (res: uwsHttpResponse) => HttpResponse;
}
/**
 * This function creates Content-Security-Policy string,
 */
export function setCSP<T extends CSP>(
  mainCSP: T,
  ...remove: (keyof CSP)[]
): string;
type CSP = Partial<typeof CSPDirs>;
/**
 * Usual CSP directories. If you want more dirs:
 * 1) I will put more in soon
 * 2) use string concatenation (use BASE)
 * @example
 * new HeadersMap({...HeadersMap.baseObj, "Content-Security-Policy":setCSP({...CSPDirs}) + " your-dir: 'self';"})
 */
export var CSPDirs: {
  /**
   * basic urls for resources, if other directives are missing
   */
  "default-src": string[];
  /**
   *used for html <base> tag
   */
  "base-uri": string[];
  /**
   * urls valid for css at-rule @font-face
   */
  "font-src": string[];
  /**
   * urls, allowed for <form action=""> action attribute. Forbidden at all='none'
   */
  "form-action": string[];
  /**
   * urls of sites, WHICH can embed YOUR page via <iframe> etc. 'none' = forbidden at all
   */
  "frame-ancestors": string[];
  /**
   * valid image urls. 'none' = forbidden at all
   */
  "img-src": string[];
  /**
   * controls urls of WebSocket, fetch, fetchLater, EventSources and Navigator.sendBeacon functions or ping attribute of <a> tag.
   */
  "connect-src": string[];
  /**
   * usually stuff it has influence on is deprecated, so put 'none'
   */
  "object-src": string[];
  /**
   * Urls for script tags. But also it forbids inline js scripts. 'none' - forbidden, 'self' - your site's scripts, 'unsafe-inline' - allows inline scripts
   */
  "script-src": string[];
  /**
   * More important than "script-src", specifies inline js scripts. 'unsafe-inline' - allow onclick and other inline attributes
   */
  "script-src-attr": string[];
  /**
   * More important than "script-src", specifies urls for <script> tag. 'none' - forbidden; 'unsafe-inline' - allow <script> tag without src=""; 'unsafe-eval' - for protobufjs;
   */
  "script-src-elem": string[];
  /**
   * Urls for style tags. But also it forbids inline css styles. 'none' - forbidden, 'self' - your site's styles, 'unsafe-inline' - allows inline styles
   */
  "style-src": string[];
  /**
   * More important than "style-src", specifies inline css styles.
   */
  "style-src-attr": string[];
  /**
   * More important than "style-src", specifies urls for <link> tag
   */
  "style-src-elem": string[];
  /**
   * Trusted Types XSS DOM API names. 'allow-duplicates', 'none'. Works for Chrome and Edge.
   */
  "trusted-types": string[];
  /**
   * for websites with deprecated urls.
   */
  "upgrade-insecure-requests": string[];
  /**
   * specifies valid sources for Worker, SharedWorker, or ServiceWorker scripts.
   */
  "worker-src": string[];
  /**
   * specifies valid sources for loading media using the <audio> and <video> elements.
   */
  "media-src": string[];
};
export type lowHeaders = Lowercase<keyof allHeaders>;
