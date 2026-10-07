# LocalBites Local API

The local API is an additional Postman interface. The existing browser application continues to communicate with Supabase as before.

## Start the API

From the project directory, run:

```powershell
npm start
```

The server starts at `http://localhost:3000`.

No `npm install` is required because the API uses Node.js built-in HTTP and Fetch APIs.

## Routes

| Method | Route | Authentication | Purpose |
|---|---|---|---|
| GET | `/api/health` | None | Check whether the local API is running |
| POST | `/api/auth/login` | None | Sign in and receive a Supabase access token |
| GET | `/api/products` | None | List active products |
| GET | `/api/products/:id` | None | Get one active product |
| POST | `/api/products` | Bearer token | Create a product for the signed-in seller's farm |
| PATCH or PUT | `/api/products/:id` | Bearer token | Update a product owned by the signed-in seller |
| DELETE | `/api/products/:id` | Bearer token | Delete a product owned by the signed-in seller |

## Postman walkthrough

### 1. Health check

```http
GET http://localhost:3000/api/health
```

### 2. Log in

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json
```

```json
{
  "email": "your-seller@example.com",
  "password": "your-password"
}
```

Copy `access_token` from the response. In Postman, use **Authorization > Bearer Token** for protected requests.

### 3. Get products

```http
GET http://localhost:3000/api/products
```

Optional query parameters:

```text
?category=Vegetables
?search=tomato
?limit=20&offset=0
```

### 4. Create a product

```http
POST http://localhost:3000/api/products
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

The API obtains `farm_id` from the authenticated seller account. Do not add it manually.

### 5. Update a product

```http
PATCH http://localhost:3000/api/products/PRODUCT_UUID
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
DELETE http://localhost:3000/api/products/PRODUCT_UUID
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Configuration

By default, the API reuses the browser's public Supabase URL and anon/publishable key. To keep separate server configuration, copy `.env.example` to `.env` and enter the public project values.

Never put a Supabase secret or service-role key in frontend files or Postman. This API deliberately uses the public key and the signed-in user's JWT so existing Row Level Security policies remain active.
