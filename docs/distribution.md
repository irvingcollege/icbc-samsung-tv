# Samsung TV distribution runbook

## What is ready, and what is still external

The app targets Samsung Tizen **4.0+**, landscape **1920×1080**. `config.xml` retains package `ICBCTV2026`, application `ICBCTV2026.ICBCTV`, and widget version `1.0.0`. Keep the package/application IDs and author signing identity stable for updates; bump `config.xml` and `package.json` versions together for the next uploaded version. Do not adopt a new author certificate for an existing distributed application without Samsung's supported migration procedure.

`npm run check` validates XML well-formedness, project manifest constraints, icon dimensions, packaged resource paths, version agreement, public Internet/input-device declarations, and ES5 parsing of runtime JavaScript. It is a project-specific validator, **not** Samsung's complete schema validator or store certification. The browser HLS fallback and its license are bundled locally, so production no longer loads code from a CDN. The screen-size metadata explicitly requests the 1920×1080 coordinate system used by AVPlay. Controls register optional media keys; arrows, Enter and Return work without key registration. AVPlay handles native HLS and MP4, keeps pause requests while loading, ignores stale callbacks after closing, and closes even if Stop fails. The layout uses flexbox with margins, explicit positioning edges and rgba colors instead of newer grid, flex-gap, inset and alpha-hex CSS features. Tests cover these contracts using mocks and browser fixtures; the minimum TV engine itself is not available here.

The cloud machine now has the official **Tizen SDK 10.0 Web CLI**, reporting **Tizen CLI 2.5.25**, installed at `/workspace/tizen-user-data/tizen-sdk-10`. The official SDK 10 web build succeeds. The manifest passes both the official generic widget XSD and each Tizen extension element's XSD. Official CLI packaging succeeds with the SDK's built-in **emulator-only test certificate**, without private credentials. The resulting `artifacts/icbc-tv-1.0.0-sdk-emulator-only.wgt` passes archive/signature-structure checks; it is **not** signed for Samsung physical TVs or Seller Office. No emulator execution, physical-TV playback, release signing or Seller Office submission has been performed.

The official Samsung TV Extension 10.0 image has now downloaded successfully. Its checksum-verified web add-on validation resources are installed separately from the SDK, and Samsung-specific schema/privilege checks pass for TV 4.0 and 10.0. Full Package Manager/IDE installation is still blocked by a DNS preflight in this proxy-only environment. Resource validation does not establish emulator or physical-TV operation, certificate trust, or Samsung certification.

## Unsigned development package in the cloud

No Samsung credentials or SDK are needed to create the unsigned development archive:

```sh
npm ci
npm run check
npm test
npm run package:unsigned
```

Output: `artifacts/icbc-tv-1.0.0-unsigned.wgt`. This is a ZIP-format W3C/Tizen widget archive with `config.xml` and production resources at its root, **without** `author-signature.xml` or `signature1.xml`. The script validates its CRCs, manifest, required files and production allowlist, and fixes entry timestamps for repeatable output. Tests confirm two builds produce identical bytes in this environment and that the release validator rejects the unsigned file. It is useful for inspecting or handing off the package contents; it is not a signed, SDK-certified or TV-installable release. Samsung signing is required for physical-TV installation and Seller Office submission, rather than merely creating the archive file. No claim is made that an SDK simulator accepts this unsigned archive.

Hosted GitHub CI now uploads `icbc-unsigned-development-widget` alongside the production-files artifact. This does not need a self-hosted runner or signing profile. The signed workflow explicitly excludes unsigned artifacts.

### Current Linux SDK installation result

Official downloads now work on `download.tizen.org`. The headless SDK 10.0 CLI installer was fetched from the official HTTPS index, its embedded vendor MD5 checksum checked, and its whole-file SHA256 pinned for repeatable installation. The SDK's bundled Java is used. The original installer shell wrapper requires a writable `$HOME/.package-manager`; this environment's home is mounted read-only even after a filesystem grant. The same unmodified Java installer is therefore launched with `-Duser.home` pointing to writable SDK storage, leaving the shell HOME unchanged. Installation remains outside the application checkout and preserves verification.

```sh
npm run setup:tizen
export TIZEN_CLI=/workspace/tizen-user-data/tizen-sdk-10/tools/ide/bin/tizen
npm run check:sdk
npm run build
"$TIZEN_CLI" build-web --output /tmp/icbc-official-build -- dist
```

`setup:tizen` requires Linux x86_64 and Python 3.12+. It accepts the standard Tizen SDK license as part of the requested installation. It checks the pinned SHA256 and vendor payload MD5 before extraction, uses the included JDK and invokes the official installer. It supports `python3 scripts/setup-tizen-linux.py --root /your/writable/path`. Existing installations are reused. `check:sdk` uses Python `lxml` (6.1.1 is already available here); on a separate Linux machine install it in a virtual environment if absent. Set `TIZEN_SDK_PATH` for a nondefault SDK location. It loads only local official schemas, with remote retrieval/DTD expansion disabled. The check validates schema syntax, not privilege authorization or codec/device support.

Tizen Studio 6.1's CLI was also investigated: its web build failed with missing `org/eclipse/core/runtime/Plugin`. The newer official SDK 10 package resolves that build failure without changes to application code. The Web IDE GUI installer requires GTK/display support and is unnecessary for the working headless build.

To make a **local SDK test-signed package** from a successful build:

```sh
mkdir -p /tmp/icbc-sdk-test-package
"$TIZEN_CLI" package -t wgt -o /tmp/icbc-sdk-test-package -- /tmp/icbc-official-build
```

On this clean SDK installation, omitting `-s` selects the bundled emulator-only test profile; the CLI explicitly warns about that limit. On another installation it can select a configured default profile, so inspect the CLI's profile warning rather than assuming it is test-signed. Use the explicit Samsung profile through `npm run package:tizen` for release packaging. Test-profile widgets must never be uploaded as Samsung releases.

### Samsung TV validation resources and installation outcome

The official Ubuntu TV Extension 10.0 download now succeeds through `d13643hualop71.cloudfront.net`. The web add-ons package inside the official image is SHA256 `c8e9d498504f29e8bf9320dab9e1cf89268e95eee65ff56c8d65a01fa0315086`, matching Samsung's `pkg_list_ubuntu-64` manifest. `setup:samsung-tv` checks the pinned vendor checksum and ZIP integrity, installs the unchanged resources outside the checkout, and caches the small verified web-add-ons bundle for repeat setup without redownloading the entire emulator image.

```sh
npm run setup:samsung-tv
npm run check:samsung-tv
npm run test:samsung-tv
```

The default resource root is `/workspace/tizen-user-data/samsung-tv10-resources`; scripts accept `--root` or `--resources` overrides. For an already downloaded official image, use `python3 scripts/setup-samsung-tv.py --image /path/to/image.zip`. Python lxml is required for validation and is available in this environment.

The app's `config.xml` now passes the official **Samsung TV** widget and Tizen extension XSDs from the TV 4.0 and TV 10.0 resource directories. Declared native permissions are checked against the minimum target's TV catalog; Samsung permissions are checked against each target's Samsung catalog and restricted privilege levels are rejected. These are static schema/catalog checks, not API runtime authorization or Seller Office certification.

This audit removed `http://developer.samsung.com/privilege/avplay`: it is absent from Samsung's privilege catalogs, and ordinary AVPlay use does not require it. Internet and `tv.inputdevice` are retained as public TV permissions. Samsung's AVPlay reference associates `drmplay` with protected DRM operations; this app does not use those operations, so no DRM/partner privilege is added. Remote registration, key codes, playback and lifecycle contracts are exercised by existing browser/mock tests. The three TV validation tests check the current manifest and reject unregistered AVPlay and partner-only permissions.

A complete Package Manager install was attempted by registering the official offline image using `extra --add`, then installing `TV-SAMSUNG-Public-WebAppDevelopment`. The manager's network preflight calls native DNS for `download.tizen.org` **before using the proxy** and fails with `java.net.UnknownHostException: download.tizen.org: Temporary failure in name resolution`. Explicit manager proxy configuration and standard JVM proxy options did not resolve this preflight. Normal HTTPS downloads through the proxy work; adding more download domains will not repair this DNS requirement. No TLS/checksum verification was disabled. The full component also depends on Web IDE packages. No installed-package registry was fabricated, and the extracted validation resources are not described as a fully installed IDE.

The simplest way to complete the IDE/certificate wizard is a trusted Linux workstation or runner with working native DNS and the supported Tizen Studio GUI dependencies, or a platform fix for the manager's DNS preflight. A Mac install is not required. The headless SDK build/package steps already work here. There is no `/dev/kvm` in this machine, and no Samsung emulator runtime or physical TV has been exercised.

### Minimum personal actions for a signed release

There is no need to install anything on a Mac to obtain the unsigned package. A signed release can also be prepared on a trusted Linux workstation/cloud runner (or Windows), so Mac installation is not inherently required.

1. For a complete IDE/certificate wizard, use a trusted supported Linux machine with normal DNS/GUI support, or have the cloud platform resolve Package Manager's native DNS preflight. Official downloads and Samsung TV resource validation already work; no further allowlist change is established as necessary.
2. Use the church's authorized Samsung account to complete the Samsung TV author/distributor certificate wizard on a trusted machine with Certificate Manager. Keep the author certificate and its password private and securely backed up; the wizard may require personal account verification and acceptance of Samsung terms. A trusted operator can set up the Linux runner/toolchain for you; you need not send keys/passwords to this chat or repository.
3. Keep that profile on the signing machine, set only `TIZEN_SECURITY_PROFILE` to its profile name, and run `npm run package:tizen` (or the manual GitHub workflow). Add a test TV's DUID to the distributor certificate and authorize installation for physical-device testing. Complete the real-TV checklist before submitting through the authorized Seller Office account.

The full IDE's DNS prerequisite and the absent Samsung release-signing profile are separate prerequisites. This task cannot issue Samsung certificates, sign for the church, authorize a test TV, or publish to Seller Office without those operator/account actions.

## 1. Install the Samsung tooling

On the release workstation (or a dedicated Linux runner):

1. Install Tizen Studio from the official Tizen site, including its prerequisites for your OS.
2. In Package Manager install **Web App Development**, the **Samsung TV Extension** for the TV target you will test, and **Samsung Certificate Extension** under Extension SDK. Current names/version choices may differ by SDK release.
3. Open Tizen Studio and Certificate Manager and confirm that Samsung TV projects and the Samsung certificate wizard are available. A generic Tizen certificate is not a replacement for the Samsung TV signing profile.
4. Add Tizen Studio's `tools/ide/bin` directory to your PATH, or set `TIZEN_CLI` to the full executable path (`tizen` on Linux/macOS). Run `tizen version`, `tizen build-web --help`, and `tizen package --help` to confirm the installed CLI and options.
5. Install Node 20+ and Chromium/Chrome. Run `npm ci`, `npm run check`, and `npm test` in this checkout. Set `CHROMIUM_PATH` if the browser is not at `/usr/bin/chromium`.

Official references (consult the current pages for SDK/portal UI changes):

- [Samsung TV prerequisites](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html)
- [Samsung certificate creation](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html)
- [Tizen CLI](https://docs.tizen.org/application/tizen-studio/common-tools/command-line-interface/)
- [Samsung AVPlay API](https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/avplay-api.html)
- [Samsung remote controls](https://developer.samsung.com/smarttv/develop/guides/user-interaction/remote-control.html)
- [TV Seller Office](https://seller.samsungapps.com/tv)

These documentation hosts were unavailable to this cloud instance; the steps use the established Studio/CLI flow, and have not been executed against an installed TV SDK here.

## 2. Create the Samsung author/distributor profile

For the shortest current route, use the [VS Code Samsung certificate wizard and secure signing handoff](release-signing-next-step.md). The Studio Certificate Manager flow below remains an alternative.

Do this interactively on your trusted workstation; no password or private key needs to be shared with this repository or the chat.

1. Open **Tools → Certificate Manager** in Tizen Studio. Choose **+**, **Samsung**, then **TV** as the device type. Choose a descriptive profile name, for example `ICBC-TV`.
2. At the author-certificate step choose **Create a new author certificate** for the first release, or select the existing author certificate for an update. Enter the church's author/contact information and protect the certificate with a strong password in the wizard. Sign in to the authorized Samsung account when prompted. Account authentication is handled by Samsung's wizard/browser.
3. Complete the distributor-certificate step. Select the **Public** privilege level for this app; it does not need partner/platform APIs. For development installation, add each test television's **DUID**. Retrieve it through Tizen Device Manager after connecting the TV; the wizard can select connected devices where supported.
4. Finish the wizard and select the resulting profile as active. The profile must contain both author and Samsung distributor certificates. Use Certificate Manager to register/import an existing profile if it was created elsewhere.
5. Back up the author certificate securely and retain its identity for future updates. Certificate Manager's profile metadata may also contain sensitive information: keep the entire certificate/profile store outside the checkout. Grant access only to the signing operator/runner user. `.p12`, `.pfx` and `profiles.xml` are ignored as a second guard, not a place to store keys.
6. For another release machine, import the certificates/profile through Certificate Manager's supported flow. Do not add passwords to shell commands, commit them, embed them in workflow YAML, or print certificate/profile files. A securely preconfigured profile lets the CLI refer only to its **name**.

Device installation requires an appropriate Samsung distributor certificate containing that device's DUID and the SDK's **Permit to install applications** authorization. Store review/distribution still requires Samsung's own validation; local signing does not grant publication rights.

## 3. Build and sign a widget locally

From the checkout, with a preconfigured Samsung profile:

```sh
npm ci
npm run check
npm test
TIZEN_SECURITY_PROFILE=ICBC-TV npm run package:tizen
```

If the CLI is not on PATH, set `TIZEN_CLI` to its executable path in the same process. `TIZEN_SECURITY_PROFILE` contains only a profile name, never a password. The Node packager invokes commands without a shell, using these SDK operations:

```text
tizen build-web --output <temporary-build-directory> -- <checkout>/dist
tizen package -t wgt -s <profile-name> -o <temporary-package-directory> -- <temporary-build-directory>
```

The workflow validates first, recreates the **generated** `dist/` from the production allowlist, builds/signs in a new temporary directory, and only then copies the current widget to `artifacts/icbc-tv-1.0.0.wgt`. It excludes dependencies, tests, documents, Git metadata and certificate files from production. An old `.wgt` is never treated as the output of a failed current run. Temporary build files are removed on completion. Previous successful release artifacts are preserved on failure; do not upload them as a new build.

The packager rejects failed SDK commands, absent/multiple widgets, unexpected archive files, damaged ZIP entries, missing runtime files, and missing author/distributor XML signature structures. These are structural checks: **they do not cryptographically validate certificate trust or replace Samsung SDK/device/store signature validation**. The SDK supplies the actual signatures. The separate `package:unsigned` command creates only a clearly labeled development archive; it does not bypass these signed-release checks. No unsigned ZIP is marketed as a release widget. Without the CLI and configured profile, packaging fails with a nonzero status and a precise prerequisite message.

## 4. Automated GitHub builds

`.github/workflows/ci.yml` runs on pushes to `main` and pull requests. It installs locked dependencies, validates the manifest/ES5 runtime, runs all tests using hosted Chrome, and uploads `dist/` as **production files**, plus a separately labeled unsigned development widget, not a signed release. GitHub Actions must be enabled for the repository. A local test pass does not establish that a hosted workflow has run.

`.github/workflows/package.yml` is a **manual workflow_dispatch** release build. Before invoking it:

1. Register a dedicated **Linux self-hosted runner** with labels `tizen` and `samsung-signing`. Install the SDK/extensions and preconfigure the Samsung certificate profile under the same OS user running the agent. Restrict the runner to this repository/trusted release jobs.
2. In repository **Settings → Environments**, create `samsung-release`; restrict allowed branches to `main` and configure required reviewers if your GitHub plan supports them. Keep signing runners away from pull-request workflows and untrusted branches.
3. Set environment **variables**, not key/password values: `TIZEN_SECURITY_PROFILE=ICBC-TV`; optionally `TIZEN_CLI` (absolute CLI executable path) and `CHROMIUM_PATH` (browser executable). Empty optional variables use the script defaults.
4. In **Actions → Signed Samsung widget → Run workflow**, select `main`. Approve the environment job if review is configured.
5. Download the `icbc-signed-widget-<run-id>` artifact after the successful job. It contains only the newly validated `.wgt`; signing certificates/profile stores are never uploaded. Inspect the job result and test the package on the TV before submitting it.

No runner is provisioned by this workflow. Without one with these labels, the job waits for a runner. No account login, signing password, key upload or automatic store submission is part of the GitHub workflow. Credentials stay in the trusted runner's local Samsung certificate store. Signing readiness and any required profile unlocking must be arranged by its operator through the SDK's secure mechanisms.

## 5. Install and test the signed widget

1. On a supported Samsung TV open **Apps**, enable Developer Mode (many models use remote digits `12345` on the Apps screen), enter the release workstation's IP and reboot. Follow that model's Samsung instructions if the Developer Mode entry differs.
2. Connect the TV and workstation to a reachable local network. Use Tizen **Device Manager → Remote Device Manager**, add the TV IP and its development port (commonly `26101`), connect, retrieve its DUID, and ensure the distributor certificate includes it.
3. In Device Manager use **Permit to install applications** for that device. Use the active Samsung certificate profile. If authorization fails, investigate the DUID/profile/device connection; do not replace the author identity.
4. Install through Studio, or use the CLI target name shown by Device Manager:

```sh
tizen install -n icbc-tv-1.0.0.wgt -t YOUR_TV_TARGET -- artifacts
tizen run -p ICBCTV2026.ICBCTV -t YOUR_TV_TARGET
```

5. Complete the following checklist and record TV model, firmware, Tizen version, artifact version/commit and results. Exercise all target model groups before claiming compatibility. Emulator results should be recorded separately.

| Required check                           | Expected result                                                  |
| ---------------------------------------- | ---------------------------------------------------------------- |
| First launch / 1080p coordinate system   | Uncropped layout, legible text, visible initial focus            |
| Arrows and OK on every screen            | Predictable focus, archive scrolls, no inaccessible controls     |
| Return / exit confirmation               | Player releases resources; focus restored; home exit confirms    |
| Live during a broadcast                  | HLS plays through AVPlay, audio/video stable, live seek disabled |
| Live offline / network interruption      | Recoverable message; Retry reconnects without restarting app     |
| Real catalog / empty / invalid / timeout | Real schema renders; empty/error/Refresh paths behave correctly  |
| Archived MP4                             | Play/pause, seek in both directions, end, Retry and Stop work    |
| Repeated playback and Back while loading | No stale callbacks, crashes, resource leaks or frozen input      |
| Media keys / reduced-button remote       | Both registered hardware keys and on-screen controls work        |
| Home key / suspend / resume              | Playback pauses when hidden; no unwanted background audio        |
| Server TLS / CORS / range / codecs       | Production manifest, segments, keys and MP4 requests succeed     |

Use the current target's SDK logs/Web Inspector to diagnose failures. ES5 syntax compatibility does not prove support for every CSS/API detail on a TV. Do not skip device testing based on mocked AVPlay tests.

## 6. Seller Office submission

1. An authorized church representative signs in to [TV Seller Office](https://seller.samsungapps.com/tv), completes seller registration/contact details and any verification, and creates the app record. Confirm the account is permitted to submit in the intended countries; additional seller/partner authorization may be required by the selected markets.
2. Select language (English), territories, TV model groups, categories and age/content ratings supported by the actual test results. Complete any applicable agreements and content-rights declarations for sermons, worship/music and streaming media.
3. Prepare the current portal's required marketing icons, TV screenshots, description, support email/contact and privacy-policy URL. The **117×117 widget icon is not the full marketing asset set**. Use screenshots from the final TV build and actual church contact information; do not invent a support address or publish an unapproved privacy policy.
4. Explain server-side IP/request logging accurately in the church's privacy policy. The app itself has no login, analytics or persistent user-data storage, but that does not establish what the streaming host logs.
5. Upload the SDK-signed `.wgt` for the release. Retain the application/package identifiers and signing identity. For an update, use a higher widget version and the same app record/author identity. Resolve upload validation errors before progressing.
6. Provide reviewer instructions: first launch, Watch Live broadcast availability in **Central Time**, Browse Sermons, playback controls, Back/exit and offline handling. Ensure at least one accessible archived sermon is available outside live service times. Attach the device test evidence and complete the portal's pre-submission checklist.
7. Submit for Samsung review/certification using the authorized account. Respond to issues, rebuild/sign/retest corrected versions and resubmit. Publish only after the church approves the release and Samsung accepts it.

Account registration, certificate issuance, TV installation/playback verification, real production server access, release marketing/support/privacy inputs, and Seller Office review cannot be completed by the current cloud test environment. No passwords or private signing keys are required in chat to finish those steps.

## Minimum remaining release steps

1. **Samsung identity and signing:** an authorized church representative signs into the Samsung TV Certificate Manager wizard on the trusted signing machine, creates (or imports) the stable author certificate and a Samsung distributor certificate, and chooses **Public** privileges. Keep the author key/password and profile store private, backed up and outside Git/chat. Add the test TV DUID for development installation. No partner privilege is required by the current app.
2. **Build and device evidence:** set only the existing profile name in `TIZEN_SECURITY_PROFILE`, point `TIZEN_CLI` at the installed CLI, and run `npm run package:tizen`. Run the physical-TV checklist with real live/archive media, validate CORS/codecs/TLS and keep the model/firmware/artifact results. The SDK's bundled emulator-only certificate cannot replace Samsung release signing.
3. **Seller Office:** the authorized church account registers/selects the application, prepares the current required marketing icons/screenshots, approved privacy policy/support contact, content-rights and rating declarations, and reviewer playback instructions; upload the Samsung-signed widget and submit for Samsung review. Keep app IDs and author identity stable. No submission, approval, or physical-TV compatibility is claimed here.
