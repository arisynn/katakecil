# Vendored image codecs

WASM from @jsquash/png 3.1.1 and @jsquash/webp 1.5.0, repackaged from Google Squoosh by Jamie Sinclair. Apache-2.0; see LICENSE. Codec licenses are preserved below.

Upstream: https://github.com/jamsinclair/jSquash

SHA-256 of unencoded modules:

{
  "png": "263d6e658808a74b72a1a99c5cc1d619237e70c150db6e41d5d84d3d117ab9be",
  "webp": "b6085bb6702f144e9dc6016d58d230b34a84976bf0d080b7390b4b4b137d6ab7",
  "webpSimd": "39c279269ec1163b987b6d69749458e3d5b03b9585f58b6ca5455b76b504a305"
}

Rebuild with npm ci then node scripts/vendor-cover-codecs.mjs. These modules are imported only by the server endpoint, never by the web app.
