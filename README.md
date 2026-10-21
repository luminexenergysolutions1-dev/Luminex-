# Luminex Energy Solutions — static website

This folder contains a plain HTML, CSS and JavaScript version of the supplied website project.

## Files
- `index.html` — homepage
- `about.html`, `services.html`, `projects.html`, `contact.html`, `quote.html` — separate pages
- `css/style.css` — responsive design and styling
- `js/main.js` — page content, mobile navigation and enquiry form behavior
- `images/` — supplied image assets
- `favicon.svg` — site icon

## Preview
Open `index.html` in a browser, or use a local static server (recommended). No Node/npm build is required for this static version.

## Important before publishing
1. Replace the placeholder telephone number and confirm the correct business email in `contact.html` and `js/main.js`.
2. The quote form opens the visitor's email application; it does not store or transmit enquiries to a database.
3. The original uploaded project includes a React/TypeScript app and Supabase admin/database functionality. This static conversion preserves the public-facing page structure and images, but does not convert the secure admin dashboard or database integration into a working static system. Keep the original project if you need those features.
