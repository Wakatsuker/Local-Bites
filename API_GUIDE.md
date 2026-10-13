# LocalBites Local API

The local API is an additional Postman interface. The existing browser application continues to communicate with Supabase as before.

## Required Supabase migration

After the original schema and earlier policy files, run
[`sql/production-requirements.sql`](sql/production-requirements.sql) once in
Supabase Dashboard **SQL Editor**. It installs the transactional checkout,
safe order-status workflow, delivery timestamps, notifications, and required
Row Level Security updates.

Do not restore the old direct order-insert or direct seller order-update
policies afterward. Checkout and status changes intentionally go through the
database functions created by this migration so stock cannot be oversold.

## Start the API

From the project directory, run:

```powershell
npm.cmd start
```

The server starts at `http://localhost:3000`. Versioned routes use the base URL
`http://localhost:3000/api/v1`. The older `/api/...` routes are also retained
for compatibility.

No `npm install` is required because the API uses Node.js built-in HTTP and Fetch APIs.

## Routes

| Method | Route | Authentication | Purpose |
|---|---|---|---|
| GET | `/api/v1/health` | None | Check whether the local API is running |
| POST | `/api/v1/auth/login` | None | Sign in and receive a Supabase access token |
| GET | `/api/v1/products` | None | List active products |
| GET | `/api/v1/products/:id` | None | Get one active product |
| POST | `/api/v1/products` | Bearer token | Create a product for the signed-in seller's farm |
| PATCH or PUT | `/api/v1/products/:id` | Bearer token | Update a product owned by the signed-in seller |
| DELETE | `/api/v1/products/:id` | Bearer token | Delete a product owned by the signed-in seller |

## Postman walkthrough

### 1. Health check

```http
GET http://localhost:3000/api/v1/health
```

### 2. Log in

```http
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json
```

```json
{
  "email": "your-seller@example.com",
  "password": "your-password"
}
```

The included Postman collection saves `access_token` automatically after a
successful login. Protected requests reuse it as a Bearer token, so you do not
have to paste the Supabase key or token into every request.

### 3. Get products

```http
GET http://localhost:3000/api/v1/products
```

Optional query parameters:

```text
?category=Vegetables
?search=tomato
?limit=20&offset=0
```

### 4. Create a product

```http
POST http://localhost:3000/api/v1/products
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

```json
{
  "name": "Roma Tomatoes",
  "description": "Freshly harvested tomatoes",
  "category": "Vegetables",
  "price": 80,
  "unit": "kg",
  "available_quantity": 25,
  "image_url": null
}
```

The API obtains `farm_id` from the authenticated account. If the account does
not have a farm yet, the API creates its default farm automatically. Do not add
`farm_id` manually.

### 5. Update a product

```http
PATCH http://localhost:3000/api/v1/products/PRODUCT_UUID
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

```json
{
  "price": 85,
  "available_quantity": 20
}
```

### 6. Delete a product

```http
DELETE http://localhost:3000/api/v1/products/PRODUCT_UUID
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Configuration

By default, the API reuses the browser's public Supabase URL and anon/publishable key. To keep separate server configuration, copy `.env.example` to `.env` and enter the public project values.

Never put a Supabase secret or service-role key in frontend files or Postman. This API deliberately uses the public key and the signed-in user's JWT so existing Row Level Security policies remain active.
