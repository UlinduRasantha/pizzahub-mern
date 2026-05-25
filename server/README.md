# 🍕 PizzaHub — Backend API (Clerk Auth)

Node.js + Express + MongoDB REST API using Clerk for authentication.

## Tech Stack

| Layer       | Technology                            |
|-------------|---------------------------------------|
| Runtime     | Node.js 20 LTS                        |
| Framework   | Express.js 4                          |
| Database    | MongoDB 7 via Mongoose 8              |
| Auth        | Clerk (@clerk/express)                |
| Real-time   | Socket.IO 4                           |
| Payments    | Stripe SDK                            |
| Email       | Nodemailer (SendGrid SMTP)            |
| Logging     | Winston                               |
| Testing     | Jest + Supertest + mongodb-memory-server |

## Quick Start

```bash
npm install
cp .env.example .env      # fill in MONGO_URI and CLERK_SECRET_KEY
npm run seed               # seeds 8 pizzas
npm run dev                # → http://localhost:5000
```

## Promote yourself to Admin

After signing in via the frontend for the first time:

1. Find your Clerk user ID in: Clerk Dashboard → Users → click your account
2. Run:
```bash
node promote-admin.js user_YOUR_CLERK_ID_HERE
```

## Environment Variables

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...   # from Clerk Dashboard → Webhooks
STRIPE_SECRET_KEY=sk_test_...
CLIENT_URL=http://localhost:5173
```

## API Reference

All endpoints prefixed `/api/v1`. Protected routes require a valid Clerk session token:
`Authorization: Bearer <Clerk session token>`

### Profile  `/api/v1/profile`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET    | /me      | Auth   | Get own profile (role, addresses) |
| PATCH  | /me      | Auth   | Update phone / addresses |

### Pizzas  `/api/v1/pizzas`
| Method | Endpoint        | Access | Description |
|--------|-----------------|--------|-------------|
| GET    | /               | Public | List all pizzas |
| GET    | /:id            | Public | Get single pizza |
| POST   | /               | Admin  | Create pizza |
| PATCH  | /:id            | Admin  | Update pizza |
| DELETE | /:id            | Admin  | Soft-delete pizza |
| POST   | /:id/reviews    | Auth   | Submit review |
| GET    | /:id/reviews    | Public | List reviews |

### Orders  `/api/v1/orders`
| Method | Endpoint         | Access         | Description |
|--------|------------------|----------------|-------------|
| POST   | /                | Auth           | Place order |
| GET    | /my              | Auth           | My orders |
| GET    | /:id             | Auth (owner/admin) | Single order |
| PATCH  | /:id/cancel      | Auth (owner)   | Cancel within 5 min |
| GET    | /                | Admin          | All orders |
| PATCH  | /:id/status      | Admin/Delivery | Update status |
| POST   | /:id/refund      | Admin          | Stripe refund |

### Users  `/api/v1/users`
| Method | Endpoint              | Access | Description |
|--------|-----------------------|--------|-------------|
| GET    | /                     | Admin  | List all users |
| GET    | /stats                | Admin  | Dashboard KPIs |
| GET    | /:id                  | Admin  | User + orders |
| PATCH  | /:id/toggle-active    | Admin  | Activate/deactivate |

### Webhooks
| Method | Endpoint          | Description |
|--------|-------------------|-------------|
| POST   | /webhooks/stripe  | Stripe events |
| POST   | /webhooks/clerk   | User created/deleted sync |

## Running Tests

```bash
npm test
# Clerk is mocked — no real Clerk keys needed for tests
# Tests: 3 suites, ~15 tests
```
