# Seller Office image exports

Run from the checkout:

```sh
npm ci
npm run assets:seller
```

Prerequisites: Chromium (`CHROMIUM_PATH` overrides `/usr/bin/chromium`), Python 3 with Pillow, and curl with the environment's verified HTTPS/proxy configuration. No Samsung signing credentials are needed. The script does not change application files, add fabricated sermon data, publish the app, or capture a physical TV.

Outputs are in ignored `artifacts/seller-office-assets/`, with a downloadable `artifacts/ICBC-Samsung-Seller-Office-Assets.zip` containing the images, provenance, verification report and missing-asset notice. The script recreates only its named generated screenshots/background and preserves other user-supplied assets in that folder. The verifier uses conservative decimal byte limits (300,000 / 500,000), checks actual file signatures, dimensions and color modes, and verifies ZIP integrity.

| File                     | Dimensions / format | Limit        | Source                                                                        |
| ------------------------ | ------------------- | ------------ | ----------------------------------------------------------------------------- |
| background.jpg           | 1920×1080 RGB JPEG  | Under 300 KB | Existing app's computed teal/gold design background, rendered without content |
| 01-home.jpg              | 1920×1080 RGB JPEG  | Under 500 KB | Actual Chromium rendering of home screen                                      |
| 02-sermons.jpg           | 1920×1080 RGB JPEG  | Under 500 KB | Actual rendered archive focus state, when real catalog has sermons            |
| 03-exit-confirmation.jpg | 1920×1080 RGB JPEG  | Under 500 KB | Actual rendered exit dialog                                                   |
| transparent-logo.png     | 1920×1080 RGBA PNG  | Under 300 KB | **Not produced: official church logo source is missing**                      |
| full-color-icon.png      | 512×423 PNG         | Under 300 KB | **Not produced: official church logo source is missing**                      |

The original `assets/icon.png` is a 117×117 cross created as app artwork. README explicitly says it is not a supplied church logo. It appears in genuine app screenshots because it is part of the current application. It must not be repackaged as the official church logo. Supply the approved full-color logo as SVG or a high-resolution transparent PNG before preparing the two logo-dependent exports; do not trace, redraw or invent it.

## Screenshot provenance and scope

Playwright serves the unmodified local `index.html`, CSS, JavaScript and image files in memory under a same-origin preview path on the church media hostname. It does not write/publish files to that host. Catalog bytes are fetched at capture time from the real church endpoint using curl's TLS-verified proxy route and forwarded unchanged to the browser. This works around this cloud browser's network/trust routing limitations without disabling TLS verification or using sample catalog fixtures. The script follows real UI buttons/Back and captures the actual viewport with browser screenshots. No video/player screenshot is fabricated.

This capture harness does not demonstrate production widget CORS behavior, AVPlay, TV firmware or real-TV appearance. Browser previews and the existing app artwork are disclosed in `capture-provenance.json`; they are not physical Samsung TV screenshots. Native browser failure/empty states are captured honestly if the real catalog is unavailable. At least two screenshots must be captured for verification to pass. No guarantee of Seller Office acceptance is inferred from image-format verification.

The export set stays explicitly **partial** until the official logo-dependent images are available. `verification.json` records the files that passed, exact byte sizes, SHA256 hashes and missing files. This task does not provide an official church logo or a complete submission branding set.
