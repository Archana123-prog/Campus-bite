# CampusBite — College Canteen Ordering & Hostel Delivery

Customers (hostelers, day scholars, staff) order from their phone for **hostel delivery**, **dine-in at a table (QR)** or **pickup**.
The canteen runs everything from a live kitchen board. Delivery runners accept and complete hostel deliveries.

```
campusbite/
├── backend/    Node.js · Express · Prisma · NeonDB (PostgreSQL) · Socket.io
└── frontend/   React 18 · Vite · Tailwind · Zustand · Framer Motion
```

## 1. Keys you need to fill in

### `backend/.env`
| Key | Required | What to put |
|---|---|---|
| `DATABASE_URL` | yes | NeonDB **pooled** connection string (host contains `-pooler`). Neon dashboard → Connect → *Pooled connection*. |
| `DIRECT_URL` | yes | NeonDB **direct** connection string (same, without `-pooler`). Used by Prisma to create tables. |
| `JWT_SECRET` | yes | Any long random string. Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CLIENT_URL` | yes | Frontend address allowed by CORS. Dev: `http://localhost:5173`. Production: your site URL (comma-separate several). |
| `PORT` | no | Default `5000` |
| `JWT_EXPIRES_IN` | no | Default `7d` |
| `DELIVERY_FEE` | no | Hostel delivery fee in ₹. Default `10` |
| `TABLE_COUNT` | no | Number of canteen tables (for printing QR stickers). Default `20` |
| `HOSTEL_BLOCKS` | no | Comma-separated hostel names shown in the dropdown |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | no | Admin account created by the seed script |
| `RUNNER_EMAIL` / `RUNNER_PASSWORD` / `RUNNER_NAME` | no | Delivery-runner account created by the seed script |

### `frontend/.env`
| Key | Required | What to put |
|---|---|---|
| `VITE_API_URL` | production only | Backend URL, e.g. `https://campusbite-api.onrender.com`. **Leave empty in development** (Vite proxies to `localhost:5000`). |

No payment-gateway or map keys are needed. Payment is Cash/UPI collected on handover.

## 2. Run it

```bash
# Terminal 1 — backend
cd backend
npm install            # also runs `prisma generate`
npm run db:push        # creates the tables in NeonDB
npm run db:seed        # admin + runner accounts, categories, sample dishes
npm run dev            # http://localhost:5000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev            # http://localhost:5173
```

Default logins (change them in `backend/.env` before seeding):
- Admin: `admin@campus.edu` / `Admin@12345`  → opens the kitchen board
- Runner: `runner@campus.edu` / `Runner@12345` → opens the deliveries page
- Customers sign up on `/register`.

## 3. How it works

| Who | Where | What |
|---|---|---|
| Customer | `/` | Swipe card stack of featured dishes (swipe right = add to cart) |
| Customer | `/menu` | Search, category + veg filters, live sold-out status |
| Customer | cart drawer | Choose Hostel / Table / Pickup, payment, kitchen note |
| Customer | `/track/:id`, `/orders` | Live order timeline, cancel while still "received" |
| Admin | `/admin` | Live kitchen board (sound alert), overview stats, menu & stock, table QR stickers, staff accounts |
| Runner | `/delivery` | Accept ready hostel orders, mark delivered |

Order flow: `PENDING → PREPARING → READY → (OUT_FOR_DELIVERY) → SERVED`, enforced on the server.
Prices and the delivery fee are always calculated on the server, never trusted from the browser.

Table QR: Admin → *Table QR*. Set the **public website address** first (not `localhost`), then download a PNG or print all tables.

## 4. API summary (`/api/v1`)

- `POST /auth/register`, `POST /auth/login`, `GET|PUT /auth/me`
- `GET /config`, `GET /menu`, `/menu/featured`, `/menu/categories`, `/menu/:id`
- `PATCH /menu/:id/toggle-stock`, `/toggle-featured` (admin)
- `POST /orders`, `GET /orders`, `GET /orders/:id`, `PATCH /orders/:id/cancel`, `/status` (admin), `/payment` (admin)
- `GET /delivery/queue`, `POST /delivery/:id/accept`, `/complete` (runner/admin)
- `GET /admin/stats`; `POST|PUT|DELETE /admin/categories`, `/admin/menu-items`; `GET|POST|DELETE /admin/staff`

Socket.io events: `kds_new_order`, `order_updated`, `menu_updated`. Clients join rooms with `join_kitchen`, `join_delivery`, `track_order`. The server checks the JWT before allowing any room.

## 5. Deploying

- **Backend** (Render / Railway / any Node host): root `backend`, build `npm install`, start `npm start`. Set all env keys. Run `npm run db:push` and `npm run db:seed` once.
- **Frontend** (Vercel / Netlify): root `frontend`, build `npm run build`, output `dist`. Set `VITE_API_URL` to the backend URL. Add a rewrite of all paths to `/index.html` (single-page app).
- Set the backend's `CLIENT_URL` to the deployed frontend URL.

## 6. Good to know

- Dish photos in the seed are Unsplash links; any that fail show an emoji placeholder. Admins can paste their own image URL per dish.
- Socket.io rooms live in memory, so run **one** backend instance (fine for a single canteen).
- Changing the Prisma schema later: `npm run db:push` (quick) or `npm run db:migrate` (tracked migrations).
