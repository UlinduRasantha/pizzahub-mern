# 🍕 PizzaHub — Frontend (Clerk Auth)

React SPA for the PizzaHub pizza ordering platform, using Clerk for authentication.

## Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Framework   | React 18 + Vite                   |
| Auth        | Clerk (@clerk/clerk-react)        |
| Routing     | React Router v6                   |
| State       | Redux Toolkit                     |
| Data fetch  | TanStack React Query v5           |
| Forms       | React Hook Form + Yup             |
| Animation   | Framer Motion                     |
| Styling     | Tailwind CSS v3                   |
| HTTP client | Axios (Clerk token injected)      |
| Toasts      | react-hot-toast                   |
| Icons       | lucide-react                      |

## Quick Start

```bash
npm install
cp .env.example .env
# Fill in VITE_CLERK_PUBLISHABLE_KEY from clerk.com dashboard
npm run dev
# → http://localhost:5173
```

## Environment Variables

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

## How Auth Works

1. **Clerk handles everything** — sign up, sign in, OAuth (Google/GitHub),
   profile, avatar, password reset, MFA, sessions.
2. On sign-in, `App.jsx` calls `fetchProfile()` which hits `GET /api/v1/profile/me`
   and stores the user's **role** (customer/admin) and **addresses** in Redux.
3. Every Axios request automatically gets a Clerk session token injected via
   the `setClerkGetToken` interceptor wired in `App.jsx`.
4. `PrivateRoute` uses Clerk's `useAuth()` hook — redirects to `/sign-in` if not authenticated.
5. `AdminRoute` checks Clerk auth + Redux role (`isAdmin`).

## Clerk Setup (clerk.com)

1. Create a new application
2. Enable **Email/Password**, **Google**, **GitHub** under Social Connections
3. Copy the **Publishable Key** into `.env`
4. *(Optional)* Add `/sign-in` and `/sign-up` as allowed redirect URLs

## Pages & Routes

| Route          | Access     | Page                  |
|----------------|------------|-----------------------|
| `/`            | Public     | Home                  |
| `/menu`        | Public     | Menu                  |
| `/menu/:id`    | Public     | Pizza Detail          |
| `/cart`        | Public     | Cart                  |
| `/sign-in`     | Public     | Clerk Sign In         |
| `/sign-up`     | Public     | Clerk Sign Up         |
| `/checkout`    | Auth only  | Checkout              |
| `/orders`      | Auth only  | Order History         |
| `/orders/:id`  | Auth only  | Order Detail          |
| `/admin`       | Admin only | Admin Dashboard       |
