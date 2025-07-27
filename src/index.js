/**
 * Cloudflare CORS Proxy
 * 
 * A simple and efficient CORS (Cross-Origin Resource Sharing) proxy service
 * built for Cloudflare Workers. This proxy allows web applications to bypass
 * CORS restrictions by forwarding requests through the proxy server.
 * 
 * Features:
 * - Supports all HTTP methods (GET, POST, PUT, DELETE, etc.)
 * - Custom headers support via x-cors-headers
 * - Custom request body support via x-cors-body
 * - Origin whitelisting for security
 * - URL blacklisting to prevent abuse
 * - Preflight request handling
 * - Cloudflare specific features (IP, country, datacenter info)
 * 
 * Usage:
 * Send requests to: https://your-worker-domain.workers.dev/?target-url
 * 
 * Custom Headers:
 * - x-cors-headers: JSON string of custom headers to add
 * - x-cors-method: Override the HTTP method
 * - x-cors-body: JSON string of request body data
 * 
 * Repository: https://github.com/DAN3002/cloudflare-cors-proxy
 * 
 * License: MIT License
 * 
 * Copyright (c) 2025 DAN3002
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// Configuration: Whitelist and Blacklist (not used in this version)
// whitelist = [ "^http.?://www.zibri.org$", "zibri.org$", "test\\..*" ];  // regexp for whitelisted urls
const blacklistUrls = [];
const whitelistOrigins = [".*"];

// Function to check if a given URI or origin is listed in the whitelist or blacklist
function isListedInWhitelist(uri, listing) {
    let isListed = false;
    if (typeof uri === "string") {
        listing.forEach((pattern) => {
            if (uri.match(pattern) !== null) {
                isListed = true;
            }
        });
    } else {
        // When URI is null (e.g., when Origin header is missing), decide based on the implementation
        isListed = true; // true accepts null origins, false would reject them
    }
    return isListed;
}

// Event listener for incoming fetch requests
addEventListener("fetch", async event => {
    event.respondWith((async function () {
        const isPreflightRequest = (event.request.method === "OPTIONS");

        const originUrl = new URL(event.request.url);

        // Function to modify headers to enable CORS
        function setupCORSHeaders(headers) {
            headers.set("Access-Control-Allow-Origin", event.request.headers.get("Origin"));
            if (isPreflightRequest) {
                headers.set("Access-Control-Allow-Methods", event.request.headers.get("access-control-request-method"));
                headers.set("Access-Control-Allow-Credentials", 'true');
                const requestedHeaders = event.request.headers.get("access-control-request-headers");

                if (requestedHeaders) {
                    headers.set("Access-Control-Allow-Headers", requestedHeaders);
                }

                headers.delete("X-Content-Type-Options"); // Remove X-Content-Type-Options header
            }
            return headers;
        }

        const targetUrl = decodeURIComponent(decodeURIComponent(originUrl.search.substr(1)));

        const originHeader = event.request.headers.get("Origin");
        const connectingIp = event.request.headers.get("CF-Connecting-IP");

        if ((!isListedInWhitelist(targetUrl, blacklistUrls)) && (isListedInWhitelist(originHeader, whitelistOrigins))) {
            let customHeaders = event.request.headers.get("x-cors-headers");
            let customMethod = event.request.headers.get("x-cors-method");
            let customBody = event.request.headers.get("x-cors-body");

            if (customHeaders !== null) {
                try {
                    customHeaders = JSON.parse(customHeaders);
                } catch (e) { }
            }

            if (customBody !== null) {
                try {
                    customBody = JSON.parse(customBody);
                } catch (e) {
                    // If parsing fails, use the raw string
                }
            }

            if (originUrl.search.startsWith("?")) {
                const filteredHeaders = {};
                for (const [key, value] of event.request.headers.entries()) {
                    if (
                        (key.match("^origin") === null) &&
                        (key.match("eferer") === null) &&
                        (key.match("^cf-") === null) &&
                        (key.match("^x-forw") === null) &&
                        (key.match("^x-cors-headers") === null) &&
                        (key.match("^x-cors-method") === null) &&
                        (key.match("^x-cors-body") === null)
                    ) {
                        filteredHeaders[key] = value;
                    }
                }

                if (customHeaders !== null) {
                    Object.entries(customHeaders).forEach((entry) => (filteredHeaders[entry[0]] = entry[1]));
                }

                // Prepare request options
                const requestOptions = {
                    redirect: "follow",
                    headers: filteredHeaders
                };

                // Set custom method if provided
                if (customMethod !== null) {
                    requestOptions.method = customMethod;
                }

                // Set custom body if provided and method is not GET/HEAD
                if (customBody !== null && customMethod !== null && !['GET', 'HEAD'].includes(customMethod.toUpperCase())) {
                    requestOptions.body = typeof customBody === 'string' ? customBody : JSON.stringify(customBody);
                    // Set Content-Type header if not already set
                    if (!filteredHeaders['content-type'] && !filteredHeaders['Content-Type']) {
                        filteredHeaders['Content-Type'] = 'application/json';
                    }
                }

                const newRequest = new Request(targetUrl, requestOptions);

                const response = await fetch(targetUrl, newRequest);
                let responseHeaders = new Headers(response.headers);
                const exposedHeaders = [];
                const allResponseHeaders = {};
                for (const [key, value] of response.headers.entries()) {
                    exposedHeaders.push(key);
                    allResponseHeaders[key] = value;
                }
                exposedHeaders.push("cors-received-headers");
                responseHeaders = setupCORSHeaders(responseHeaders);

                responseHeaders.set("Access-Control-Expose-Headers", exposedHeaders.join(","));
                responseHeaders.set("cors-received-headers", JSON.stringify(allResponseHeaders));

                const responseBody = isPreflightRequest ? null : await response.arrayBuffer();

                const responseInit = {
                    headers: responseHeaders,
                    status: isPreflightRequest ? 200 : response.status,
                    statusText: isPreflightRequest ? "OK" : response.statusText
                };
                return new Response(responseBody, responseInit);

            } else {
                let responseHeaders = new Headers();
                responseHeaders = setupCORSHeaders(responseHeaders);

                let country = false;
                let colo = false;
                if (typeof event.request.cf !== "undefined") {
                    country = event.request.cf.country || false;
                    colo = event.request.cf.colo || false;
                }

                return new Response(
                    "Cloudflare CORS Proxy\n\n" +
                    "Source:\nhttps://github.com/DAN3002/cloudflare-cors-proxy\n\n" +
                    "Usage:\n" +
                    originUrl.origin + "/?uri\n\n" +
                    "Custom Headers:\n" +
                    "x-cors-headers: Custom headers as JSON\n" +
                    "x-cors-method: Override HTTP method (e.g., POST, PUT)\n" +
                    "x-cors-body: Request body as JSON string\n\n" +
                    (originHeader !== null ? "Origin: " + originHeader + "\n" : "") +
                    "IP: " + connectingIp + "\n" +
                    (country ? "Country: " + country + "\n" : "") +
                    (colo ? "Datacenter: " + colo + "\n" : "") +
                    "\n" +
                    (customHeaders !== null ? "\nx-cors-headers: " + JSON.stringify(customHeaders) : "") +
                    (customMethod !== null ? "\nx-cors-method: " + customMethod : "") +
                    (customBody !== null ? "\nx-cors-body: " + JSON.stringify(customBody) : ""),
                    {
                        status: 200,
                        headers: responseHeaders
                    }
                );
            }
        } else {
            return new Response(
                "Create your own CORS proxy</br>\n" +
                "<a href='https://github.com/DAN3002/cloudflare-cors-proxye'>https://github.com/DAN3002/cloudflare-cors-proxy</a></br>\n" +
                {
                    status: 403,
                    statusText: 'Forbidden',
                    headers: {
                        "Content-Type": "text/html"
                    }
                }
            );
        }
    })());
});
