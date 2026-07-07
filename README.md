# KINO Studio static site

This folder is a cleaned static export of the original Weebly site.

## Deploy

Upload the contents of this folder to any static hosting service:

- Netlify: drag this folder into Netlify Deploys, or connect a Git repo.
- Cloudflare Pages: set the build command to empty and the output directory to `/`.
- Vercel: import as a static project; no build command is required.
- Traditional hosting: upload all files to `public_html` or the web root.

## Notes

- YouTube, Vimeo, Flickr, Facebook, Instagram, Canva, and Google Analytics remain external embeds or links.
- The Weebly footer and customer-account scripts were removed.
- Preview the site through a local web server or a deployed HTTPS URL. Opening HTML files directly from the file system can prevent external embeds from receiving a normal page origin.
- `index.html` is the home page.
