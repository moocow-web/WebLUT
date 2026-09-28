# WebLUT
Online, batch photo editor.

Run `npm start` to launch the editor and `npm run build` to create a production build in `dist/`.

RAW decoding uses threaded WebAssembly and requires cross-origin isolation. The Vite development and preview servers set the required headers. For static hosting, deploy the `dist/` directory and configure these response headers on every page:

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

The `public/_headers` file provides this configuration for hosts that support the `_headers` convention, such as Netlify and Cloudflare Pages.
