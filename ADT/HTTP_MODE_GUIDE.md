# ABAP ADT MCP Server - HTTP Mode Guide

## Overview

The ABAP ADT MCP Server now supports **two modes of operation**:

1. **Stdio Mode (Local)**: Original mode for Cursor MCP integration via standard input/output
2. **HTTP Mode (Remote)**: New mode exposing tools as REST API endpoints for remote access

This allows the same MCP server to work both locally (integrated with Cursor) and remotely (as a standalone HTTP service).

---

## Quick Start

### 1. Start HTTP Server

```bash
# Basic startup (default port 3000, no authentication)
node server_http.js

# With custom port and API key
HTTP_PORT=8080 HTTP_API_KEY=my-secret-key node server_http.js

# Using the unified launcher
node server_launcher.js --mode http
```

### 2. Test Connection

```bash
# Health check (no authentication required)
curl http://localhost:3000/health

# List available tools (requires API key if set)
curl -H "X-API-Key: my-secret-key" http://localhost:3000/api/tools
```

### 3. Execute Tools

```bash
# Execute SQL query
curl -X POST http://localhost:3000/api/tools/adt_execute_sql_query \
  -H "Content-Type: application/json" \
  -H "X-API-Key: my-secret-key" \
  -d '{
    "sql_query": "SELECT * FROM t000 UP TO 5 ROWS",
    "max_rows": 5
  }'

# Read source code
curl -X POST http://localhost:3000/api/tools/adt_read_source \
  -H "Content-Type: application/json" \
  -H "X-API-Key: my-secret-key" \
  -d '{
    "object_name": "CL_ABAP_TYPEDESCR",
    "object_type": "CLAS"
  }'
```

---

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `HTTP_PORT` | Port for HTTP server | `3000` | No |
| `HTTP_API_KEY` | API key for authentication | `null` | Recommended |
| `REQUIRE_AUTH` | Require authentication | `true` | No |
| `SAP_SYSTEM` | Which SAP system to use | `DEV` | No |
| `NODE_ENV` | Node environment (dev/prod) | `production` | No |

### Examples

```bash
# Development mode (shows stack traces)
NODE_ENV=development HTTP_PORT=3000 node server_http.js

# Production with strong security
HTTP_API_KEY=$(openssl rand -hex 32) HTTP_PORT=8080 REQUIRE_AUTH=true node server_http.js

# Switch to BTP system
SAP_SYSTEM=BTP HTTP_API_KEY=my-key node server_http.js
```

---

## Authentication

### API Key Authentication

The HTTP server supports API key authentication via headers:

**Option 1: X-API-Key Header**
```bash
curl -H "X-API-Key: your-secret-key" http://localhost:3000/api/tools
```

**Option 2: Authorization Bearer Token**
```bash
curl -H "Authorization: Bearer your-secret-key" http://localhost:3000/api/tools
```

### Generating Secure API Keys

```bash
# Generate random API key (recommended)
openssl rand -hex 32

# Or use UUID
uuidgen
```

### Disabling Authentication (Not Recommended)

```bash
# Only for local testing!
REQUIRE_AUTH=false node server_http.js
```

---

## Available Endpoints

### Health Check
**GET** `/health`
- No authentication required
- Returns server status and configuration

```bash
curl http://localhost:3000/health
```

### List Tools
**GET** `/api/tools`
- Authentication required
- Returns list of available tools

```bash
curl -H "X-API-Key: your-key" http://localhost:3000/api/tools
```

### Execute Tool
**POST** `/api/tools/{tool_name}`
- Authentication required
- Executes specified tool with provided arguments

```bash
curl -X POST http://localhost:3000/api/tools/{tool_name} \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{ "arg1": "value1", "arg2": "value2" }'
```

---

## Supported Tools

### System Management
- `adt_switch_system` - Switch between DEV/QA/BTP systems

### Source Code Operations
- `adt_read_source` - Read ABAP object source code
- `adt_save_source` - Save ABAP object source code
- `adt_activate` - Activate ABAP objects
- `adt_check_syntax` - Check syntax of ABAP code

### SQL Operations
- `adt_execute_sql_query` - Execute SQL SELECT queries

### Class Operations
- `adt_execute_class` - Execute runnable class (if_oo_adt_classrun)
- `adt_create_class` - Create new ABAP class
- `adt_run_tests` - Run ABAP Unit tests

### Package Operations
- `adt_list_package_objects` - List objects in a package

---

## Tool Examples

### 1. Execute SQL Query

```bash
curl -X POST http://localhost:3000/api/tools/adt_execute_sql_query \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{
    "sql_query": "SELECT matnr, maktx FROM mara UP TO 10 ROWS",
    "max_rows": 10
  }'
```

**Response:**
```json
{
  "success": true,
  "tool": "adt_execute_sql_query",
  "result": {
    "columns": [...],
    "rows": [...],
    "executionTime": "12.34 ms"
  }
}
```

### 2. Read Source Code

```bash
curl -X POST http://localhost:3000/api/tools/adt_read_source \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{
    "object_name": "ZCL_MY_CLASS",
    "object_type": "CLAS"
  }'
```

### 3. List Package Objects

```bash
curl -X POST http://localhost:3000/api/tools/adt_list_package_objects \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{
    "package_name": "/COREVIST/TEMP",
    "object_type": "CLAS"
  }'
```

### 4. Switch System

```bash
curl -X POST http://localhost:3000/api/tools/adt_switch_system \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{
    "system": "BTP"
  }'
```

### 5. Check Syntax

```bash
curl -X POST http://localhost:3000/api/tools/adt_check_syntax \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{
    "object_name": "ZCL_MY_CLASS",
    "object_type": "CLAS",
    "version": "inactive"
  }'
```

---

## Testing

### Using the Test Client

Run the included test suite:

```bash
# Run all tests
HTTP_API_KEY=your-key node http_client_example.js

# With custom URL
MCP_BASE_URL=http://remote-server:8080 HTTP_API_KEY=your-key node http_client_example.js
```

### Manual Testing with curl

```bash
# Test health
curl http://localhost:3000/health

# Test authentication
curl -H "X-API-Key: wrong-key" http://localhost:3000/api/tools
# Should return 401 Unauthorized

curl -H "X-API-Key: correct-key" http://localhost:3000/api/tools
# Should return tool list
```

---

## Remote Deployment

### 1. Deploy to Remote Server

```bash
# SSH to remote server
ssh user@remote-server

# Clone/copy your MCP server
git clone <your-repo>
cd MCP/ADT

# Install dependencies
npm install

# Start with PM2 (process manager)
npm install -g pm2
pm2 start server_http.js --name "mcp-http" \
  --env HTTP_PORT=8080 \
  --env HTTP_API_KEY=<strong-api-key> \
  --env SAP_SYSTEM=DEV

# Save PM2 config
pm2 save
pm2 startup
```

### 2. Configure Firewall

```bash
# Allow HTTP traffic on chosen port
sudo ufw allow 8080/tcp

# Or use nginx as reverse proxy (recommended)
sudo apt install nginx
```

### 3. Nginx Reverse Proxy (Recommended)

Create `/etc/nginx/sites-available/mcp`:

```nginx
server {
    listen 80;
    server_name mcp.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/mcp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Add SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d mcp.yourdomain.com
```

---

## Security Best Practices

1. **Always use strong API keys** (32+ random characters)
2. **Use HTTPS in production** (Let's Encrypt is free)
3. **Restrict access** using firewall rules or VPN
4. **Rotate API keys** regularly
5. **Monitor logs** for unauthorized access attempts
6. **Use environment variables** for secrets (never hardcode)
7. **Enable CORS restrictions** for specific domains
8. **Use rate limiting** (can add express-rate-limit middleware)

### Example: Add Rate Limiting

```bash
npm install express-rate-limit
```

Add to `server_http.js`:
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api', limiter);
```

---

## Monitoring

### View Logs

```bash
# HTTP server logs
tail -f ADT/adt_http_dev.log

# PM2 logs (if using PM2)
pm2 logs mcp-http
```

### Health Monitoring

Set up a health check monitor (e.g., UptimeRobot, Pingdom):
- URL: `https://mcp.yourdomain.com/health`
- Interval: 5 minutes
- Alert on: Status != 200

---

## Troubleshooting

### Server won't start

```bash
# Check if port is already in use
netstat -an | grep 3000

# Kill process using port
kill $(lsof -t -i:3000)
```

### Authentication fails

```bash
# Verify API key is set
echo $HTTP_API_KEY

# Check server logs
tail -f ADT/adt_http_dev.log | grep AUTH
```

### Connection timeouts

```bash
# Test network connectivity
telnet remote-server 8080

# Check firewall
sudo ufw status
```

### SAP system errors

```bash
# Switch to different system
curl -X POST http://localhost:3000/api/tools/adt_switch_system \
  -H "X-API-Key: your-key" \
  -d '{"system": "DEV"}'

# Check system configuration
cat ADT/sap_systems.json
```

---

## Dual Mode Operation

You can run **both** stdio (Cursor) and HTTP (remote) modes simultaneously:

### Terminal 1: Stdio Mode (Cursor)
```bash
node server_adt.js
# Integrated with Cursor MCP
```

### Terminal 2: HTTP Mode (Remote)
```bash
HTTP_PORT=3000 HTTP_API_KEY=your-key node server_http.js
# Available at http://localhost:3000
```

Both modes:
- Share the same configuration (`sap_systems.json`)
- Use the same system switching mechanism (`current_system.json`)
- Have separate log files for easy debugging

---

## Client Examples

### JavaScript/Node.js

```javascript
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:3000',
  headers: { 'X-API-Key': 'your-secret-key' }
});

// Execute SQL
const result = await client.post('/api/tools/adt_execute_sql_query', {
  sql_query: 'SELECT * FROM t000 UP TO 5 ROWS',
  max_rows: 5
});

console.log(result.data);
```

### Python

```python
import requests

BASE_URL = 'http://localhost:3000'
API_KEY = 'your-secret-key'

headers = {'X-API-Key': API_KEY}

# Health check
response = requests.get(f'{BASE_URL}/health')
print(response.json())

# Execute SQL
response = requests.post(
    f'{BASE_URL}/api/tools/adt_execute_sql_query',
    headers=headers,
    json={
        'sql_query': 'SELECT * FROM t000 UP TO 5 ROWS',
        'max_rows': 5
    }
)
print(response.json())
```

### PowerShell

```powershell
$baseUrl = "http://localhost:3000"
$apiKey = "your-secret-key"
$headers = @{ "X-API-Key" = $apiKey }

# Health check
Invoke-RestMethod -Uri "$baseUrl/health"

# Execute SQL
$body = @{
    sql_query = "SELECT * FROM t000 UP TO 5 ROWS"
    max_rows = 5
} | ConvertTo-Json

Invoke-RestMethod -Uri "$baseUrl/api/tools/adt_execute_sql_query" `
    -Method Post `
    -Headers $headers `
    -Body $body `
    -ContentType "application/json"
```

---

## FAQ

### Can I run both modes at the same time?
Yes! The stdio mode (Cursor integration) and HTTP mode are independent and can run simultaneously.

### Do I need to restart to switch SAP systems?
No, use the `adt_switch_system` tool to switch systems on-the-fly in both modes.

### Is the HTTP mode secure?
Yes, when properly configured with:
- Strong API keys
- HTTPS/SSL
- Firewall restrictions
- Rate limiting

### Can I use this in production?
Yes, but follow security best practices:
- Use PM2 or similar process manager
- Enable HTTPS
- Use strong authentication
- Monitor logs
- Restrict access

### What's the performance impact?
Minimal. The HTTP wrapper adds ~5-10ms latency compared to direct stdio mode.

---

## Support

For issues or questions:
1. Check server logs: `tail -f ADT/adt_http_*.log`
2. Verify configuration: `cat ADT/sap_systems.json`
3. Test with curl or the test client
4. Review this guide's troubleshooting section

---

**Last Updated**: January 15, 2026
**Version**: 1.0.0
