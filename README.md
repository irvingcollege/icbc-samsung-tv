# Irving College Baptist Church TV

A Samsung Tizen web app for Irving College Baptist Church in Warren County, Tennessee. **A Place of Hope for Warren County.** HTML, CSS and vanilla JavaScript provide the interface; Samsung AVPlay handles HLS live streams and archived MP4s on TVs. Browser playback uses HTML video, with bundled HLS.js loaded on demand for browsers without native HLS. No login or backend is required.

## Develop and check

Use Node.js 20 or newer and Chromium. From the checkout:

```sh
npm ci
npm run check
npm test
npm run build
npm run package:unsigned
npm start
```

The local development server listens on port 8080. Tests use `/usr/bin/chromium`; set `CHROMIUM_PATH` to another Chromium executable if necessary. `npm test` runs catalog validation, Samsung adapter tests with an AVPlay mock, and headless browser navigation/error/MP4 playback checks. A tiny synthetic video fixture makes playback tests independent of church availability. Browser and mocked adapter checks do **not** establish physical Samsung TV compatibility.

`npm run build` stages the production allowlist in ignored `dist/`. The app has no production npm dependencies or bundling step. Package `index.html`, `config.xml`, `css/`, `js/`, and `assets/`. Keep npm dependencies, tests and development scripts out of the widget.

## Content contract

Live HLS: `https://live.irvingcollege.church/hls/stream.m3u8`

Catalog: `https://live.irvingcollege.church/sermons/catalog.json`

A catalog may be an array, `{ "sermons": [...] }`, or `{ "items": [...] }`. Example:

```json
{
  "sermons": [
    {
      "id": "2026-10-11",
      "title": "A Place of Hope",
      "speaker": "Pastor",
      "date": "2026-10-11",
      "file": "2026-10-11.mp4"
    }
  ]
}
```

`title`/`name`, `speaker`/`preacher`, and `date` are display fields. The media field may be `url`, `videoUrl`, `video_url`, `video`, `file`, `filename`, or `src`. Relative media paths resolve under `https://live.irvingcollege.church/sermons/`. Absolute HTTPS MP4 or HLS URLs on the same host are accepted, including query strings. Other hosts/protocols and malformed records are rejected. Catalog order is retained so the server can curate it; publish newest first. Titles are inserted as text, never HTML. Invalid JSON, unsupported schema, empty results, HTTP errors, timeouts and failed playback have recovery messages. Refresh reloads the archive; Retry reconnects the current video. Existing sermons remain accessible when a refresh fails.

The real catalog schema and production media could not be inspected from the cloud instance because the host was denied by its network proxy. Confirm the schema against the contract above before release. If production media uses a CDN hostname, explicitly add that trusted host to the URL validator, CSP, `config.xml` access policy and cloud networking policy.

## Network and playback compatibility

The server must return a valid HTTPS certificate, `application/json` for the catalog, an HLS MIME type (such as `application/vnd.apple.mpegurl`) for manifests, and `video/mp4` for MP4s. Serve byte ranges (`Accept-Ranges: bytes`, HTTP 206) for seekable MP4s; encode H.264 video/AAC audio and use MP4 fast-start for broad TV support. HLS segments, variant playlists, encryption keys and redirects must also be reachable over HTTPS. Avoid codecs unsupported by the target TV models.

Browser catalog/HLS requests need server-side CORS headers. For public church media, `Access-Control-Allow-Origin: *` is appropriate without credentials. Permit GET/HEAD and, if preflight is used, Range; expose Content-Length, Content-Range and Accept-Ranges. Set headers consistently on playlists, segments, MP4s, JSON and error responses. Samsung widget access declarations and CSP do not bypass server CORS. Do not work around errors by disabling TLS or browser security. Inspect server CORS and TV logs instead. Native AVPlay may behave differently from browser fetch, so test both paths.

Samsung TV playback uses its built-in AVPlay; it does not load HLS.js. The browser fallback loads the bundled `assets/vendor/hls.min.js` (HLS.js 1.6.13, Apache-2.0 license included) on first live playback. No remote JavaScript CDN is needed. The locked npm package is used only to verify/refresh the vendored bundle during development; production includes the file itself.

## Remote controls and lifecycle

- Arrows move between visible buttons using their screen positions; OK/Select activates a button.
- Back (`10009`, Escape in browsers) closes playback and restores focus. From the archive it returns to the top; from home it asks before exiting.
- Play, Pause, Play/Pause, Stop, Rewind and Fast Forward are registered on Samsung. Archived videos support 30-second seeking; live seek buttons are disabled.
- Player buttons provide the same controls for remotes without dedicated media keys.
- Leaving the app pauses playback; closing the player releases media resources. Returning after suspension requires selecting Play.

Service times are Central Time: Sunday School 9:30 AM, Sunday Worship 10:30 AM, Wednesday Meal 5:30 PM and Bible Study 6:30 PM. The cross icon and gold/teal identity are original app artwork, not a supplied church logo.

## Tizen Studio / simulator / TV

1. Install Tizen Studio with Web App Development, Samsung TV Extension, and Samsung Certificate Extension. Select a Samsung TV target supported by your SDK. The widget minimum is Tizen 4.0; validate every model group you intend to distribute to.
2. Import this directory as a Tizen web project (or create a TV web project and replace its web content with the production files above). Confirm the `tv-samsung` profile and Internet and TV input-device privileges in `config.xml`.
3. In Certificate Manager create a **Samsung** certificate profile using your Samsung account. Keep author/distributor certificates and passwords private and backed up outside Git. Add physical device DUIDs to the distributor certificate when installing on a TV. Never commit signing keys.
4. Run the project in a Samsung TV emulator/simulator. Verify home layout at 1920×1080, focus rings, every arrow path, Back/exit confirmation, service times, long archive titles and scrolling. A simulator without native AVPlay exercises the browser fallback only.
5. For a TV, enable Developer Mode in Apps, enter the development computer's IP, reboot, connect through Tizen Device Manager (commonly port 26101), and authorize package installation with your certificate. Use the SDK's documented device connection flow for that model. Run/install the signed widget through Tizen Studio.
6. Test live HLS during an actual broadcast, offline live behavior, real catalog, MP4 playback/pause/seek/end, network loss/recovery, repeated open/close, remote media keys, Back on every screen, suspend/resume and app exit. Check logs for AVPlay errors and CORS failures. Record model, firmware and test results; this repository makes no physical-TV test claim.

For automated validation, SDK signing, dedicated-runner configuration and the full device/store checklist, follow [the distribution runbook](docs/distribution.md). With the SDK installed and a Samsung profile registered securely on the release machine:

```sh
TIZEN_SECURITY_PROFILE=ICBC-TV npm run package:tizen
```

This creates `artifacts/icbc-tv-1.0.0.wgt` only after a successful SDK build/sign operation and archive checks. Without the SDK/profile, it fails rather than fabricating a signed widget. For an unsigned development archive without SDK or credentials, run `npm run package:unsigned`; output is `artifacts/icbc-tv-1.0.0-unsigned.wgt`. It is not a signed TV-installation or store-submission artifact. Normal GitHub CI uploads production files and the separately labeled unsigned widget; the manual signed-widget workflow requires a trusted, preconfigured Samsung signing runner.

## Samsung Seller Office submission

1. Register at Samsung TV Seller Office with the church's authorized account. Create the application and select appropriate countries, languages and model groups.
2. Build/sign a release widget using the approved Samsung certificate profile. Confirm app/package identifiers in `config.xml`; retain them and the author certificate for future updates. Increase the widget version for each release.
3. Prepare the required icon sizes, TV screenshots, description, support contact, content rights declarations, age rating and privacy policy. The app does not collect or store user data; streaming hosts still receive normal network requests and may log IP addresses. The church should disclose actual server logging accurately in its policy. Follow the portal's current asset requirements; `assets/icon.png` is the widget icon, not a complete Seller Office marketing asset set.
4. Upload the signed widget, fill in playback/network requirements and reviewer instructions, and submit for Samsung certification. Include working live availability windows or an accessible archived sermon so reviewers can exercise playback. Complete the physical-device checklist first and resolve certification issues before release.

Publication requires the church's Samsung account, certificates, release assets and approval; none have been supplied or submitted by this project.

## Future LG webOS adaptation

`js/platform.js` owns media playback, remote registration and application exit. Keep the catalog/UI unchanged and supply a webOS adapter exposing `init`, `open`, `toggle`, `pause`, `resume`, `seek`, `close` and `exit` with the same event callbacks. Add LG key codes and `appinfo.json`, replace the Samsung `<object>`/SDK script, and validate LG native video and lifecycle behavior. The current package is Samsung Tizen only.

## Official SDK checks in the cloud

The official SDK 10 CLI is installed outside the checkout. `npm run setup:tizen` reproduces its checksum-verified headless installation; `npm run check:sdk` validates against its official generic widget and Tizen schemas (Python lxml required). SDK web building and emulator-only test signing have succeeded; Official Samsung TV schema/privilege validation now passes for targets 4.0 and 10.0; full IDE installation, release signing and hardware testing remain outstanding. Run `npm run setup:samsung-tv`, `npm run check:samsung-tv` and `npm run test:samsung-tv` for the checksum-verified resource checks. See the [current installation results](docs/distribution.md#current-linux-sdk-installation-result) before treating any artifact as a distribution release.
