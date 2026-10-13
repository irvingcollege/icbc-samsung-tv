# ICBC: obtain the Samsung signing profile

Seller Office registration is already complete. The remaining package step needs a **Samsung TV author + distributor certificate profile**, not the SDK's bundled emulator test profile. The app/SDK build and Samsung TV validation work is already done; do not rerun development suites just to obtain a certificate.

## Shortest supported interactive path

Samsung now documents certificate creation through its **Tizen VS Code extension**. The standalone Tizen Studio Certificate Manager is an alternative, not the only supported UI.

1. On a trusted computer with VS Code, install the official [Tizen TV extension](https://marketplace.visualstudio.com/items?itemName=samsungtvsdk.tv-vscode-tizen) by **samsungtvsdk**. Its Tizen base-extension dependency is installed automatically; complete the extension's SDK/certificate prerequisites if prompted. A trusted Linux or Windows computer can do this; no Mac installation is inherently required.
2. In the **Tizen Extension → ACTIONS → Create Certificate**, name the profile **ICBC-TV**, then choose **Create Samsung Certificate**. Enter the church's author details in the secure local wizard. Select **Public** distributor privileges. The current app does not need partner/platform privileges. Choose the offered distributor version for the TV target and select the physical test TV's DUID where required.
3. Click **Create** and complete Samsung Developer account login in the opened browser. Samsung documents this as an interactive account-authorized operation. Finish when `ICBC-TV` appears in the certificate profile list. Back up the author identity privately and retain it for updates. Do not send keys/passwords here or place certificates, profile stores or backups in the checkout.
4. Sign/package on **that trusted machine** so its private key never needs to be uploaded to this cloud or GitHub. If using our CLI wrapper, point `TIZEN_CLI` at the same SDK that recognizes `ICBC-TV`, then run the existing command below. A profile created by a different SDK/extension is not automatically bound to the cloud SDK; use the extension's supported profile import/configuration if needed.

```sh
# Names and executable paths only; no passwords/private key material in commands.
TIZEN_CLI=/path/to/your/sdk/tools/ide/bin/tizen \
TIZEN_SECURITY_PROFILE=ICBC-TV npm run package:tizen
```

The wrapper deliberately requires an explicit profile and packages with `tizen package -s ICBC-TV`; it does not silently fall back to the emulator certificate. Its output is `artifacts/icbc-tv-1.0.0.wgt`. Share/upload the resulting **signed widget**, not its author private key or profile store. Confirm the selected SDK lists the intended profile before packaging. Existing signature-structure checks do not establish Samsung trust on their own.

If VS Code is unavailable, use the official Studio flow: **Tools → Certificate Manager → + → Samsung → TV → ICBC-TV**, create/import the author certificate, sign in to Samsung, add a Public distributor certificate and the test DUID, and finish. Both UI paths require the Samsung certificate tooling and an authorized Samsung account.

## What is and is not automated

- Browser login participates in certificate issuance, but Samsung's reviewed documentation does **not** provide a standalone Seller Office/browser-only signing-profile portal.
- The generic `tizen certificate` CLI creates a local author certificate and requires a password argument. It is not documented as the account-authorized Samsung TV author/distributor issuance flow. We did not run it or generate replacement certificates.
- No documented unattended Samsung TV issuance API/CLI was found. Do not automate undocumented certificate-server endpoints or collect account/password/2FA data in scripts.
- After issuance, our existing SDK packaging can run unattended **where the private profile is securely available**. A signing runner is optional; a one-time package on the trusted certificate machine avoids configuring GitHub signing infrastructure.
- This cloud has a working SDK 10 CLI and verified Samsung TV schema resources. Its profile list is empty, `TIZEN_SECURITY_PROFILE` is unset, and no interactive VS Code/display is available. Full Studio Package Manager setup remains limited by its native DNS preflight. No private author/distributor profile has been created here.
- The official Samsung Certificate Extension 2.0.73 archive was downloaded and its Ubuntu package checked against Samsung's SHA256 manifest. It is cached outside the repository at `/workspace/tizen-user-data/installer-cache/samsung-certificate-extension-2.0.73.zip`. This is tooling only, not a signing identity; caching it does not install a working interactive wizard or issue certificates.

## After the profile

Use the signed widget for the Seller Office **App Package** upload. Select supported countries/model groups in **Distribute**, then complete **App Review** instructions and submit. Account login, distribution choices, submission and Samsung acceptance remain user/account actions. Verify the package on the actual TV before representing hardware compatibility; that verification has not happened here. Preserve app/package IDs and author identity. The downloaded asset ZIP remains partial because the official church-logo source was not provided.

## Official references reviewed

- [Samsung VS Code certificate creation](https://developer.samsung.com/smarttv/develop/tools/additional-tools/vscode/creating-certificates.html)
- [Samsung VS Code extension setup](https://developer.samsung.com/smarttv/develop/tools/additional-tools/vscode-extension-new.html)
- [Samsung Studio Certificate Manager flow](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html)

These pages document the account login and author/distributor profile creation sequence. No browser-only or unattended issuance support is inferred from their existence.
