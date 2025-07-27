# Cloudflare CORS Proxy

A simple and efficient CORS (Cross-Origin Resource Sharing) proxy service built for Cloudflare Workers. This proxy allows web applications to bypass CORS restrictions by forwarding requests through the proxy server.

## Features

- ✅ **All HTTP Methods**: Supports GET, POST, PUT, DELETE, PATCH, etc.
- ✅ **Custom Headers**: Send custom headers via `x-cors-headers`
- ✅ **Custom Request Body**: Send custom body data via `x-cors-body`
- ✅ **Method Override**: Override HTTP method via `x-cors-method`
- ✅ **Origin Whitelisting**: Security through origin control
- ✅ **URL Blacklisting**: Prevent abuse with URL blocking
- ✅ **Preflight Handling**: Automatic OPTIONS request handling
- ✅ **Cloudflare Info**: Access to IP, country, and datacenter information
- ✅ **Zero Configuration**: Works out of the box

## Quick Start

### Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed
- [Node.js](https://nodejs.org/) (version 16.13.0 or later)

### Installation

1. **Clone this repository**
   ```bash
   git clone https://github.com/DAN3002/cloudflare-cors-proxy.git
   cd cloudflare-cors-proxy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Login to Cloudflare**
   ```bash
   npx wrangler login
   ```

4. **Deploy to Cloudflare Workers**
   ```bash
   npx wrangler deploy
   ```

After deployment, you'll get a URL like: `https://your-worker-name.your-subdomain.workers.dev`

## Usage

### Basic Usage

Send requests to your worker URL with the target URL as a query parameter:

```
https://your-worker.workers.dev/?https://api.example.com/data
```

### JavaScript Examples

#### Simple GET Request

```javascript
const response = await fetch('https://your-worker.workers.dev/?https://httpbin.org/get');
const data = await response.json();
console.log(data);
```

#### POST Request with Custom Headers

```javascript
const response = await fetch('https://your-worker.workers.dev/?https://httpbin.org/post', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
		'x-cors-headers': JSON.stringify({
			'Authorization': 'Bearer your-token',
			'X-Custom-Header': 'custom-value'
		})
	},
	body: JSON.stringify({ message: 'Hello World' })
});

const data = await response.json();
console.log(data);
```

#### Using Custom Method and Body

```javascript
const response = await fetch('https://your-worker.workers.dev/?https://httpbin.org/put', {
	method: 'POST', // This will be overridden
	headers: {
		'x-cors-method': 'PUT',
		'x-cors-body': JSON.stringify({
			id: 123,
			name: 'Updated Item'
		}),
		'x-cors-headers': JSON.stringify({
			'Content-Type': 'application/json',
			'Authorization': 'Bearer token'
		})
	}
});
```

#### Handling Response Headers

```javascript
const response = await fetch('https://your-worker.workers.dev/?https://httpbin.org/get');

// Get all original response headers
const originalHeaders = JSON.parse(response.headers.get('cors-received-headers'));
console.log('Original headers:', originalHeaders);

const data = await response.json();
```

## API Reference

### Special Headers

| Header | Description | Example |
|--------|-------------|---------|
| `x-cors-headers` | Custom headers as JSON string | `{"Authorization": "Bearer token"}` |
| `x-cors-method` | Override HTTP method | `PUT`, `DELETE`, `PATCH` |
| `x-cors-body` | Request body as JSON string | `{"key": "value"}` |

### Response Headers

| Header | Description |
|--------|-------------|
| `Access-Control-Allow-Origin` | CORS origin header |
| `Access-Control-Expose-Headers` | Exposed headers list |
| `cors-received-headers` | JSON string of all original response headers |

## Configuration

### Whitelist Origins (Optional)

Edit `src/index.js` to modify the whitelist:

```javascript
const whitelistOrigins = [
	"https://yourdomain.com",
	"https://app.yourdomain.com",
	".*\\.yourdomain\\.com$"  // Regex pattern
];
```

### Blacklist URLs (Optional)

```javascript
const blacklistUrls = [
	"malicious-site\\.com",
	"blocked-domain\\.org"
];
```

## Development

### Local Development

```bash
# Install dependencies
npm install

# Start local development server
npx wrangler dev

# Run tests
npm test
```

### Testing

The project includes test files. Run them with:

```bash
npm test
```

## Deployment Options

### Using Wrangler

```bash
# Deploy to production
npx wrangler deploy

# Deploy with custom name
npx wrangler deploy --name my-cors-proxy

# Deploy to specific environment
npx wrangler deploy --env production
```

### Environment Variables

You can set environment variables in `wrangler.toml`:

```toml
[env.production.vars]
ALLOWED_ORIGINS = "https://yourdomain.com,https://app.yourdomain.com"
```

## Author

- [@DAN3002](https://github.com/DAN3002)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [@Zibri](https://github.com/Zibri) for the original [cloudflare-cors-anywhere](https://github.com/Zibri/cloudflare-cors-anywhere) project

---

**Note**: This is a CORS proxy service. Use responsibly and ensure you comply with the terms of service of the APIs you're accessing.
