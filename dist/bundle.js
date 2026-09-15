var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler2;
      if (middleware[i]) {
        handler2 = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler2 = i === middleware.length && next || void 0;
      }
      if (handler2) {
        try {
          res = await handler2(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
  };
};

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/buffer.js
var bufferToFormData = (arrayBuffer, contentType) => {
  const response = new Response(arrayBuffer, {
    headers: {
      // Normalize the media type (case-insensitive) while keeping parameters like the boundary
      "Content-Type": contentType.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase())
    }
  });
  return response.formData();
};

// node_modules/hono/dist/utils/body.js
var MAX_NESTING_DEPTH = 32;
var MAX_NESTED_OBJECTS = 1e4;
var isRawRequest = (request) => "headers" in request;
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const contentType = headers.get("Content-Type");
  const mediaType = contentType?.split(";")[0].trim().toLowerCase();
  if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") {
    return parseFormData(request, { all, dot });
  }
  return {};
};
async function parseFormData(request, options) {
  if (!isRawRequest(request) && request.bodyCache.formData) {
    return convertFormDataToBodyData(
      await request.bodyCache.formData,
      options
    );
  }
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const arrayBuffer = await request.arrayBuffer();
  const formDataPromise = bufferToFormData(arrayBuffer, headers.get("Content-Type") || "");
  if (!isRawRequest(request)) {
    request.bodyCache.formData = formDataPromise;
  }
  const formData = await formDataPromise;
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  const nestingState = { count: 0 };
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value, nestingState);
        delete form[key];
      }
    });
  }
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
};
var handleParsingNestedValues = (form, key, value, state) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".", MAX_NESTING_DEPTH + 2);
  if (keys.length > MAX_NESTING_DEPTH + 1) {
    throwNestingLimitExceeded();
  }
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        if (state.count++ >= MAX_NESTED_OBJECTS) {
          throwNestingLimitExceeded();
        }
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};
var throwNestingLimitExceeded = () => {
  throw new Error("Nesting limit exceeded");
};

// node_modules/hono/dist/utils/url.js
var splitPath = (path2) => {
  const paths = path2.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path: path2 } = extractGroupsFromPath(routePath);
  const paths = splitPath(path2);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path2) => {
  const groups = [];
  path2 = path2.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path: path2 };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path2 = url.slice(start, end);
      return tryDecodeURI(path2.includes("%25") ? path2.replace(/%25/g, "%2525") : path2);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path2) => {
  if (path2.charCodeAt(path2.length - 1) !== 63 || !path2.includes(":")) {
    return null;
  }
  const segments = path2.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (segment.charCodeAt(segment.length - 1) === 63) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.slice(0, -1);
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var tryDecodeURIComponent = (str) => str.indexOf("%") !== -1 ? tryDecode(str, decodeURIComponent_) : str;
var _decodeURI = (value) => {
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return tryDecodeURIComponent(value);
};
var _getQueryParam = (url, key, multiple) => {
  const hashIndex = url.indexOf("#", 8);
  if (hashIndex !== -1) {
    url = url.slice(0, hashIndex);
  }
  let encoded;
  if (!multiple && key && key.indexOf("%") === -1 && key.indexOf("+") === -1) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = /* @__PURE__ */ Object.create(null);
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var HonoRequest = class {
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path2 = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path2;
    this.#matchResult = matchResult;
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex]?.[1][key];
    const param = this.#getParamValue(paramKey);
    return param && tryDecodeURIComponent(param);
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex]?.[1] ?? {});
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = tryDecodeURIComponent(value);
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = /* @__PURE__ */ Object.create(null);
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    for (const anyCachedKey in bodyCache) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  };
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text2) => JSON.parse(text2));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * `.bytes()` parses the request body as a `Uint8Array`.
   *
   * @see {@link https://hono.dev/docs/api/request#bytes}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.bytes()
   * })
   * ```
   */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    ;
    (this.#validatedData ??= {})[target] = data;
  }
  valid(target) {
    return this.#validatedData?.[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
};

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
};
var createResponseInstance = (body, init) => new Response(body, init);
var Context = class {
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = (layout2) => this.#layout = layout2;
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = () => this.#layout;
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   // Append multiple headers using the append option (e.g. Vary)
   *   c.header('Vary', 'Accept-Encoding', { append: true })
   *   c.header('Vary', 'User-Agent', { append: true })
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = (name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  };
  status = (status) => {
    this.#status = status;
  };
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    let responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders;
    if (typeof arg === "object" && arg.headers) {
      responseHeaders ??= new Headers();
      for (const [key, value] of new Headers(arg.headers)) {
        if (key === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      if (!responseHeaders) {
        let count = 0;
        for (const k in headers) {
          if (++count > 1 || typeof headers[k] !== "string") {
            responseHeaders = new Headers();
            break;
          }
        }
      }
      if (responseHeaders) {
        for (const k in headers) {
          const v = headers[k];
          if (typeof v === "string") {
            responseHeaders.set(k, v);
          } else {
            responseHeaders.delete(k);
            for (const v2 of v) {
              responseHeaders.append(k, v2);
            }
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, {
      status,
      headers: responseHeaders ?? headers
    });
  }
  newResponse = (...args) => this.#newResponse(...args);
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = (text2, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text2) : this.#newResponse(
      text2,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  };
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = (object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  };
  html = (html, arg, headers) => {
    const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = (location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  };
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = () => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  };
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch", "query"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class _Hono {
  get;
  post;
  put;
  delete;
  options;
  patch;
  query;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        const methodName = method.toUpperCase();
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(methodName, this.#path, args1);
        }
        args.forEach((handler2) => {
          this.#addRoute(methodName, this.#path, handler2);
        });
        return this;
      };
    });
    this.on = (method, path2, ...handlers) => {
      for (const p of [path2].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          const methodName = m.toUpperCase();
          for (const handler2 of handlers) {
            this.#addRoute(methodName, this.#path, handler2);
          }
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler2) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler2);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path2, app2) {
    const subApp = this.basePath(path2);
    app2.routes.map((r) => {
      let handler2;
      if (app2.errorHandler === errorHandler) {
        handler2 = r.handler;
      } else {
        handler2 = async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res;
        handler2[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler2, r.basePath);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path2) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path2);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = (handler2) => {
    this.errorHandler = handler2;
    return this;
  };
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = (handler2) => {
    this.#notFoundHandler = handler2;
    return this;
  };
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path2, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = (request) => request;
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path2);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler2 = async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    };
    this.#addRoute(METHOD_NAME_ALL, mergePath(path2, "*"), handler2);
    return this;
  }
  #addRoute(method, path2, handler2, baseRoutePath) {
    path2 = mergePath(this._basePath, path2);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path: path2,
      method,
      handler: handler2
    };
    this.router.add(method, path2, [handler2, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path2 = this.getPath(request, { env });
    const matchResult = this.router.match(method, path2);
    const c = new Context(request, {
      path: path2,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} env - env Object
   * @param {ExecutionContext} executionCtx - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  };
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
};

// node_modules/hono/dist/router/utils.js
var createNullObject = () => /* @__PURE__ */ Object.create(null);

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path2) {
  const matchers = this.buildAllMatchers();
  const match2 = ((method2, path22) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path22];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path22.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  });
  this.match = match2;
  return match2(method, path2);
}

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return b === TAIL_WILDCARD_REG_EXP_STR ? -1 : 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class _Node {
  // handler index of a dynamic path, or -1 for a static path terminal
  #index;
  #varIndex;
  #children = createNullObject();
  insert(tokens, index, paramMap, context, isStatic) {
    let node = this;
    for (let i = 0, len = tokens.length; i < len; i++) {
      const token = tokens[i];
      const pattern = token.length === 1 ? token === "*" ? i === len - 1 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : null : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      let nextNode;
      if (pattern) {
        const name = pattern[1];
        let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
        if (name && pattern[2]) {
          if (regexpStr === ".*") {
            throw PATH_ERROR;
          }
          regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
          if (/\((?!\?:)/.test(regexpStr)) {
            throw PATH_ERROR;
          }
          if (regexpStr.length === 1 && regExpMetaChars.has(regexpStr)) {
            throw PATH_ERROR;
          }
        }
        nextNode = node.#children[regexpStr];
        if (!nextNode) {
          if (regexpStr !== ONLY_WILDCARD_REG_EXP_STR && regexpStr !== TAIL_WILDCARD_REG_EXP_STR) {
            for (const k in node.#children) {
              if (
                // a single-char pattern coexists with single-char literals as a literal does
                (regexpStr.length > 1 || k.length > 1) && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
              ) {
                throw PATH_ERROR;
              }
            }
          }
          nextNode = node.#children[regexpStr] = new _Node();
        }
        if (name !== "") {
          nextNode.#varIndex ??= context.varIndex++;
          paramMap.push([name, nextNode.#varIndex]);
        }
      } else {
        nextNode = node.#children[token];
        if (!nextNode) {
          for (const k in node.#children) {
            if (k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR) {
              throw PATH_ERROR;
            }
          }
          nextNode = node.#children[token] = new _Node();
        }
      }
      node = nextNode;
    }
    if (node.#index !== void 0) {
      throw PATH_ERROR;
    }
    node.#index = isStatic ? -1 : index;
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      const childStr = c.buildRegExpStr();
      return childStr === "" ? "" : (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + childStr;
    }).filter(Boolean);
    if (typeof this.#index === "number" && this.#index !== -1) {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node();
  #index = 0;
  // dynamic path -> [handler index, param assoc]; static paths are not registered
  paths = createNullObject();
  insert(path2, isStatic) {
    if (isStatic) {
      this.#root.insert(path2.split(""), 0, [], this.#context, true);
      return;
    }
    const paramAssoc = [];
    const groups = [];
    let markedPath = path2;
    for (let i = 0; ; ) {
      let replaced = false;
      markedPath = markedPath.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = markedPath.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, this.#index, paramAssoc, this.#context, false);
    this.paths[path2] = [this.#index++, paramAssoc];
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var wildcardRegExpCache = createNullObject();
function buildWildcardRegExp(path2) {
  return wildcardRegExpCache[path2] ??= new RegExp(
    `^${path2.replace(
      /\/:[^/{}]+(?:\{\[\^\/]\+})?(?=[/{]|$)|\/?\*$|([.\\+*[^\]$()?{}|])/g,
      (match2, metaChar) => metaChar ? `\\${metaChar}` : match2 === "/*" ? TAIL_WILDCARD_REG_EXP_STR : match2 === "*" ? ONLY_WILDCARD_REG_EXP_STR : `/:${LABEL_REG_EXP_STR}`
    )}$`
  );
}
function findMiddleware(middleware, path2) {
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path2)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  #tries;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: createNullObject() };
    this.#routes = { [METHOD_NAME_ALL]: createNullObject() };
    this.#tries = { [METHOD_NAME_ALL]: new Trie() };
  }
  #insertPath(method, path2) {
    try {
      this.#tries[method].insert(path2, !/\*|\/:/.test(path2));
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path2) : e;
    }
  }
  add(method, path2, handler2) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      this.#tries[method] = new Trie();
      for (const handlerMap of [middleware, routes]) {
        handlerMap[method] = createNullObject();
        for (const p in handlerMap[METHOD_NAME_ALL]) {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
          this.#insertPath(method, p);
        }
      }
    }
    if (path2 === "/*") {
      path2 = "*";
    }
    const methods = method === METHOD_NAME_ALL ? Object.keys(middleware) : [method];
    if (/\*$/.test(path2)) {
      const re = buildWildcardRegExp(path2);
      for (const m of methods) {
        if (!middleware[m][path2]) {
          this.#insertPath(m, path2);
          middleware[m][path2] = findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || [];
        }
      }
      for (const handlerMap of [middleware, routes]) {
        for (const m of methods) {
          for (const p in handlerMap[m]) {
            re.test(p) && handlerMap[m][p].push([handler2, path2]);
          }
        }
      }
      return;
    }
    const paths = checkOptionalParameter(path2) || [path2];
    for (const path22 of paths) {
      for (const m of methods) {
        if (!routes[m][path22]) {
          this.#insertPath(m, path22);
          routes[m][path22] = findMiddleware(middleware[m], path22) || findMiddleware(middleware[METHOD_NAME_ALL], path22) || [];
        }
        routes[m][path22].push([handler2, path22]);
      }
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = createNullObject();
    for (const method of Object.keys(this.#routes)) {
      matchers[method] = this.#buildMatcher(method);
    }
    this.#middleware = this.#routes = this.#tries = void 0;
    wildcardRegExpCache = createNullObject();
    return matchers;
  }
  #buildMatcher(method) {
    const middleware = this.#middleware[method];
    const routes = this.#routes[method];
    const trie = this.#tries[method];
    const staticMap = createNullObject();
    const handlerData = [];
    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
    for (const r of [middleware, routes]) {
      for (const path2 in r) {
        const handlers = r[path2];
        const pathData = trie.paths[path2];
        if (!pathData) {
          staticMap[path2] = [handlers.map(([h]) => [h, createNullObject()]), emptyParam];
          continue;
        }
        handlerData[pathData[0]] = handlers.map(([h, handlerPath]) => [
          h,
          trie.paths[handlerPath][1].reduceRight((map, [key], i) => {
            map[key] = paramReplacementMap[pathData[1][i][1]];
            return map;
          }, createNullObject())
        ]);
      }
    }
    return [regexp, indexReplacementMap.map((i) => handlerData[i]), staticMap];
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path2, handler2) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path2, handler2]);
  }
  match(method, path2) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path2);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = createNullObject();
var order = 0;
var Node2 = class _Node2 {
  #methods = [];
  #children = createNullObject();
  #patterns = [];
  #pattern;
  #params = emptyParams;
  insert(method, path2, handler2) {
    let curNode = this;
    const parts = splitRoutingPath(path2);
    const possibleKeys = /* @__PURE__ */ new Set();
    let i = 0;
    for (const p of parts) {
      const nextP = parts[++i];
      const pattern = getPattern(p, nextP) || (nextP === void 0 && p && p.indexOf("*") === p.length - 1 ? p : null);
      const isParam = Array.isArray(pattern);
      const key = isParam ? pattern[0] : pattern || p;
      const child = curNode.#children[key] ||= new _Node2();
      if (pattern && !child.#pattern) {
        child.#pattern = pattern;
        curNode.#patterns.push(child);
      }
      curNode = child;
      if (isParam) {
        possibleKeys.add(pattern[1]);
      }
    }
    curNode.#methods.push({
      [method]: {
        handler: handler2,
        possibleKeys: [...possibleKeys],
        score: ++order
      }
    });
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      if (handlerSet) {
        handlerSet.params = createNullObject();
        handlerSets.push(handlerSet);
        for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
          const key = handlerSet.possibleKeys[i2];
          handlerSet.params[key] = params?.[key] && !i2 ? params[key] : nodeParams[key] ?? params?.[key];
        }
      }
    }
  }
  search(method, path2) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path2);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (const child of node.#patterns) {
          const pattern = child.#pattern;
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (typeof pattern === "string") {
            if (pattern === "*" || part.startsWith(pattern.slice(0, -1))) {
              this.#pushHandlerSets(handlerSets, child, method, node.#params);
              if (pattern === "*") {
                child.#params = params;
                tempNodes.push(child);
              }
            }
            continue;
          }
          const [, name, matcher] = pattern;
          if (!part && matcher === true) {
            continue;
          }
          if (matcher !== true) {
            if (!partOffsets) {
              partOffsets = [];
              let offset = path2[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path2.slice(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (m[0].length === restPathString.length && child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  node.#params,
                  params
                );
              }
              for (const _ in child.#children) {
                child.#params = params;
                const componentCount = m[0].match(/\//g)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
                break;
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets[1]) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler: handler2, params }) => [handler2, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node = new Node2();
  add(method, path2, handler2) {
    for (const result of checkOptionalParameter(path2) || [path2]) {
      this.#node.insert(method, result, handler2);
    }
  }
  match(method, path2) {
    return this.#node.search(method, path2);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// packages/integration-search/dist/index.js
function databaseSearchProvider(config) {
  return {
    async search(query, options = {}) {
      const page = options.page || 1;
      const perPage = options.perPage || 20;
      const products = await config.database.products.search(query);
      const total = products.length;
      const start = (page - 1) * perPage;
      const items = products.slice(start, start + perPage);
      return { items, total, page, perPage };
    },
    async index() {
      console.log("Database search: products indexed by database adapter");
    },
    async add() {
    },
    async remove() {
    },
    async update() {
    }
  };
}
function meilisearchProvider(config) {
  const indexName = config.indexName || "products";
  async function fetchMeilisearch(path2, options = {}) {
    const response = await fetch(`${config.host}${path2}`, {
      ...options,
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers
      }
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Meilisearch error: ${error}`);
    }
    return response.json();
  }
  return {
    async search(query, options = {}) {
      const page = options.page || 1;
      const perPage = options.perPage || 20;
      const filters = [];
      if (options.filters) {
        for (const [key, value] of Object.entries(options.filters)) {
          if (Array.isArray(value)) {
            filters.push(`${key} IN [${value.map((v) => `"${v}"`).join(",")}]`);
          } else {
            filters.push(`${key} = "${value}"`);
          }
        }
      }
      const result = await fetchMeilisearch(`/indexes/${indexName}/search`, {
        method: "POST",
        body: JSON.stringify({
          q: query,
          offset: (page - 1) * perPage,
          limit: perPage,
          filter: filters.length > 0 ? filters.join(" AND ") : void 0,
          sort: options.sort ? [options.sort] : void 0
        })
      });
      return {
        items: result.hits,
        total: result.totalHits || result.estimatedTotalHits || 0,
        page,
        perPage
      };
    },
    async index(products) {
      await fetchMeilisearch(`/indexes/${indexName}/settings`, {
        method: "PATCH",
        body: JSON.stringify({
          searchableAttributes: ["name", "description", "slug", "tags"],
          filterableAttributes: ["status", "price", "category", "tags"],
          sortableAttributes: ["price", "createdAt", "name"],
          rankingRules: [
            "words",
            "typo",
            "proximity",
            "attribute",
            "sort",
            "exactness"
          ]
        })
      });
      await fetchMeilisearch(`/indexes/${indexName}/documents`, {
        method: "POST",
        body: JSON.stringify(products.map((p) => ({
          ...p,
          // Flatten for search
          _searchable: `${p.name} ${p.description || ""} ${p.slug}`
        })))
      });
    },
    async add(product) {
      await fetchMeilisearch(`/indexes/${indexName}/documents`, {
        method: "POST",
        body: JSON.stringify([{
          ...product
        }])
      });
    },
    async remove(productId) {
      await fetchMeilisearch(`/indexes/${indexName}/documents/${productId}`, {
        method: "DELETE"
      });
    },
    async update(product) {
      await fetchMeilisearch(`/indexes/${indexName}/documents`, {
        method: "POST",
        body: JSON.stringify([product])
      });
    }
  };
}
function createSearchService(provider) {
  return {
    provider,
    async search(query, options) {
      if (!query || query.trim() === "") {
        return { items: [], total: 0, page: 1, perPage: options?.perPage || 20 };
      }
      return provider.search(query, options);
    },
    async index(products) {
      await provider.index(products);
    },
    async sync(product, action) {
      switch (action) {
        case "create":
          await provider.add(product);
          break;
        case "update":
          await provider.update(product);
          break;
        case "delete":
          await provider.remove(product.id);
          break;
      }
    }
  };
}
function createSearchProvider(config) {
  switch (config.provider) {
    case "database":
      return databaseSearchProvider(config);
    case "meilisearch":
      return meilisearchProvider(config);
    default:
      throw new Error(`Unknown search provider: ${config.provider}`);
  }
}

// node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json2 = JSON.stringify(obj, null, 2);
  return json2.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path: path2, errorMaps, issueData } = params;
  const fullPath = [...path2, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path2, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path2;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = /* @__PURE__ */ Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg) => ZodString.create({ ...arg, coerce: true })),
  number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
  boolean: ((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })),
  bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
  date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
};
var NEVER = INVALID;

// packages/core/dist/index.js
var ExternalImageConfig = external_exports.object({
  provider: external_exports.literal("external")
});
var SharpImageConfig = external_exports.object({
  provider: external_exports.literal("sharp"),
  storage: external_exports.union([
    external_exports.object({ type: external_exports.literal("filesystem"), path: external_exports.string() }),
    external_exports.object({
      type: external_exports.literal("s3"),
      bucket: external_exports.string(),
      region: external_exports.string(),
      accessKeyId: external_exports.string().optional(),
      secretAccessKey: external_exports.string().optional()
    }),
    external_exports.object({
      type: external_exports.literal("vercel-blob"),
      token: external_exports.string().optional()
    })
  ]),
  sizes: external_exports.array(external_exports.object({
    name: external_exports.string(),
    width: external_exports.number(),
    height: external_exports.number().optional(),
    fit: external_exports.enum(["cover", "contain", "inside", "outside"]).optional()
  })).optional()
});
var CloudinaryImageConfig = external_exports.object({
  provider: external_exports.literal("cloudinary"),
  cloudName: external_exports.string(),
  apiKey: external_exports.string().optional(),
  apiSecret: external_exports.string().optional()
});
var R2ImageConfig = external_exports.object({
  provider: external_exports.literal("r2"),
  accountId: external_exports.string(),
  bucket: external_exports.string(),
  accessKeyId: external_exports.string(),
  secretAccessKey: external_exports.string(),
  publicUrl: external_exports.string().optional()
});
var ImageConfig = external_exports.union([
  ExternalImageConfig,
  SharpImageConfig,
  CloudinaryImageConfig,
  R2ImageConfig
]);
var DatabaseConfig = external_exports.object({
  type: external_exports.string()
  // Adapter-specific config extends this
});
var StripeConfig = external_exports.object({
  provider: external_exports.literal("stripe"),
  publishableKey: external_exports.string(),
  secretKey: external_exports.string(),
  webhookSecret: external_exports.string().optional()
});
var PaymentConfig = external_exports.union([StripeConfig, external_exports.object({ provider: external_exports.literal("manual") })]);
var ThemeConfig = external_exports.object({
  name: external_exports.string(),
  css: external_exports.string().optional(),
  layout: external_exports.enum(["default", "minimal", "split"]).optional()
});
var ServerConfig = external_exports.object({
  port: external_exports.number().default(3e3),
  host: external_exports.string().default("localhost"),
  dev: external_exports.boolean().default(true),
  session: external_exports.object({
    secret: external_exports.string(),
    ttl: external_exports.number().default(86400)
    // 24 hours
  }).optional()
});
var StoreFeaturesSchema = external_exports.object({
  /** Enable product variants/options/SKU support */
  variants: external_exports.boolean().default(true),
  /** Enable product collections/categories */
  collections: external_exports.boolean().default(false),
  /** Enable inventory tracking */
  inventoryTracking: external_exports.boolean().default(true),
  /** Enable subscription billing (future) */
  subscriptions: external_exports.boolean().default(false),
  /** Enable multi-currency support (future) */
  multiCurrency: external_exports.boolean().default(false)
});
var StoreFeatures = StoreFeaturesSchema.parse;
var TillKitConfigSchema = external_exports.object({
  database: external_exports.record(external_exports.unknown()),
  // Typed at adapter level
  images: ImageConfig.optional(),
  payment: PaymentConfig.optional(),
  server: ServerConfig.optional(),
  theme: ThemeConfig.optional(),
  currency: external_exports.object({
    default: external_exports.string().default("USD"),
    supported: external_exports.array(external_exports.string()).optional()
  }).optional(),
  features: StoreFeaturesSchema.optional()
});
function formatPrice(cents, currency = "USD", locale = "en-US") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency
  }).format(cents / 100);
}
var DUPLICATE_GATEWAY_REF = "DUPLICATE_GATEWAY_REF";
var DuplicateGatewayRefError = class extends Error {
  code = DUPLICATE_GATEWAY_REF;
  constructor(gateway, gatewayRef) {
    super(`An order already exists for ${gateway} reference ${gatewayRef}`);
    this.name = "DuplicateGatewayRefError";
  }
};
function isDuplicateGatewayRefError(err) {
  return typeof err === "object" && err !== null && err.code === DUPLICATE_GATEWAY_REF;
}

// packages/server/dist/index.js
function createSubscriptionRoutes(config) {
  const { subscriptionProvider: subs } = config;
  const app2 = new Hono2();
  app2.post("/", async (c) => {
    const body = await c.req.json();
    try {
      const result = await subs.createSubscription({
        customerId: body.customerId,
        planId: body.planId,
        trialDays: body.trialDays,
        paymentMethodId: body.paymentMethodId,
        metadata: body.metadata
      });
      return c.json(result);
    } catch (err) {
      console.error("Subscription create error:", err);
      return c.json({ error: err.message }, 400);
    }
  });
  app2.get("/:id", async (c) => {
    const id = c.req.param("id");
    try {
      const sub = await subs.getSubscription(id);
      return c.json(sub);
    } catch (err) {
      return c.json({ error: err.message }, 404);
    }
  });
  app2.post("/:id/cancel", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    try {
      const result = await subs.cancelSubscription(id, body.immediately);
      return c.json(result);
    } catch (err) {
      return c.json({ error: err.message }, 400);
    }
  });
  app2.post("/:id/update", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    if (!body.planId) return c.json({ error: "planId required" }, 400);
    try {
      const result = await subs.updateSubscription(id, body.planId);
      return c.json(result);
    } catch (err) {
      return c.json({ error: err.message }, 400);
    }
  });
  app2.post("/webhook", async (c) => {
    const payload = await c.req.text();
    const signature = c.req.header("stripe-signature") || "";
    try {
      const event = subs.handleWebhook(payload, signature);
      const result = await subs.processWebhookEvent(event);
      console.log("Subscription webhook:", result.type, result.subscriptionId);
      return c.json({ received: true, type: result.type, subscriptionId: result.subscriptionId });
    } catch (err) {
      console.error("Subscription webhook error:", err.message);
      return c.json({ error: "Invalid webhook" }, 400);
    }
  });
  return app2;
}
function badgeClass(status) {
  const classes = {
    pending: "badge-pending",
    paid: "badge-paid",
    fulfilled: "badge-fulfilled",
    cancelled: "badge-cancelled",
    active: "badge-active",
    draft: "badge-draft",
    archived: "badge-archived"
  };
  return classes[status] || "badge-draft";
}
function adminLayout(title, content, navActive) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} \u2014 TillKit Admin</title>
  <link rel="stylesheet" href="/admin/styles.css">
  <script src="https://unpkg.com/htmx.org@1.9.12"></script>
</head>
<body>
  <div class="admin-layout">
    <nav class="admin-sidebar">
      <div class="admin-brand">TillKit Admin</div>
      <a href="/admin" class="${navActive === "dashboard" ? "active" : ""}">\u{1F4CA} Dashboard</a>
      <a href="/admin/orders" class="${navActive === "orders" ? "active" : ""}">\u{1F4E6} Orders</a>
      <a href="/admin/products" class="${navActive === "products" ? "active" : ""}">\u{1F3F7}\uFE0F Products</a>
    </nav>
    <main class="admin-main">
      ${content}
    </main>
  </div>
</body>
</html>`;
}
function formatCurrency(cents) {
  return "$" + (cents / 100).toFixed(2);
}
function createAdminRoutes(config) {
  const { database: db, features = { variants: true, collections: false, inventoryTracking: true, subscriptions: false, multiCurrency: false }, searchService } = config;
  const app2 = new Hono2();
  app2.get("/", async (c) => {
    const [ordersResult, productsResult] = await Promise.all([db.orders.list({ limit: 100 }), db.products.list({ limit: 1 })]);
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const todaysOrders = ordersResult.items.filter((o) => new Date(o.createdAt) >= today);
    const revenue = todaysOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const content = `
      <div class="admin-header"><h1>Dashboard</h1></div>
      <div class="admin-stats">
        <div class="admin-stat-card"><div class="stat-label">Today's Revenue</div><div class="stat-value">${formatCurrency(revenue)}</div></div>
        <div class="admin-stat-card"><div class="stat-label">Today's Orders</div><div class="stat-value">${todaysOrders.length}</div></div>
        <div class="admin-stat-card"><div class="stat-label">Total Products</div><div class="stat-value">${productsResult.total}</div></div>
      </div>
      <div class="admin-card">
        <h3>Recent Orders</h3>
        <table>
          <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th><th>Date</th></tr></thead>
          <tbody>
            ${ordersResult.items.slice(0, 5).map((o) => `<tr>
              <td><a href="/admin/orders/${o.id}">${o.orderNumber || o.id}</a></td>
              <td>${o.email || "Guest"}</td>
              <td><span class="badge ${badgeClass(o.status)}">${o.status}</span></td>
              <td>${formatCurrency(o.total || 0)}</td>
              <td>${new Date(o.createdAt).toLocaleDateString()}</td>
            </tr>`).join("")}
            ${ordersResult.items.length === 0 ? '<tr><td colspan="5" class="empty">No orders yet</td></tr>' : ""}
          </tbody>
        </table>
      </div>`;
    return c.html(adminLayout("Dashboard", content, "dashboard"));
  });
  app2.get("/orders", async (c) => {
    const status = c.req.query("status");
    const result = await db.orders.list({ limit: 50, filters: status ? { status } : void 0 });
    const content = `
      <div class="admin-header"><h1>Orders</h1></div>
      <div class="admin-card">
        <div class="admin-filters">
          <form method="get"><select name="status" onchange="this.form.submit()">
            <option value="">All Statuses</option>
            <option value="pending" ${status === "pending" ? "selected" : ""}>Pending</option>
            <option value="paid" ${status === "paid" ? "selected" : ""}>Paid</option>
            <option value="fulfilled" ${status === "fulfilled" ? "selected" : ""}>Fulfilled</option>
            <option value="cancelled" ${status === "cancelled" ? "selected" : ""}>Cancelled</option>
          </select></form>
        </div>
        <table>
          <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            ${result.items.map((o) => `<tr>
              <td>${o.orderNumber || o.id}</td>
              <td>${o.email || "Guest"}</td>
              <td><span class="badge ${badgeClass(o.status)}">${o.status}</span></td>
              <td>${formatCurrency(o.total || 0)}</td>
              <td>${new Date(o.createdAt).toLocaleDateString()}</td>
              <td><a class="btn btn-sm" href="/admin/orders/${o.id}">View</a></td>
            </tr>`).join("")}
            ${result.items.length === 0 ? '<tr><td colspan="6" class="empty">No orders found</td></tr>' : ""}
          </tbody>
        </table>
      </div>`;
    return c.html(adminLayout("Orders", content, "orders"));
  });
  app2.get("/orders/:id", async (c) => {
    const id = c.req.param("id");
    const order2 = await db.orders.get(id);
    if (!order2) return c.notFound();
    const content = `
      <div class="admin-header">
        <h1>Order ${order2.orderNumber || order2.id}</h1>
        <a class="btn" href="/admin/orders">\u2190 Back</a>
      </div>
      <div class="admin-card">
        <p><strong>Customer:</strong> ${order2.email || "Guest"}</p>
        <p><strong>Status:</strong> <span class="badge ${badgeClass(order2.status)}">${order2.status}</span></p>
        <p><strong>Total:</strong> ${formatCurrency(order2.total || 0)}</p>
        <p><strong>Subtotal:</strong> ${formatCurrency(order2.subtotal || 0)}</p>
        <p><strong>Currency:</strong> ${order2.currency}</p>
        <p><strong>Date:</strong> ${new Date(order2.createdAt).toLocaleString()}</p>
      </div>
      <div class="admin-card">
        <h3>Update Status</h3>
        <form method="post" action="/admin/orders/${order2.id}/status">
          <div class="form-group">
            <label>Status</label>
            <select name="status">
              <option value="pending" ${order2.status === "pending" ? "selected" : ""}>Pending</option>
              <option value="paid" ${order2.status === "paid" ? "selected" : ""}>Paid</option>
              <option value="fulfilled" ${order2.status === "fulfilled" ? "selected" : ""}>Fulfilled</option>
              <option value="cancelled" ${order2.status === "cancelled" ? "selected" : ""}>Cancelled</option>
            </select>
          </div>
          <button type="submit" class="btn">Update Status</button>
        </form>
      </div>`;
    return c.html(adminLayout("Order Details", content, "orders"));
  });
  app2.post("/orders/:id/status", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.parseBody();
    const newStatus = body.status;
    if (!newStatus) return c.json({ error: "Status required" }, 400);
    try {
      await db.orders.updateStatus(id, newStatus);
    } catch {
      return c.json({ error: "Order not found" }, 404);
    }
    return c.redirect("/admin/orders");
  });
  app2.get("/products", async (c) => {
    const page = parseInt(c.req.query("page") || "1");
    const q = c.req.query("q");
    let result;
    if (q && q.trim()) {
      if (searchService) {
        try {
          const sr = await searchService.search(q, { page, perPage: 20 });
          result = sr;
        } catch {
          result = await db.products.list({ limit: 20, offset: (page - 1) * 20 });
        }
      } else {
        const products = await db.products.search(q);
        result = { items: products, total: products.length, page, perPage: 20 };
      }
    } else {
      result = await db.products.list({ limit: 20, offset: (page - 1) * 20 });
    }
    const content = `
      <div class="admin-header">
        <h1>Products</h1>
        <a class="btn" href="/admin/products/new">Create Product</a>
      </div>
      <div class="admin-card">
        <form method="get" action="/admin/products" class="admin-search">
          <input type="search" name="q" value="${q || ""}" placeholder="Search products..." />
          <button type="submit" class="btn btn-sm">Search</button>
          ${q ? '<a href="/admin/products" class="btn btn-sm">Clear</a>' : ""}
        </form>
        <table>
          <thead><tr><th>Name</th><th>Slug</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${result.items.map((p) => `<tr>
              <td><strong>${p.name}</strong></td>
              <td>${p.slug}</td>
              <td>${formatCurrency(p.price || 0)}</td>
              <td><span class="badge ${badgeClass(p.status)}">${p.status}</span></td>
              <td class="actions">
                <a class="btn btn-sm" href="/admin/products/${p.id}/edit">Edit</a>
                <button class="btn btn-sm btn-danger" hx-delete="/admin/products/${p.id}" hx-confirm="Delete ${p.name}?" hx-target="closest tr" hx-swap="outerHTML">Delete</button>
              </td>
            </tr>`).join("")}
            ${result.items.length === 0 ? '<tr><td colspan="5" class="empty">No products yet</td></tr>' : ""}
          </tbody>
        </table>
      </div>`;
    return c.html(adminLayout("Products", content, "products"));
  });
  app2.get("/products/new", async (c) => {
    const showVariants = features.variants;
    const showInventory = features.inventoryTracking;
    const content = `
      <div class="admin-header">
        <h1>Create Product</h1>
        <a class="btn" href="/admin/products">\u2190 Back</a>
      </div>
      <form method="post" action="/admin/products" class="admin-card admin-form">
        <div class="form-row">
          <div class="form-group"><label>Name</label><input type="text" name="name" placeholder="Product name" required /></div>
          <div class="form-group"><label>Slug</label><input type="text" name="slug" placeholder="product-slug" required /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Price (cents)</label><input type="number" name="price" placeholder="1999" required /></div>
          <div class="form-group"><label>Status</label><select name="status"><option value="draft">Draft</option><option value="active" selected>Active</option><option value="archived">Archived</option></select></div>
        </div>
        <div class="form-group"><label>Description</label><textarea name="description" placeholder="Product description..."></textarea></div>
        ${showInventory ? `<div class="form-row"><div class="form-group"><label>Stock Quantity</label><input type="number" name="stock" placeholder="100" /></div><div class="form-group"><label>Track Inventory</label><select name="trackInventory"><option value="true" selected>Yes</option><option value="false">No</option></select></div></div>` : ""}
        ${showVariants ? `<div class="admin-card"><h3>Variants</h3><p class="help-text">Variants are enabled. Define them after creation.</p></div>` : ""}
        <button type="submit" class="btn">Create Product</button>
      </form>`;
    return c.html(adminLayout("Create Product", content, "products"));
  });
  app2.post("/products", async (c) => {
    const body = await c.req.parseBody();
    const data = { name: body.name, slug: body.slug, price: parseInt(body.price) || 0, status: body.status || "draft", description: body.description };
    if (features.inventoryTracking && body.stock) {
      data.inventory = { available: parseInt(body.stock) || 0, quantity: parseInt(body.stock) || 0, allowOutOfStock: false };
    }
    try {
      const product = await db.products.create(data);
      if (searchService) {
        try {
          await searchService.sync(product, "create");
        } catch (e) {
          console.error("Search sync failed:", e);
        }
      }
      return c.redirect("/admin/products");
    } catch {
      return c.json({ error: "Failed to create" }, 500);
    }
  });
  app2.get("/products/:id/edit", async (c) => {
    const id = c.req.param("id");
    const product = await db.products.get(id);
    if (!product) return c.notFound();
    const showVariants = features.variants;
    const showInventory = features.inventoryTracking;
    const content = `
      <div class="admin-header">
        <h1>Edit Product</h1>
        <a class="btn" href="/admin/products">\u2190 Back</a>
      </div>
      <form method="post" action="/admin/products/${product.id}" class="admin-card admin-form">
        <div class="form-row">
          <div class="form-group"><label>Name</label><input type="text" name="name" value="${product.name || ""}" required /></div>
          <div class="form-group"><label>Slug</label><input type="text" name="slug" value="${product.slug || ""}" required /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Price (cents)</label><input type="number" name="price" value="${product.price || 0}" required /></div>
          <div class="form-group"><label>Status</label><select name="status"><option value="draft" ${product.status === "draft" ? "selected" : ""}>Draft</option><option value="active" ${product.status === "active" ? "selected" : ""}>Active</option><option value="archived" ${product.status === "archived" ? "selected" : ""}>Archived</option></select></div>
        </div>
        <div class="form-group"><label>Description</label><textarea name="description">${product.description || ""}</textarea></div>
        ${showInventory ? `<div class="form-group"><label>Stock Quantity</label><input type="number" name="stock" value="${product.inventory?.available || 0}" /></div>` : ""}
        ${showVariants && product.variants?.length ? `<div class="admin-card"><h3>Variants (${product.variants.length})</h3><table><thead><tr><th>SKU</th><th>Options</th><th>Price</th><th>Stock</th></tr></thead><tbody>${product.variants.map((v) => `<tr><td>${v.sku || "-"}</td><td>${JSON.stringify(v.options)}</td><td>${formatCurrency(v.price || product.price || 0)}</td><td>${v.inventory?.available ?? "-"}</td></tr>`).join("")}</tbody></table></div>` : ""}
        <button type="submit" class="btn">Update Product</button>
      </form>`;
    return c.html(adminLayout("Edit Product", content, "products"));
  });
  app2.post("/products/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.parseBody();
    const data = { name: body.name, slug: body.slug, price: parseInt(body.price) || 0, status: body.status || "draft", description: body.description };
    if (features.inventoryTracking && body.stock !== void 0) {
      data.inventory = { available: parseInt(body.stock) || 0, quantity: parseInt(body.stock) || 0, allowOutOfStock: false };
    }
    try {
      const product = await db.products.update(id, data);
      if (searchService) {
        try {
          await searchService.sync(product, "update");
        } catch (e) {
          console.error("Search sync failed:", e);
        }
      }
      return c.redirect("/admin/products");
    } catch {
      return c.json({ error: "Failed to update" }, 500);
    }
  });
  app2.delete("/products/:id", async (c) => {
    const id = c.req.param("id");
    try {
      await db.products.delete(id);
      if (searchService) {
        try {
          await searchService.sync({ id }, "delete");
        } catch (e) {
          console.error("Search sync failed:", e);
        }
      }
      c.header("HX-Redirect", "/admin/products");
      return c.body("");
    } catch {
      return c.json({ error: "Failed to delete" }, 500);
    }
  });
  return app2;
}
async function decrementInventoryForOrder(db, order2, webhookConfig) {
  if (!order2.items || order2.items.length === 0) return;
  for (const item of order2.items) {
    const product = await db.products.get(item.productId);
    if (!product || !product.inventory) continue;
    const oldAvailable = product.inventory.available ?? product.inventory.quantity ?? 0;
    const newAvailable = Math.max(0, oldAvailable - item.quantity);
    await db.products.update(product.id, {
      inventory: {
        ...product.inventory,
        available: newAvailable,
        quantity: product.inventory.quantity ?? oldAvailable
      }
    });
    if (webhookConfig) {
      try {
        await sendInventoryWebhook(webhookConfig, {
          productId: product.id,
          variantId: item.variantId,
          sku: item.sku || product.slug,
          oldAvailable,
          newAvailable,
          delta: -item.quantity,
          reason: "order_paid",
          orderId: order2.id,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      } catch (e) {
        console.error("Inventory webhook failed:", e);
      }
    }
  }
}
async function sendInventoryWebhook(config, event) {
  const headers = {
    "Content-Type": "application/json",
    ...config.headers
  };
  if (config.secret) {
    headers["X-Inventory-Webhook-Secret"] = config.secret;
  }
  const response = await fetch(config.url, {
    method: "POST",
    headers,
    body: JSON.stringify(event)
  });
  if (!response.ok) {
    throw new Error(`Inventory webhook returned ${response.status}: ${await response.text()}`);
  }
}
function createWebhookRoutes(config) {
  const router = new Hono2();
  router.post("/stripe", async (c) => {
    const payload = await c.req.text();
    const signature = c.req.header("stripe-signature") || "";
    let event;
    try {
      event = config.stripe.handleWebhook(payload, signature);
    } catch (err) {
      console.error("Stripe webhook rejected:", err.message);
      return c.json({ error: "Invalid signature" }, 400);
    }
    const { claimed } = await config.database.webhookEvents.claim({
      gateway: "stripe",
      eventId: event.id,
      eventType: event.type
    });
    if (!claimed) {
      return c.json({ received: true, deduplicated: true });
    }
    try {
      const result = await config.stripe.processWebhookEvent(event);
      let orderId;
      let outcome = "processed";
      switch (result.type) {
        case "payment_success": {
          const data = result.data;
          console.log("Payment success:", {
            sessionId: data.sessionId,
            amount: data.amount,
            currency: data.currency
          });
          if (config.onPaymentSuccess) {
            await config.onPaymentSuccess(data);
          } else {
            orderId = await createOrderFromStripeSession({
              database: config.database,
              stripe: config.stripe,
              sessionId: data.sessionId,
              cartId: data.metadata?.cartId,
              getSessionIdFn: () => data.metadata?.cartId ?? "",
              inventoryWebhook: config.inventoryWebhook
            }) ?? void 0;
          }
          break;
        }
        case "payment_failure": {
          const data = result.data;
          console.error("Payment failed:", data);
          if (config.onPaymentFailure) {
            await config.onPaymentFailure({
              sessionId: data.id,
              error: data.last_payment_error
            });
          }
          break;
        }
        case "refund": {
          const data = result.data;
          console.log("Refund processed:", data);
          if (config.onRefund) {
            await config.onRefund(data);
          }
          break;
        }
        default: {
          console.log("Unhandled webhook event:", event.type);
          outcome = "ignored";
        }
      }
      await config.database.webhookEvents.complete("stripe", event.id, { outcome, orderId });
      return c.json({ received: true });
    } catch (err) {
      await config.database.webhookEvents.release("stripe", event.id);
      console.error("Stripe webhook processing failed:", err.message);
      return c.json({ error: "Webhook processing failed" }, 500);
    }
  });
  return router;
}
async function createOrderFromStripeSession({
  database: database2,
  stripe: stripe2,
  sessionId,
  cartId,
  getSessionIdFn,
  inventoryWebhook
}) {
  try {
    const session = await stripe2.getSession(sessionId);
    if (session.payment_status !== "paid") {
      console.log("Session not paid yet:", session.id);
      return null;
    }
    const alreadyCreated = await database2.orders.getByGatewayRef("stripe", session.id);
    if (alreadyCreated) return alreadyCreated.id;
    const actualCartId = cartId || getSessionIdFn();
    const cart = await database2.cart.get(actualCartId);
    if (!cart || cart.items.length === 0) {
      console.log("No cart found for session:", sessionId);
      return null;
    }
    const email2 = session.customer_email || session.customer_details?.email || null;
    if (!email2) {
      console.error(
        `Stripe session ${session.id} is paid but carries no customer email. Creating the order with a placeholder address \u2014 this order cannot be emailed.`
      );
    }
    let order2;
    try {
      order2 = await database2.orders.create({
        email: email2 || "unknown@example.com",
        gateway: "stripe",
        gatewayRef: session.id,
        status: "paid",
        paymentStatus: "paid",
        items: cart.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          name: item.name,
          sku: item.sku,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity,
          image: item.image
        })),
        subtotal: cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        total: session.amount_total || 0,
        currency: (session.currency || "USD").toUpperCase(),
        shippingAddress: session.shipping_details ? {
          firstName: session.shipping_details.name?.split(" ")[0] || "",
          lastName: session.shipping_details.name?.split(" ").slice(1).join(" ") || "",
          address1: session.shipping_details.address?.line1 || "",
          address2: session.shipping_details.address?.line2,
          city: session.shipping_details.address?.city || "",
          province: session.shipping_details.address?.state,
          postalCode: session.shipping_details.address?.postal_code || "",
          country: session.shipping_details.address?.country || ""
        } : void 0
      });
    } catch (err) {
      if (isDuplicateGatewayRefError(err)) {
        const winner = await database2.orders.getByGatewayRef("stripe", session.id);
        if (winner) return winner.id;
      }
      throw err;
    }
    await database2.orders.addTransaction(order2.id, {
      kind: "sale",
      status: "success",
      amount: session.amount_total || 0,
      currency: (session.currency || "USD").toUpperCase(),
      gateway: "stripe",
      metadata: {
        sessionId: session.id,
        paymentIntentId: session.payment_intent || "",
        customerId: session.customer
      }
    });
    await database2.cart.clear(actualCartId);
    await decrementInventoryForOrder(database2, order2, inventoryWebhook);
    console.log("Order created:", order2.orderNumber);
    return order2.id;
  } catch (err) {
    console.error("Failed to create order from session:", err);
    return null;
  }
}
function effectivePrice(product, variant) {
  return variant?.price ?? product.price;
}
function effectiveInventory(product, variant) {
  return variant?.inventory ?? product.inventory;
}
async function revalidateCart(db, cart) {
  const priceChanges = [];
  const stockIssues = [];
  const removedItems = [];
  for (const item of cart.items) {
    const product = await db.products.get(item.productId);
    if (!product || product.status !== "active") {
      removedItems.push({ itemId: item.id, name: item.name });
      continue;
    }
    let variant;
    if (item.variantId) {
      variant = product.variants?.find((v) => v.id === item.variantId);
      if (!variant) {
        removedItems.push({ itemId: item.id, name: item.name });
        continue;
      }
    }
    const currentPrice = effectivePrice(product, variant);
    if (currentPrice !== item.price) {
      priceChanges.push({
        itemId: item.id,
        name: item.name,
        oldPrice: item.price,
        newPrice: currentPrice
      });
    }
    const inventory = effectiveInventory(product, variant);
    if (inventory && !inventory.allowOutOfStock) {
      const available = inventory.available ?? inventory.quantity ?? 0;
      if (available < item.quantity) {
        stockIssues.push({
          itemId: item.id,
          name: item.name,
          requested: item.quantity,
          available
        });
      }
    }
  }
  return {
    ok: priceChanges.length === 0 && stockIssues.length === 0 && removedItems.length === 0,
    priceChanges,
    stockIssues,
    removedItems
  };
}
var minimalTheme = {
  name: "minimal",
  description: "Clean, minimal design with neutral colors",
  colors: {
    primary: "#18181b",
    "primary-foreground": "#fafafa",
    secondary: "#f4f4f5",
    "secondary-foreground": "#18181b",
    accent: "#f4f4f5",
    "accent-foreground": "#18181b",
    background: "#ffffff",
    foreground: "#18181b",
    muted: "#f4f4f5",
    "muted-foreground": "#71717a",
    card: "#ffffff",
    "card-foreground": "#18181b",
    popover: "#ffffff",
    "popover-foreground": "#18181b",
    border: "#e4e4e7",
    input: "#e4e4e7",
    ring: "#18181b",
    destructive: "#ef4444",
    "destructive-foreground": "#fafafa",
    success: "#22c55e",
    "success-foreground": "#fafafa",
    warning: "#f59e0b",
    "warning-foreground": "#18181b",
    info: "#3b82f6",
    "info-foreground": "#fafafa"
  },
  dark: {
    background: "#09090b",
    foreground: "#fafafa",
    muted: "#27272a",
    "muted-foreground": "#a1a1aa",
    card: "#18181b",
    "card-foreground": "#fafafa",
    popover: "#18181b",
    "popover-foreground": "#fafafa",
    border: "#27272a",
    input: "#27272a",
    ring: "#d4d4d8",
    secondary: "#27272a",
    "secondary-foreground": "#fafafa",
    accent: "#27272a",
    "accent-foreground": "#fafafa",
    primary: "#fafafa",
    "primary-foreground": "#18181b"
  }
};
var modernTheme = {
  name: "modern",
  description: "Vibrant design with blue accents",
  colors: {
    primary: "#2563eb",
    "primary-foreground": "#ffffff",
    secondary: "#f1f5f9",
    "secondary-foreground": "#0f172a",
    accent: "#3b82f6",
    "accent-foreground": "#ffffff",
    background: "#ffffff",
    foreground: "#0f172a",
    muted: "#f1f5f9",
    "muted-foreground": "#64748b",
    card: "#ffffff",
    "card-foreground": "#0f172a",
    popover: "#ffffff",
    "popover-foreground": "#0f172a",
    border: "#e2e8f0",
    input: "#e2e8f0",
    ring: "#2563eb",
    destructive: "#ef4444",
    "destructive-foreground": "#ffffff",
    success: "#10b981",
    "success-foreground": "#ffffff",
    warning: "#f59e0b",
    "warning-foreground": "#0f172a",
    info: "#06b6d4",
    "info-foreground": "#ffffff"
  },
  dark: {
    background: "#020617",
    foreground: "#f8fafc",
    muted: "#1e293b",
    "muted-foreground": "#94a3b8",
    card: "#0f172a",
    "card-foreground": "#f8fafc",
    popover: "#0f172a",
    "popover-foreground": "#f8fafc",
    border: "#1e293b",
    input: "#1e293b",
    ring: "#60a5fa",
    secondary: "#1e293b",
    "secondary-foreground": "#f8fafc",
    accent: "#1d4ed8",
    "accent-foreground": "#ffffff",
    primary: "#60a5fa",
    "primary-foreground": "#020617"
  }
};
var boutiqueTheme = {
  name: "boutique",
  description: "Elegant design with warm tones",
  colors: {
    primary: "#7c2d12",
    "primary-foreground": "#fff7ed",
    secondary: "#fff7ed",
    "secondary-foreground": "#7c2d12",
    accent: "#c2410c",
    "accent-foreground": "#ffffff",
    background: "#fafaf9",
    foreground: "#292524",
    muted: "#f5f5f4",
    "muted-foreground": "#78716c",
    card: "#ffffff",
    "card-foreground": "#292524",
    popover: "#ffffff",
    "popover-foreground": "#292524",
    border: "#e7e5e4",
    input: "#e7e5e4",
    ring: "#7c2d12",
    destructive: "#dc2626",
    "destructive-foreground": "#fff7ed",
    success: "#16a34a",
    "success-foreground": "#fff7ed",
    warning: "#d97706",
    "warning-foreground": "#292524",
    info: "#0891b2",
    "info-foreground": "#fff7ed"
  },
  dark: {
    background: "#1c1917",
    foreground: "#fafaf9",
    muted: "#44403c",
    "muted-foreground": "#a8a29e",
    card: "#292524",
    "card-foreground": "#fafaf9",
    popover: "#292524",
    "popover-foreground": "#fafaf9",
    border: "#44403c",
    input: "#44403c",
    ring: "#c2410c",
    secondary: "#44403c",
    "secondary-foreground": "#fafaf9",
    accent: "#9a3412",
    "accent-foreground": "#ffffff",
    primary: "#c2410c",
    "primary-foreground": "#fff7ed"
  }
};
var themes = {
  minimal: minimalTheme,
  modern: modernTheme,
  boutique: boutiqueTheme
};
var ThemeManager = class {
  currentTheme = "minimal";
  currentMode = "auto";
  listeners = /* @__PURE__ */ new Set();
  get theme() {
    return this.currentTheme;
  }
  get mode() {
    return this.currentMode;
  }
  setTheme(name) {
    if (themes[name]) {
      this.currentTheme = name;
      this.notify();
    }
  }
  setMode(mode) {
    this.currentMode = mode;
    this.notify();
  }
  toggleDarkMode() {
    if (this.currentMode === "dark") {
      this.currentMode = "light";
    } else if (this.currentMode === "light") {
      this.currentMode = "dark";
    } else {
      this.currentMode = "dark";
    }
    this.notify();
  }
  getCurrentTheme() {
    return themes[this.currentTheme] || minimalTheme;
  }
  getEffectiveMode() {
    if (this.currentMode === "auto") {
      return "light";
    }
    return this.currentMode;
  }
  // Server-side: get data-theme attribute value
  getThemeAttribute() {
    if (this.currentMode === "dark") return "dark";
    if (this.currentMode === "light") return "light";
    return "auto";
  }
  // Subscribe to theme changes
  onChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  notify() {
    for (const listener of this.listeners) {
      listener(this.currentTheme, this.getThemeAttribute());
    }
  }
};
var themeManager = new ThemeManager();

// packages/adapters/pocketbase/dist/index.js
import PocketBase from "pocketbase";
function isPocketBaseStatus(err, status) {
  return typeof err === "object" && err !== null && err.status === status;
}
var PRODUCT_INDEXES = {
  slug: "CREATE UNIQUE INDEX `idx_products_slug` ON `products` (`slug`)"
};
var ORDER_INDEXES = {
  orderNumber: "CREATE UNIQUE INDEX `idx_orders_number` ON `orders` (`orderNumber`)",
  gatewayRef: "CREATE UNIQUE INDEX `idx_orders_gateway_ref` ON `orders` (`gateway`, `gatewayRef`) WHERE `gatewayRef` != ''"
};
var WEBHOOK_EVENT_INDEXES = {
  gatewayEventId: "CREATE UNIQUE INDEX `idx_webhook_events` ON `processed_webhook_events` (`gateway`, `eventId`)"
};
var MIN_POCKETBASE_VERSION = "0.23.0";
var UnsupportedPocketBaseVersionError = class extends Error {
  constructor(url) {
    super(
      `The PocketBase at ${url} is older than v${MIN_POCKETBASE_VERSION}, which TillKit requires. Upgrade to a current PocketBase release and re-run setup. Nothing was created.`
    );
    this.name = "UnsupportedPocketBaseVersionError";
  }
};
async function assertSupportedVersion(url) {
  const res = await fetch(`${url.replace(/\/$/, "")}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  if (res.status === 404) throw new UnsupportedPocketBaseVersionError(url);
}
var JSON_MAX_SIZE = 2e6;
var text = (name, required = false) => ({ name, type: "text", required });
var number = (name, required = false) => ({ name, type: "number", required });
var email = (name, required = false) => ({ name, type: "email", required });
var json = (name, required = false) => ({
  name,
  type: "json",
  required,
  maxSize: JSON_MAX_SIZE
});
var select = (name, values, required = false) => ({
  name,
  type: "select",
  required,
  maxSelect: 1,
  values
});
var autodate = (name, onUpdate) => ({
  name,
  type: "autodate",
  onCreate: true,
  onUpdate
});
var TIMESTAMPS = [autodate("created", false), autodate("updated", true)];
function pocketbaseAdapter(config) {
  const pb = new PocketBase(config.url);
  pb.autoCancellation(false);
  if (config.adminToken) {
    pb.authStore.save(config.adminToken, null);
  }
  async function writeCartItems(cartId, items) {
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const record = await pb.collection("carts").update(cartId, {
      items,
      subtotal,
      total: subtotal
    });
    return { ...record, items: record.items ?? [] };
  }
  return {
    // Products
    products: {
      async list(options) {
        const page = Math.floor((options?.offset || 0) / (options?.limit || 50)) + 1;
        const result = await pb.collection("products").getList(page, options?.limit || 50, {
          sort: options?.sort ? `${options.order === "desc" ? "-" : ""}${options.sort}` : "-created",
          filter: options?.filters ? buildFilter(options.filters) : void 0
        });
        return {
          items: result.items,
          total: result.totalItems,
          page: result.page,
          perPage: result.perPage,
          hasMore: result.page < result.totalPages
        };
      },
      async get(id) {
        try {
          const record = await pb.collection("products").getOne(id);
          return record;
        } catch {
          return null;
        }
      },
      async getBySlug(slug) {
        try {
          const records = await pb.collection("products").getFullList({
            filter: `slug="${escapeFilter(slug)}"`,
            limit: 1
          });
          return records[0];
        } catch {
          return null;
        }
      },
      async create(data) {
        const record = await pb.collection("products").create(data);
        return record;
      },
      async update(id, data) {
        const record = await pb.collection("products").update(id, data);
        return record;
      },
      async delete(id) {
        await pb.collection("products").delete(id);
      },
      async search(query) {
        const results = await pb.collection("products").getFullList({
          filter: `name~"${escapeFilter(query)}" || description~"${escapeFilter(query)}"`
        });
        return results;
      }
    },
    // Cart
    cart: {
      async get(sessionId) {
        try {
          const records = await pb.collection("carts").getFullList({
            filter: `sessionId="${escapeFilter(sessionId)}"`,
            limit: 1
          });
          const record = records[0];
          if (!record) return null;
          return { ...record, items: record.items ?? [] };
        } catch {
          return null;
        }
      },
      async create(sessionId) {
        const record = await pb.collection("carts").create({
          sessionId,
          items: [],
          subtotal: 0,
          totalTax: 0,
          totalShipping: 0,
          total: 0,
          currency: "USD"
        });
        return record;
      },
      async update(sessionId, updates) {
        const cart = await this.get(sessionId);
        if (!cart) throw new Error("Cart not found");
        const record = await pb.collection("carts").update(cart.id, updates);
        return record;
      },
      async addItem(sessionId, item) {
        const cart = await this.get(sessionId);
        if (!cart) throw new Error("Cart not found");
        const existing = cart.items.find(
          (i) => i.productId === item.productId && i.variantId === item.variantId
        );
        const items = existing ? cart.items.map(
          (i) => i === existing ? {
            ...i,
            quantity: i.quantity + item.quantity,
            lineTotal: i.price * (i.quantity + item.quantity)
          } : i
        ) : [
          ...cart.items,
          { ...item, id: crypto.randomUUID(), lineTotal: item.price * item.quantity }
        ];
        return writeCartItems(cart.id, items);
      },
      async updateItem(sessionId, itemId, quantity) {
        const cart = await this.get(sessionId);
        if (!cart) throw new Error("Cart not found");
        const items = quantity <= 0 ? cart.items.filter((i) => i.id !== itemId) : cart.items.map(
          (i) => i.id === itemId ? { ...i, quantity, lineTotal: i.price * quantity } : i
        );
        return writeCartItems(cart.id, items);
      },
      async removeItem(sessionId, itemId) {
        const cart = await this.get(sessionId);
        if (!cart) throw new Error("Cart not found");
        return writeCartItems(
          cart.id,
          cart.items.filter((i) => i.id !== itemId)
        );
      },
      async clear(sessionId) {
        const cart = await this.get(sessionId);
        if (!cart) return;
        await writeCartItems(cart.id, []);
      }
    },
    // Orders
    orders: {
      async list(options) {
        const page = Math.floor((options?.offset || 0) / (options?.limit || 50)) + 1;
        const result = await pb.collection("orders").getList(page, options?.limit || 50, {
          sort: options?.sort ? `${options.order === "desc" ? "-" : ""}${options.sort}` : "-created",
          expand: "items,transactions"
        });
        return {
          items: result.items,
          total: result.totalItems,
          page: result.page,
          perPage: result.perPage,
          hasMore: result.page < result.totalPages
        };
      },
      async get(id) {
        try {
          const record = await pb.collection("orders").getOne(id, {
            expand: "items,transactions"
          });
          return record;
        } catch {
          return null;
        }
      },
      async getByNumber(orderNumber) {
        try {
          const records = await pb.collection("orders").getFullList({
            filter: `orderNumber="${escapeFilter(orderNumber)}"`,
            expand: "items,transactions",
            limit: 1
          });
          return records[0];
        } catch {
          return null;
        }
      },
      async getByGatewayRef(gateway, ref) {
        const records = await pb.collection("orders").getFullList({
          filter: `gateway="${escapeFilter(gateway)}" && gatewayRef="${escapeFilter(ref)}"`,
          expand: "items,transactions",
          limit: 1
        });
        return records[0] ?? null;
      },
      async create(data) {
        const date = /* @__PURE__ */ new Date();
        const orderNumber = `TK-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        try {
          const record = await pb.collection("orders").create({
            ...data,
            orderNumber,
            status: data.status || "pending",
            paymentStatus: data.paymentStatus || "pending",
            fulfillmentStatus: data.fulfillmentStatus || "unfulfilled"
          });
          return record;
        } catch (err) {
          if (isPocketBaseStatus(err, 400) && data.gateway && data.gatewayRef) {
            const existing = await this.getByGatewayRef(data.gateway, data.gatewayRef);
            if (existing) throw new DuplicateGatewayRefError(data.gateway, data.gatewayRef);
          }
          throw err;
        }
      },
      async update(id, data) {
        const record = await pb.collection("orders").update(id, data);
        return record;
      },
      async addTransaction(orderId, transaction) {
        await pb.collection("transactions").create({
          ...transaction,
          order: orderId
        });
        return this.get(orderId);
      },
      async updateStatus(id, status) {
        const record = await pb.collection("orders").update(id, { status });
        return record;
      }
    },
    // Customers
    customers: {
      async get(id) {
        try {
          const record = await pb.collection("customers").getOne(id, {
            expand: "addresses"
          });
          return record;
        } catch {
          return null;
        }
      },
      async getByEmail(email2) {
        try {
          const records = await pb.collection("customers").getFullList({
            filter: `email="${escapeFilter(email2)}"`,
            expand: "addresses",
            limit: 1
          });
          return records[0];
        } catch {
          return null;
        }
      },
      async create(data) {
        const record = await pb.collection("customers").create(data);
        return record;
      },
      async update(id, data) {
        const record = await pb.collection("customers").update(id, data);
        return record;
      },
      async addAddress(customerId, address) {
        await pb.collection("addresses").create({
          ...address,
          customer: customerId
        });
        const customer = await this.get(customerId);
        if (!customer) throw new Error("Customer not found");
        return customer;
      }
    },
    // Exactly-once webhook ledger
    webhookEvents: {
      async claim(event) {
        try {
          await pb.collection("processed_webhook_events").create({
            gateway: event.gateway,
            eventId: event.eventId,
            eventType: event.eventType,
            outcome: "processed",
            processedAt: (/* @__PURE__ */ new Date()).toISOString()
          });
          return { claimed: true };
        } catch (err) {
          if (!isPocketBaseStatus(err, 400)) throw err;
          const existing = await this.get(event.gateway, event.eventId);
          if (!existing) throw err;
          return { claimed: false, existing };
        }
      },
      async complete(gateway, eventId, result) {
        const record = await findWebhookEventRecord(pb, gateway, eventId);
        if (!record) return;
        await pb.collection("processed_webhook_events").update(record.id, {
          outcome: result.outcome,
          orderId: result.orderId ?? ""
        });
      },
      async release(gateway, eventId) {
        const record = await findWebhookEventRecord(pb, gateway, eventId);
        if (!record) return;
        await pb.collection("processed_webhook_events").delete(record.id);
      },
      async get(gateway, eventId) {
        const record = await findWebhookEventRecord(pb, gateway, eventId);
        if (!record) return null;
        return {
          id: record.id,
          gateway: record.gateway,
          eventId: record.eventId,
          eventType: record.eventType,
          outcome: record.outcome,
          orderId: record.orderId || void 0,
          processedAt: new Date(record.processedAt ?? record.created)
        };
      }
    },
    // Setup — create collections based on enabled features
    async setup(features) {
      await assertSupportedVersion(config.url);
      const createdCollections = [];
      let created = false;
      async function collectionExists(name) {
        try {
          await pb.collections.getOne(name);
          return true;
        } catch {
          return false;
        }
      }
      if (!await collectionExists("products")) {
        const fields = [
          // NOTE: field-level `unique: true` is silently ignored by PocketBase
          // (removed in v0.14). Uniqueness must come from the `indexes` array.
          text("slug", true),
          text("name", true),
          text("description"),
          number("price", true),
          number("compareAtPrice"),
          json("images"),
          json("inventory"),
          json("seo"),
          json("metadata"),
          select("status", ["draft", "active", "archived"], true)
        ];
        if (features.variants) {
          fields.push(json("variants"));
          fields.push(json("options"));
        }
        await pb.collections.create({
          name: "products",
          type: "base",
          fields: [...fields, ...TIMESTAMPS],
          indexes: [PRODUCT_INDEXES.slug],
          listRule: "",
          viewRule: ""
        });
        createdCollections.push("products");
        created = true;
      }
      if (features.collections && !await collectionExists("collections")) {
        await pb.collections.create({
          name: "collections",
          type: "base",
          fields: [
            text("slug", true),
            text("name", true),
            text("description"),
            json("image"),
            json("seo"),
            number("sortOrder", true),
            ...TIMESTAMPS
          ],
          indexes: ["CREATE UNIQUE INDEX `idx_collections_slug` ON `collections` (`slug`)"],
          listRule: "",
          viewRule: ""
        });
        createdCollections.push("collections");
        created = true;
      }
      if (!await collectionExists("carts")) {
        await pb.collections.create({
          name: "carts",
          type: "base",
          fields: [
            text("sessionId", true),
            text("customerId"),
            json("items"),
            number("subtotal"),
            number("totalTax"),
            number("totalShipping"),
            number("totalDiscount"),
            number("total"),
            text("currency"),
            ...TIMESTAMPS
          ],
          listRule: "",
          viewRule: ""
        });
        createdCollections.push("carts");
        created = true;
      }
      if (!await collectionExists("orders")) {
        await pb.collections.create({
          name: "orders",
          type: "base",
          fields: [
            text("orderNumber", true),
            text("customerId"),
            text("email", true),
            select("status", ["pending", "confirmed", "paid", "fulfilled", "shipped", "delivered", "cancelled", "refunded"], true),
            select("paymentStatus", ["pending", "authorized", "paid", "partially_refunded", "refunded", "failed"], true),
            select("fulfillmentStatus", ["unfulfilled", "partially_fulfilled", "fulfilled", "returned"], true),
            json("items"),
            number("subtotal"),
            number("totalTax"),
            number("totalShipping"),
            number("totalDiscount"),
            number("total"),
            text("currency"),
            json("shippingAddress"),
            json("billingAddress"),
            json("transactions"),
            text("notes"),
            json("metadata"),
            text("gateway"),
            text("gatewayRef"),
            ...TIMESTAMPS
          ],
          indexes: [ORDER_INDEXES.orderNumber, ORDER_INDEXES.gatewayRef]
        });
        createdCollections.push("orders");
        created = true;
      }
      if (!await collectionExists("processed_webhook_events")) {
        await pb.collections.create({
          name: "processed_webhook_events",
          type: "base",
          fields: [
            text("gateway", true),
            text("eventId", true),
            text("eventType", true),
            select("outcome", ["processed", "ignored", "failed"], true),
            text("orderId"),
            text("processedAt"),
            ...TIMESTAMPS
          ],
          indexes: [WEBHOOK_EVENT_INDEXES.gatewayEventId]
        });
        createdCollections.push("processed_webhook_events");
        created = true;
      }
      if (!await collectionExists("customers")) {
        await pb.collections.create({
          name: "customers",
          type: "base",
          fields: [
            email("email", true),
            text("firstName"),
            text("lastName"),
            text("phone"),
            json("addresses"),
            text("defaultAddressId"),
            json("metadata"),
            ...TIMESTAMPS
          ]
        });
        createdCollections.push("customers");
        created = true;
      }
      return { created, createdCollections };
    }
  };
}
async function findWebhookEventRecord(pb, gateway, eventId) {
  const records = await pb.collection("processed_webhook_events").getFullList({
    filter: `gateway="${escapeFilter(gateway)}" && eventId="${escapeFilter(eventId)}"`,
    limit: 1
  });
  return records[0];
}
function buildFilter(filters) {
  return Object.entries(filters).map(([key, value]) => {
    if (typeof value === "string") {
      return `${key}="${escapeFilter(value)}"`;
    }
    return `${key}=${value}`;
  }).join(" && ");
}
function escapeFilter(value) {
  return value.replace(/"/g, '\\"');
}

// packages/integration-stripe/dist/index.js
import Stripe2 from "stripe";
import Stripe from "stripe";
function createStripeSubscriptionProvider(config) {
  const stripe2 = new Stripe(config.secretKey, { apiVersion: "2023-10-16" });
  return {
    async createSubscription(options) {
      const subscription = await stripe2.subscriptions.create({
        customer: options.customerId,
        items: [{ price: options.planId }],
        ...options.trialDays && { trial_period_days: options.trialDays },
        ...options.paymentMethodId && { default_payment_method: options.paymentMethodId },
        ...options.metadata && { metadata: options.metadata },
        payment_behavior: "default_incomplete",
        expand: ["latest_invoice.payment_intent"]
      });
      const invoice = subscription.latest_invoice;
      const paymentIntent = invoice?.payment_intent;
      return {
        id: subscription.id,
        status: subscription.status,
        clientSecret: paymentIntent?.client_secret || void 0,
        currentPeriodEnd: new Date(subscription.current_period_end * 1e3)
      };
    },
    async cancelSubscription(subscriptionId, immediately) {
      if (immediately) {
        const deleted = await stripe2.subscriptions.cancel(subscriptionId);
        return { id: deleted.id, status: deleted.status, canceledAt: /* @__PURE__ */ new Date() };
      }
      const updated = await stripe2.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      });
      return {
        id: updated.id,
        status: updated.status,
        canceledAt: updated.cancel_at ? new Date(updated.cancel_at * 1e3) : void 0
      };
    },
    async updateSubscription(subscriptionId, newPlanId) {
      const sub = await stripe2.subscriptions.retrieve(subscriptionId);
      const itemId = sub.items.data[0].id;
      const updated = await stripe2.subscriptions.update(subscriptionId, {
        items: [{ id: itemId, price: newPlanId }],
        proration_behavior: "create_prorations"
      });
      return { id: updated.id, status: updated.status };
    },
    async getSubscription(subscriptionId) {
      const sub = await stripe2.subscriptions.retrieve(subscriptionId, {
        expand: ["items.data.price.product"]
      });
      const item = sub.items.data[0];
      const price = item.price;
      const product = price.product;
      const plan = {
        id: price.id,
        provider: "stripe",
        name: product.name,
        amount: price.unit_amount || 0,
        currency: price.currency.toUpperCase(),
        interval: price.recurring?.interval,
        intervalCount: price.recurring?.interval_count || 1
      };
      const customer = await stripe2.customers.retrieve(sub.customer);
      return {
        id: sub.id,
        customerId: sub.customer,
        customerEmail: customer.email || "",
        status: sub.status,
        plan,
        currentPeriodStart: new Date(sub.current_period_start * 1e3),
        currentPeriodEnd: new Date(sub.current_period_end * 1e3),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        trialEnd: sub.trial_end ? new Date(sub.trial_end * 1e3) : void 0,
        metadata: sub.metadata
      };
    },
    handleWebhook(payload, signature) {
      if (!config.webhookSecret || !signature) {
        throw new Error("Stripe webhook secret not configured");
      }
      return stripe2.webhooks.constructEvent(payload, signature, config.webhookSecret);
    },
    async processWebhookEvent(event) {
      const stripeEvent = event;
      switch (stripeEvent.type) {
        case "invoice.payment_succeeded": {
          const invoice = stripeEvent.data.object;
          return {
            type: "invoice_paid",
            subscriptionId: invoice.subscription,
            customerId: typeof invoice.customer === "string" ? invoice.customer : void 0,
            data: invoice
          };
        }
        case "invoice.payment_failed": {
          const invoice = stripeEvent.data.object;
          return {
            type: "payment_failed",
            subscriptionId: invoice.subscription,
            customerId: typeof invoice.customer === "string" ? invoice.customer : void 0,
            data: invoice
          };
        }
        case "customer.subscription.created": {
          const sub = stripeEvent.data.object;
          return {
            type: "subscription_created",
            subscriptionId: sub.id,
            customerId: typeof sub.customer === "string" ? sub.customer : void 0,
            data: sub
          };
        }
        case "customer.subscription.deleted": {
          const sub = stripeEvent.data.object;
          return {
            type: "subscription_canceled",
            subscriptionId: sub.id,
            customerId: typeof sub.customer === "string" ? sub.customer : void 0,
            data: sub
          };
        }
        default:
          return {
            type: "other",
            subscriptionId: stripeEvent.data.object?.id || "",
            data: stripeEvent.data.object
          };
      }
    }
  };
}
function stripeIntegration(config) {
  const stripe2 = new Stripe2(config.secretKey, {
    apiVersion: "2023-10-16"
  });
  return {
    stripe: stripe2,
    // Expose for advanced use
    // Create a checkout session for cart
    async createCheckoutSession(cart, options) {
      const session = await stripe2.checkout.sessions.create({
        payment_method_types: ["card"],
        billing_address_collection: "required",
        shipping_address_collection: {
          allowed_countries: ["US", "CA", "GB", "AU"]
          // Configurable
        },
        line_items: cart.items.map((item) => ({
          price_data: {
            currency: cart.currency.toLowerCase(),
            product_data: {
              name: item.name,
              images: item.image ? [item.image.url] : void 0
            },
            unit_amount: item.price
          },
          quantity: item.quantity
        })),
        mode: "payment",
        success_url: config.successUrl,
        cancel_url: config.cancelUrl,
        customer_email: options?.customerEmail,
        metadata: {
          cartId: cart.id,
          ...options?.metadata
        }
      });
      if (!session.url) {
        throw new Error("Failed to create checkout session");
      }
      return {
        id: session.id,
        url: session.url
      };
    },
    // Retrieve session details
    async getSession(sessionId) {
      const session = await stripe2.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent", "shipping_cost", "shipping_details"]
      });
      return session;
    },
    // Verify and parse webhook
    handleWebhook(payload, signature) {
      if (!config.webhookSecret) {
        throw new Error("Webhook secret not configured");
      }
      try {
        const event = stripe2.webhooks.constructEvent(
          payload,
          signature,
          config.webhookSecret
        );
        return event;
      } catch (err) {
        throw new Error(`Webhook verification failed: ${err.message}`);
      }
    },
    // Handle common webhook events
    async processWebhookEvent(event) {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          return {
            type: "payment_success",
            data: {
              sessionId: session.id,
              paymentIntentId: session.payment_intent,
              amount: session.amount_total,
              currency: session.currency,
              customerEmail: session.customer_email,
              customerId: session.customer,
              metadata: session.metadata,
              shipping: session.shipping_details
            }
          };
        }
        case "checkout.session.async_payment_failed":
        case "payment_intent.payment_failed": {
          return {
            type: "payment_failure",
            data: event.data.object
          };
        }
        case "charge.refunded": {
          const refund = event.data.object;
          return {
            type: "refund",
            data: {
              chargeId: refund.id,
              amount: refund.amount_refunded,
              currency: refund.currency
            }
          };
        }
        default:
          return {
            type: "other",
            data: event
          };
      }
    },
    // Create refund
    async createRefund(paymentIntentId, amount, reason) {
      const params = {
        payment_intent: paymentIntentId,
        reason
      };
      if (amount) {
        params.amount = amount;
      }
      return stripe2.refunds.create(params);
    },
    // Create transaction record from Stripe data
    createTransactionFromSession(session) {
      const paymentIntent = session.payment_intent;
      return {
        kind: "sale",
        status: "success",
        amount: session.amount_total || 0,
        currency: session.currency?.toUpperCase() || "USD",
        gateway: "stripe",
        metadata: {
          sessionId: session.id,
          paymentIntentId: paymentIntent?.id,
          customerId: session.customer
        }
      };
    }
  };
}

// dist/app-context.js
var POCKETBASE_URL = process.env.POCKETBASE_URL || "http://localhost:8090";
var POCKETBASE_ADMIN_TOKEN = process.env.POCKETBASE_ADMIN_TOKEN;
var STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
var STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;
var STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
var APP_URL = process.env.APP_URL || "http://localhost:3000";
var dbConfig = { url: POCKETBASE_URL };
if (POCKETBASE_ADMIN_TOKEN) {
  dbConfig.adminToken = POCKETBASE_ADMIN_TOKEN;
}
var database = pocketbaseAdapter(dbConfig);
var stripe = STRIPE_SECRET_KEY && STRIPE_PUBLISHABLE_KEY ? stripeIntegration({
  provider: "stripe",
  secretKey: STRIPE_SECRET_KEY,
  publishableKey: STRIPE_PUBLISHABLE_KEY,
  successUrl: `${APP_URL}/checkout/success`,
  cancelUrl: `${APP_URL}/checkout/cancel`
}) : null;
function getSessionId(c) {
  const cookie = c.req.header("cookie") || "";
  const match2 = cookie.match(/sessionId=([^;]+)/);
  return match2 ? match2[1] : crypto.randomUUID();
}
function setSessionCookie(c, sessionId) {
  c.header("Set-Cookie", `sessionId=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`, { append: true });
}
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
var FLASH_COOKIE = "tillkit_flash";
function setFlash(c, message) {
  c.header("Set-Cookie", `${FLASH_COOKIE}=${encodeURIComponent(message)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=30`, { append: true });
}
function takeFlash(c) {
  const match2 = (c.req.header("cookie") || "").match(new RegExp(`${FLASH_COOKIE}=([^;]+)`));
  if (!match2)
    return void 0;
  c.header("Set-Cookie", `${FLASH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`, {
    append: true
  });
  return decodeURIComponent(match2[1]);
}
var layout = (title, content, flashMessage) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | TillKit</title>
  <link rel="stylesheet" href="/styles.css">
  <script src="https://unpkg.com/htmx.org@1.9.10"></script>
</head>
<body>
  <nav>
    <a href="/">TillKit</a>
    <a href="/products">Products</a>
    <a href="/cart">Cart (<span id="cart-count"></span>)</a>
    ${stripe ? '<a href="/admin/orders">Admin</a>' : ""}
  </nav>
  <main>
    ${flashMessage ? `<div class="flash flash-${flashMessage.includes("Error") ? "error" : "success"}">${flashMessage}</div>` : ""}
    ${content}
  </main>
  <script>
    document.body.addEventListener('htmx:afterRequest', function(evt) {
      if (evt.detail.xhr.getResponseHeader('X-Cart-Updated')) {
        updateCartCount();
      }
    });
    function updateCartCount() {
      fetch('/cart/count')
        .then(r => r.text())
        .then(count => document.getElementById('cart-count').textContent = count);
    }
    updateCartCount();
  </script>
</body>
</html>`;

// dist/routes/checkout.js
var checkoutRouter = new Hono2();
async function reconcileCart(sessionId, result) {
  for (const removed of result.removedItems) {
    await database.cart.removeItem(sessionId, removed.itemId);
  }
  for (const issue of result.stockIssues) {
    if (issue.available <= 0) {
      await database.cart.removeItem(sessionId, issue.itemId);
    } else {
      await database.cart.updateItem(sessionId, issue.itemId, issue.available);
    }
  }
  for (const change of result.priceChanges) {
    const cart = await database.cart.get(sessionId);
    const item = cart?.items.find((i) => i.id === change.itemId);
    if (!item)
      continue;
    await database.cart.removeItem(sessionId, item.id);
    await database.cart.addItem(sessionId, {
      productId: item.productId,
      variantId: item.variantId,
      name: item.name,
      sku: item.sku,
      price: change.newPrice,
      quantity: item.quantity,
      image: item.image
    });
  }
}
function describeChanges(result) {
  const parts = [];
  for (const c of result.priceChanges) {
    parts.push(`the price of ${escapeHtml(c.name)} changed`);
  }
  for (const s of result.stockIssues) {
    parts.push(s.available <= 0 ? `${escapeHtml(s.name)} is out of stock` : `only ${s.available} of ${escapeHtml(s.name)} remain`);
  }
  for (const r of result.removedItems) {
    parts.push(`${escapeHtml(r.name)} is no longer available`);
  }
  return `Your cart was updated before checkout: ${parts.join("; ")}. Please review and try again.`;
}
checkoutRouter.post("/", async (c) => {
  if (!stripe) {
    return c.html(layout("Error", `
        <h1>Checkout Unavailable</h1>
        <p>Stripe is not configured. Please set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY.</p>
        <a href="/cart">\u2190 Back to Cart</a>
      `), 500);
  }
  const sessionId = getSessionId(c);
  const cart = await database.cart.get(sessionId);
  if (!cart || cart.items.length === 0) {
    return c.redirect("/cart");
  }
  const revalidation = await revalidateCart(database, cart);
  if (!revalidation.ok) {
    await reconcileCart(sessionId, revalidation);
    setFlash(c, describeChanges(revalidation));
    return c.redirect("/cart");
  }
  const checkoutSession = await stripe.createCheckoutSession(cart);
  return c.redirect(checkoutSession.url);
});
checkoutRouter.get("/success", async (c) => {
  if (!stripe)
    return c.redirect("/cart");
  const stripeSessionId = c.req.query("session_id");
  if (!stripeSessionId)
    return c.redirect("/cart");
  const orderId = await createOrderFromStripeSession({
    database,
    stripe,
    sessionId: stripeSessionId,
    getSessionIdFn: () => getSessionId(c),
    inventoryWebhook: process.env.INVENTORY_WEBHOOK_URL ? {
      url: process.env.INVENTORY_WEBHOOK_URL,
      secret: process.env.INVENTORY_WEBHOOK_SECRET || void 0
    } : void 0
  });
  if (!orderId) {
    return c.html(layout("Payment Pending", `
        <h1>Payment Pending</h1>
        <p>Your payment is being processed, or the order could not yet be finalized.</p>
        <a href="/">\u2190 Continue Shopping</a>
      `));
  }
  const order2 = await database.orders.get(orderId);
  return c.html(layout("Thank You!", `
      <div class="success-page">
        <h1>\u{1F389} Thank You for Your Order!</h1>
        <p>Order number: <strong>${order2?.orderNumber ?? orderId}</strong></p>
        <p>We've received your order.</p>
        <a href="/" class="button-primary">Continue Shopping</a>
      </div>
    `));
});
checkoutRouter.get("/cancel", async (c) => {
  return c.html(layout("Checkout Cancelled", `
      <h1>Checkout Cancelled</h1>
      <p>Your payment was cancelled. Your cart items are still saved.</p>
      <div class="actions">
        <a href="/cart" class="button-primary">Back to Cart</a>
        <a href="/products">Continue Shopping</a>
      </div>
    `));
});

// dist/routes/webhooks.js
var webhooksRouter = new Hono2();
if (stripe && process.env.STRIPE_WEBHOOK_SECRET) {
  const inventoryWebhookConfig = process.env.INVENTORY_WEBHOOK_URL ? {
    url: process.env.INVENTORY_WEBHOOK_URL,
    secret: process.env.INVENTORY_WEBHOOK_SECRET || void 0
  } : void 0;
  webhooksRouter.route("/", createWebhookRoutes({
    database,
    stripe,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    inventoryWebhook: inventoryWebhookConfig
  }));
}

// dist/app.js
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
function createStarterApp(deps) {
  const { database: database2, stripe: stripe2, search: search2, subscriptionProvider: subscriptionProvider2 } = deps;
  const app2 = new Hono2();
  app2.get("/", async (c) => {
    const products = await database2.products.list({ limit: 6 });
    const html = layout("Open-source e-commerce starter", `
      <div class="hero" style="text-align: center; padding: 60px 20px;">
        <h1 style="font-size: 2.5rem; font-weight: 700; margin-bottom: 16px; letter-spacing: -0.02em;">
          TillKit
        </h1>
        <p style="font-size: 1.15rem; color: var(--text-muted); max-width: 560px; margin: 0 auto 32px;">
          An open-source e-commerce starter kit built with Hono, HTMX, and PocketBase. 
          Free to use. Easy to deploy.
        </p>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <a href="/products" class="button-primary" style="font-size: 1.05rem; padding: 14px 28px;">
            \u{1F6D2} See Live Demo
          </a>
          <a href="https://github.com/yourname/tillkit" class="button-primary" style="font-size: 1.05rem; padding: 14px 28px; background: #1a1a1a;">
            \u2B50 View on GitHub
          </a>
        </div>
      </div>

      <div style="background: var(--bg-muted); padding: 60px 20px; margin: 0 -20px; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);">
        <div style="max-width: 960px; margin: 0 auto; text-align: center;">
          <h2 style="font-size: 1.6rem; margin-bottom: 8px;">Need a custom store?</h2>
          <p style="color: var(--text-muted); margin-bottom: 32px; font-size: 0.95rem;">
            Production-ready e-commerce built on TillKit. You own the code, the data, and the infrastructure.
          </p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; text-align: left;">
            <!-- Basic Setup -->
            <div style="background: white; padding: 24px; border-radius: var(--radius); border: 1px solid var(--border);">
              <div style="font-size: 1.4rem; font-weight: 700;">$500</div>
              <div style="font-size: 0.9rem; font-weight: 600; margin-top: 4px;">Basic Setup</div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin: 8px 0 12px;">Best for: "I need it working on my stack"</div>
              <ul style="font-size: 0.8rem; color: var(--text-muted); padding-left: 16px; margin: 0;">
                <li>Deploy to your Vercel + PocketBase</li>
                <li>Stripe connected & verified</li>
                <li>Collections schema created</li>
                <li>14 days email support</li>
              </ul>
              <a href="mailto:hello@tillkit.dev?subject=Basic%20Setup%20Inquiry" class="button-primary" style="display: block; text-align: center; margin-top: 16px; font-size: 0.85rem; padding: 10px 16px;">Get Started</a>
            </div>
            <!-- BYOPB Pro -->
            <div style="background: white; padding: 24px; border-radius: var(--radius); border: 2px solid var(--primary);">
              <div style="font-size: 1.4rem; font-weight: 700; color: var(--primary);">$1,000</div>
              <div style="font-size: 0.9rem; font-weight: 600; margin-top: 4px;">BYOPB Pro</div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin: 8px 0 12px;">Best for: "I want a solid technical foundation"</div>
              <ul style="font-size: 0.8rem; color: var(--text-muted); padding-left: 16px; margin: 0;">
                <li>Everything in Basic Setup</li>
                <li>Security hardening + auth audit</li>
                <li>Custom theme (3 built-ins)</li>
                <li>CI/CD pipeline configured</li>
                <li>Architecture docs for your team</li>
                <li>30 days Slack/Discord support</li>
              </ul>
              <a href="mailto:hello@tillkit.dev?subject=BYOPB%20Pro%20Inquiry" class="button-primary" style="display: block; text-align: center; margin-top: 16px; font-size: 0.85rem; padding: 10px 16px;">Book a Call</a>
            </div>
            <!-- Custom Store -->
            <div style="background: white; padding: 24px; border-radius: var(--radius); border: 1px solid var(--border);">
              <div style="font-size: 1.4rem; font-weight: 700;">$2,000</div>
              <div style="font-size: 0.9rem; font-weight: 600; margin-top: 4px;">Custom Store</div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin: 8px 0 12px;">Best for: "I need it to look like my brand"</div>
              <ul style="font-size: 0.8rem; color: var(--text-muted); padding-left: 16px; margin: 0;">
                <li>Everything in BYOPB Pro</li>
                <li>Custom theme & components</li>
                <li>Full integrations (search, subscriptions)</li>
                <li>60 days priority support</li>
              </ul>
              <a href="mailto:hello@tillkit.dev?subject=Custom%20Store%20Inquiry" class="button-primary" style="display: block; text-align: center; margin-top: 16px; font-size: 0.85rem; padding: 10px 16px; background: #1a1a1a;">Book Discovery Call</a>
            </div>
            <!-- Ongoing Care -->
            <div style="background: white; padding: 24px; border-radius: var(--radius); border: 1px solid var(--border);">
              <div style="font-size: 1.4rem; font-weight: 700;">$300<span style="font-size: 0.9rem; font-weight: 400;">/mo</span></div>
              <div style="font-size: 0.9rem; font-weight: 600; margin-top: 4px;">Ongoing Care</div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin: 8px 0 12px;">Best for: "I want you managing everything"</div>
              <ul style="font-size: 0.8rem; color: var(--text-muted); padding-left: 16px; margin: 0;">
                <li>Managed hosting on Fly.io</li>
                <li>Monthly updates & security patches</li>
                <li>Priority support</li>
                <li>Cancel anytime</li>
              </ul>
              <a href="mailto:hello@tillkit.dev?subject=Ongoing%20Care%20Inquiry" class="button-primary" style="display: block; text-align: center; margin-top: 16px; font-size: 0.85rem; padding: 10px 16px;">Subscribe</a>
            </div>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 16px;">
            <a href="/setup-checklist" style="color: var(--primary); text-decoration: underline;">See what I need to get started \u2192</a>
          </p>
        </div>
      </div>

      <!-- YOU OWN EVERYTHING -->
      <div style="padding: 60px 20px; text-align: center;">
        <div style="max-width: 700px; margin: 0 auto;">
          <h2 style="font-size: 1.5rem; margin-bottom: 16px;">You Own Everything</h2>
          <p style="color: var(--text-muted); margin-bottom: 24px; font-size: 0.95rem;">
            TillKit is open-source and built on open-source. No vendor lock-in. No proprietary black boxes.
            If we stop working together, you keep everything.
          </p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; text-align: left; font-size: 0.85rem; color: var(--text-muted);">
            <div style="padding: 16px; background: var(--bg-muted); border-radius: var(--radius);">
              <strong style="color: var(--text); display: block; margin-bottom: 4px;">\u{1F4C2} Your Code</strong>
              Private GitHub repo under your account. Full source access from day one.
            </div>
            <div style="padding: 16px; background: var(--bg-muted); border-radius: var(--radius);">
              <strong style="color: var(--text); display: block; margin-bottom: 4px;">\u{1F5C4}\uFE0F Your Data</strong>
              PocketBase instance on your infrastructure. I never touch your customer data.
            </div>
            <div style="padding: 16px; background: var(--bg-muted); border-radius: var(--radius);">
              <strong style="color: var(--text); display: block; margin-bottom: 4px;">\u{1F4B3} Your Payments</strong>
              Stripe connected to your account. Money flows directly to you.
            </div>
            <div style="padding: 16px; background: var(--bg-muted); border-radius: var(--radius);">
              <strong style="color: var(--text); display: block; margin-bottom: 4px;">\u{1F680} Your Infra</strong>
              Deployed to your Vercel + Fly.io accounts. You control billing and access.
            </div>
          </div>
          <div style="margin-top: 24px; padding: 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius); text-align: left; font-size: 0.85rem; color: #166534;">
            <strong>Leaving is easy.</strong> Transfer your GitHub repo to your team. Export your PocketBase data (one SQLite file). Point your domain wherever you want. No migration fees, no data ransom.
          </div>
        </div>
      </div>

      <div style="padding: 40px 20px; text-align: center;">
        <h2 style="font-size: 1.5rem; margin-bottom: 8px;">Featured Products</h2>
        <p style="color: var(--text-muted); margin-bottom: 24px; font-size: 0.9rem;">
          This demo store was built with TillKit
        </p>
        <div class="products">
          ${products.items.map((p) => renderProductCard(p)).join("")}
        </div>
      </div>
    `);
    return c.html(html);
  });
  app2.get("/products", async (c) => {
    const query = c.req.query("q");
    let products;
    let total = 0;
    if (query && query.trim()) {
      if (search2) {
        const result = await search2.search(query, { page: 1, perPage: 50 });
        products = result.items;
        total = result.total;
      } else {
        products = await database2.products.search(query);
        total = products.length;
      }
    } else {
      const result = await database2.products.list({ limit: 50 });
      products = result.items;
      total = result.total;
    }
    const html = layout("Products", `
      <h1>Products</h1>
      <form class="search" action="/products" method="get">
        <input type="search" name="q" value="${query || ""}" placeholder="Search products...">
        <button type="submit">Search</button>
        ${query ? `<a href="/products" class="btn btn-sm">Clear</a>` : ""}
      </form>
      <div class="products">
        ${products.length === 0 ? '<p class="empty">No products found.</p>' : products.map((p) => renderProductCard(p)).join("")}
      </div>
      ${query ? `<p style="color:#666;font-size:0.85rem;">${total} result${total !== 1 ? "s" : ""} for "${query}"</p>` : ""}
    `);
    return c.html(html);
  });
  app2.get("/products/:slug", async (c) => {
    const slug = c.req.param("slug");
    const product = await database2.products.getBySlug(slug);
    if (!product) {
      return c.html(layout("Not Found", `
          <h1>Product Not Found</h1>
          <p>The product "${slug}" doesn't exist.</p>
          <a href="/products">\u2190 Back to Products</a>
        `), 404);
    }
    const html = layout(product.name, `
      <div class="product-detail">
        <div class="product-images">
          ${product.images?.length ? product.images.map((img) => `<img src="${img.url}" alt="${product.name}">`).join("") : '<div class="placeholder-image">No Image</div>'}
        </div>
        <div class="product-info">
          <h1>${product.name}</h1>
          <p class="price">${formatPrice(product.price, "USD")}</p>
          ${product.description ? `<p class="description">${product.description}</p>` : ""}

          <form hx-post="/cart/add" hx-target="#cart-result" hx-swap="innerHTML">
            <input type="hidden" name="productId" value="${product.id}">
            <div class="quantity">
              <label>Quantity:</label>
              <input type="number" name="quantity" value="1" min="1" max="99">
            </div>
            <button type="submit" class="button-primary">Add to Cart</button>
          </form>
          <div id="cart-result"></div>
        </div>
      </div>
    `);
    return c.html(html);
  });
  app2.get("/cart/count", async (c) => {
    const sessionId = getSessionId(c);
    setSessionCookie(c, sessionId);
    try {
      const cart = await database2.cart.get(sessionId);
      const count = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      return c.text(count.toString());
    } catch {
      return c.text("0");
    }
  });
  app2.get("/cart", async (c) => {
    const sessionId = getSessionId(c);
    setSessionCookie(c, sessionId);
    const flash = takeFlash(c);
    let cart = null;
    try {
      cart = await database2.cart.get(sessionId);
    } catch (err) {
      console.log("Cart fetch error:", err);
    }
    if (!cart || cart.items.length === 0) {
      return c.html(layout("Cart", `
          <h1>Your Cart is Empty</h1>
          <p>Looks like you haven't added anything yet.</p>
          <a href="/products" class="button-primary">Continue Shopping</a>
        `, flash));
    }
    const subtotal = cart.items.reduce((sum, item) => sum + (item.lineTotal ?? item.price * item.quantity), 0);
    const html = layout("Cart", `
      <h1>Shopping Cart</h1>
      <div class="cart-items">
        ${cart.items.map((item) => `
          <div class="cart-item">
            <img src="${item.image?.url || "/placeholder.svg"}" alt="${item.name}">
            <div class="item-details">
              <h3>${item.name}</h3>
              <p>${formatPrice(item.price, "USD")}</p>
            </div>
            <form class="item-quantity" hx-post="/cart/update" hx-target="body">
              <input type="hidden" name="itemId" value="${item.id}">
              <input type="number" name="quantity" value="${item.quantity}" min="0" max="99">
              <button type="submit">Update</button>
            </form>
            <div class="item-total">${formatPrice(item.lineTotal ?? item.price * item.quantity, "USD")}</div>
            <form hx-post="/cart/remove" hx-target="body">
              <input type="hidden" name="itemId" value="${item.id}">
              <button type="submit" class="danger">\xD7</button>
            </form>
          </div>
        `).join("")}
      </div>
      <div class="cart-totals">
        <div class="total-line">
          <span>Subtotal</span>
          <span>${formatPrice(subtotal, "USD")}</span>
        </div>
      </div>
      <div class="cart-actions">
        <a href="/products">\u2190 Continue Shopping</a>
        ${stripe2 ? `<form action="/checkout" method="post">
               <button type="submit" class="button-primary">Proceed to Checkout \u2192</button>
             </form>` : '<p class="notice">Checkout unavailable - Stripe not configured</p>'}
      </div>
    `, flash);
    return c.html(html);
  });
  app2.post("/cart/add", async (c) => {
    const body = await c.req.parseBody();
    const productId = body.productId;
    const quantity = parseInt(body.quantity) || 1;
    const sessionId = getSessionId(c);
    setSessionCookie(c, sessionId);
    if (!productId) {
      return c.text('<div class="error">Product ID required</div>');
    }
    try {
      let cart = await database2.cart.get(sessionId);
      if (!cart) {
        cart = await database2.cart.create(sessionId);
      }
      const product = await database2.products.get(productId);
      if (!product) {
        return c.text('<div class="error">Product not found</div>');
      }
      await database2.cart.addItem(sessionId, {
        productId: product.id,
        name: product.name,
        sku: product.slug,
        price: product.price,
        quantity,
        image: product.images?.[0]
      });
      c.header("X-Cart-Updated", "1");
      return c.text('<div class="success">Added to cart! <a href="/cart">View Cart</a></div>');
    } catch (err) {
      console.error("Cart add error:", err);
      return c.text('<div class="error">Error adding to cart</div>');
    }
  });
  app2.post("/cart/update", async (c) => {
    const body = await c.req.parseBody();
    const sessionId = getSessionId(c);
    try {
      await database2.cart.updateItem(sessionId, body.itemId, parseInt(body.quantity));
      return c.redirect("/cart");
    } catch {
      return c.redirect("/cart");
    }
  });
  app2.post("/cart/remove", async (c) => {
    const body = await c.req.parseBody();
    const sessionId = getSessionId(c);
    try {
      await database2.cart.removeItem(sessionId, body.itemId);
      return c.redirect("/cart");
    } catch {
      return c.redirect("/cart");
    }
  });
  app2.get("/setup-checklist", async (c) => {
    const html = layout("BYOPB Setup Checklist", `
      <div style="max-width: 700px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 1.8rem; margin-bottom: 8px;">BYOPB Setup Checklist</h1>
        <p style="color: var(--text-muted); margin-bottom: 32px; font-size: 0.95rem;">
          Here's what I need from you before we start building. <strong>Already have some of this?</strong> No worries \u2014 we'll skip those steps.
        </p>

        <div style="margin-bottom: 32px; padding: 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius);">
          <strong style="color: #1e40af;">\u{1F4A1} Pro tip:</strong> <span style="color: #1e40af;">
            Don't have hosting yet? I can provision everything on your behalf and transfer it later. 
            Or if you already have a PocketBase instance running somewhere, just send me the URL.
          </span>
        </div>

        <div style="margin-bottom: 32px;">
          <h2 style="font-size: 1.2rem; margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">1. Infrastructure</h2>
          <ul style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.8; padding-left: 20px;">
            <li><strong>Vercel account</strong> (or your preferred Node.js host) \u2014 where the storefront lives</li>
            <li><strong>PocketBase instance</strong> \u2014 where products, orders, and customers live. Can be:
              <ul>
                <li>Self-hosted (Fly.io, Railway, Hetzner, your VPS)</li>
                <li>PocketHost.io</li>
                <li>"I don't have one yet" \u2014 I'll spin one up for you</li>
              </ul>
            </li>
            <li><strong>Domain name</strong> \u2014 or a free Vercel subdomain to start</li>
          </ul>
        </div>

        <div style="margin-bottom: 32px;">
          <h2 style="font-size: 1.2rem; margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">2. Payments</h2>
          <ul style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.8; padding-left: 20px;">
            <li><strong>Stripe account</strong> \u2014 money flows directly to you, not me</li>
            <li><strong>Stripe secret key</strong> (sk_live_...) \u2014 for processing payments</li>
            <li><strong>Stripe publishable key</strong> (pk_live_...) \u2014 for the checkout form</li>
            <li><strong>Stripe webhook secret</strong> \u2014 for order confirmation automation</li>
            <li><strong>Or:</strong> "I don't have Stripe yet" \u2014 I'll walk you through setup in our first call</li>
          </ul>
        </div>

        <div style="margin-bottom: 32px;">
          <h2 style="font-size: 1.2rem; margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">3. Content & Branding</h2>
          <ul style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.8; padding-left: 20px;">
            <li><strong>Store name & description</strong> \u2014 for the homepage and SEO</li>
            <li><strong>Logo</strong> (PNG/SVG) \u2014 optional, can use text logo initially</li>
            <li><strong>Brand colors</strong> \u2014 hex codes or "use the default TillKit theme"</li>
            <li><strong>Product photos & descriptions</strong> \u2014 or placeholder products to start</li>
            <li><strong>Shipping rates</strong> \u2014 flat rate, free shipping threshold, or "TBD"</li>
          </ul>
        </div>

        <div style="margin-bottom: 32px;">
          <h2 style="font-size: 1.2rem; margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">4. Access & Communication</h2>
          <ul style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.8; padding-left: 20px;">
            <li><strong>GitHub account</strong> \u2014 I create a private repo under your org</li>
            <li><strong>Preferred communication channel</strong> \u2014 email, Slack, or Discord</li>
            <li><strong>Timeline</strong> \u2014 when do you need to be live? (rush jobs available for +$200)</li>
          </ul>
        </div>

        <div style="padding: 24px; background: var(--bg-muted); border-radius: var(--radius); text-align: center;">
          <p style="margin-bottom: 16px; font-size: 1rem;">
            <strong>Ready to get started?</strong>
          </p>
          <a href="mailto:hello@tillkit.dev?subject=BYOPB%20Setup%20Inquiry" class="button-primary" style="font-size: 1rem; padding: 14px 28px;">
            Send me what you have \u2192
          </a>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 12px;">
            Don't have everything? That's normal. We'll figure it out together.
          </p>
        </div>
      </div>
      `);
    return c.html(html);
  });
  app2.route("/checkout", checkoutRouter);
  app2.route("/webhooks", webhooksRouter);
  if (search2) {
    app2.get("/api/search", async (c) => {
      const q = c.req.query("q") || "";
      const page = parseInt(c.req.query("page") || "1", 10);
      const perPage = parseInt(c.req.query("perPage") || "20", 10);
      if (!q.trim()) {
        return c.json({ items: [], total: 0, page, perPage });
      }
      try {
        const result = await search2.search(q, { page, perPage });
        return c.json(result);
      } catch (err) {
        console.error("Search API error:", err);
        return c.json({ error: "Search failed" }, 500);
      }
    });
  }
  app2.route("/admin", createAdminRoutes({ database: database2, basePath: "/admin", searchService: search2 }));
  if (subscriptionProvider2) {
    app2.route("/api/subscriptions", createSubscriptionRoutes({
      database: database2,
      subscriptionProvider: subscriptionProvider2
    }));
  }
  const cssPath = path.join(__dirname, "styles.css");
  app2.get("/styles.css", async (c) => {
    const css = await fs.readFile(cssPath, "utf8");
    c.header("Content-Type", "text/css");
    return c.body(css);
  });
  return app2;
}
function renderProductCard(product) {
  return `
    <div class="product-card">
      <a href="/products/${product.slug}">
        ${product.images?.[0] ? `<img src="${product.images[0].url}" alt="${product.name}">` : '<div class="placeholder-image"></div>'}
        <h3>${product.name}</h3>
        <p class="price">${formatPrice(product.price, "USD")}</p>
      </a>
      <form hx-post="/cart/add" hx-target="this" hx-swap="outerHTML">
        <input type="hidden" name="productId" value="${product.id}">
        <input type="hidden" name="quantity" value="1">
        <button type="submit">Add to Cart</button>
      </form>
    </div>
  `;
}

// dist/serverless.js
var search = void 0;
var subscriptionProvider = void 0;
if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) {
  subscriptionProvider = createStripeSubscriptionProvider({
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
  });
  console.log("Stripe subscription billing enabled");
}
if (process.env.MEILISEARCH_HOST && process.env.MEILISEARCH_API_KEY) {
  const searchConfig = {
    provider: "meilisearch",
    host: process.env.MEILISEARCH_HOST,
    apiKey: process.env.MEILISEARCH_API_KEY,
    indexName: process.env.MEILISEARCH_INDEX || "products"
  };
  try {
    const provider = createSearchProvider(searchConfig);
    search = createSearchService(provider);
    console.log(`Meilisearch init: ${process.env.MEILISEARCH_HOST}`);
  } catch (err) {
    console.error("Meilisearch init failed:", err);
  }
} else {
  console.log("Using database search fallback (no Meilisearch configured)");
}
var app = createStarterApp({ database, stripe, search, subscriptionProvider });

// dist/index.js
async function handler(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== void 0)
      headers.set(key, String(value));
  }
  let body = void 0;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    body = Buffer.concat(chunks);
  }
  const request = new Request(url, {
    method: req.method,
    headers,
    body: body && body.length > 0 ? body : void 0
  });
  const response = await app.fetch(request);
  res.statusCode = response.status;
  for (const [key, value] of response.headers.entries()) {
    res.setHeader(key, value);
  }
  const responseBody = await response.arrayBuffer();
  res.end(Buffer.from(responseBody));
}
export {
  handler as default
};
