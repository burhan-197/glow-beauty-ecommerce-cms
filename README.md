# Glow Beauty CMS Lite

A free, deliberately simplified ecommerce CMS starter built with Node.js, Express, EJS and MongoDB.

## Included in Lite

- Basic admin setup/login
- Product add, edit and delete
- Categories
- One local product image
- Basic price and stock inventory
- Responsive storefront
- Product search/category filtering
- Browser cart
- Guest checkout
- Cash on delivery or manual payment order placement
- Admin order list/detail
- Basic order status updates
- Stock reduction on order and restoration on cancellation
- Automatic basic page titles/meta descriptions

## Not included

The Lite edition intentionally does **not** contain the premium CMS code for advanced theme customization, homepage building, customer accounts, Stripe/PayPal, coupons, bundles/routines, blog CMS, CSV tools, backup/restore, Cloudinary, SMTP/email, Google login, advanced SEO controls, advanced variants/inventory, analytics, or extra CMS settings.

If you publish this repository as the free edition, add your Gumroad/Lemon Squeezy full-version link here and in the repository description.

## Quick start

1. Install Node.js and MongoDB.
2. Copy `.env.example` to `.env`.
3. Set `SESSION_SECRET` to a long random value.
4. Run `npm install`.
5. Run `npm start`.
6. Open `http://localhost:3000/admin/setup` once to create the administrator.
7. Create at least one category, then add products.

For an internet-facing deployment, set `NODE_ENV=production`, use a hosted MongoDB database, use HTTPS, and set `ADMIN_SETUP_TOKEN` before first setup.

## Product images

Lite uses local uploads in `public/uploads`. JPG, PNG and WebP are accepted, one image per product, maximum 5 MB. Cloudinary is intentionally not included.

## Checkout

There are no customer accounts in Lite. Checkout is guest-only. Product prices and stock are re-checked on the server before an order is created.
