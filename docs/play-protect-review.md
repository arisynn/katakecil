# Play Protect report — 2026-11-05

Status: unresolved. A user reported the “Harmful app blocked” dialog while updating KataKecil. The owner confirmed that the blocked target was version 1.1.1. The screenshot does not identify the malware category or offending component. This is not sufficient evidence to call the warning a false positive or to attribute it to sideloading or the updater permission.

Follow-up: the owner also reported the same block for **1.1.2-rc.1**, opened from a GitHub browser download. Changing only the visual assets did not resolve the warning. No further APK has been published as a speculative fix.

Do not bypass Play Protect or disable scanning. No replacement APK is being presented as a fix for this warning.

## Artifact reviewed

- Latest official artifact: `KataKecil-1.1.1-Karisyono.apk`, package `id.karisyono.katakecil`, version code 5.
- APK: https://github.com/arisynn/katakecil/releases/download/v1.1.1/KataKecil-1.1.1-Karisyono.apk
- SHA-256: `502985e28983e0c2141422855d16440150b20701df11c05bc24ca99f74ddaaf9`.
- Signing certificate SHA-256: `a79f2655964c3aa2261fc0da33230e83d3518e2232d1f2d5c4f875f5c55c2bba`.
- Source revision: `55f2b7e5875cddfe40f36b4cfec8c91feb9f8bea`.

The owner confirmed version 1.1.1; the file on the affected device has not been independently matched to this hash. Release publication verified its signature, alignment and GitHub asset digest; these checks establish integrity, not freedom from malware.

## Limited static inspection

The actual APK manifest declares `INTERNET`, `REQUEST_INSTALL_PACKAGES`, and its app-scoped signature permission `id.karisyono.katakecil.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`. It does not request SMS, contacts, microphone, accessibility, notification-listener or broad storage permissions. Target SDK is 36. ZIP local header is standard and archive entries have unique names. There is one DEX file and no packaged native `.so` libraries. These facts alone do not establish safety.

The application-owned native code was inspected. Updates are limited to this repository's GitHub release assets and approved HTTPS GitHub asset redirects. Download size and SHA-256 are checked, then package ID, increasing version code, release version name and signing certificate are checked again before opening Android's installer. Installation requires a user action. The FileProvider is not exported and exposes only `cache/updates/` by a temporary URI grant. Backup export uses the Android document picker. No application-owned dynamic DEX loader, shell execution or silent installation path was found in this inspection.

`REQUEST_INSTALL_PACKAGES` enables the requested direct updater. Its presence has not been established as the reason for Google's classification. Removing it would change that feature and would not prove the APK safe or remove Google's classification. Package identity and signing keys were not changed to evade detection.

No antivirus scan, complete third-party SDK/binary analysis, device behavior analysis, or Google classification response has been obtained. No browser/device QA or test suites were run for this report. The cause remains undetermined.

A follow-up `npm audit --omit=dev --json` reported zero known runtime dependency vulnerabilities. npm advisories are not a malware scanner or a Google classification result. Build 1.1.2-rc.1 includes the dark cover CSS correction; it does not claim to resolve the Play Protect report. It retains the existing package, signing identity and permissions.

## Follow-up static findings

- Candidate artifact: `KataKecil-1.1.2-rc.1-Karisyono.apk`, versionCode6, SHA-256 `dbed7f06ade2cbbce535724231c027eecd351181f8bacf7607a7edd289bac850`.
- Its `classes.dex` is byte-identical to 1.1.1: SHA-256 `56199224ba7cb004653d1bb89c68bde58f0297c94256b9313128d22a9a6af02a`. The native code was not changed in the candidate. This comparison does not identify which component caused the block.
- DEX inventory contains 5,309 classes in the application's package and expected AndroidX, Capacitor, Cordova, Kotlin/coroutines, Chromium WebView support, Guava and annotation namespaces. An expected namespace is not proof that its implementation is safe; the inventory is not a full code audit or malware scan.
- No nested `.apk`, `.jar`, `.so`, `.exe` or `.sh` file was found in the candidate archive. One DEX is packaged normally at the APK root.
- Resolved 50 Maven coordinates from Gradle's `releaseRuntimeClasspath` without running tests or building another APK. Querying those versions through OSV's batch API returned no listed vulnerabilities. This is advisory coverage only; it does not establish absence of malicious or unknown behavior.
- Packaged Capacitor configuration loads UI from bundled `dist` assets, has no remote `server.url` or `allowNavigation` additions, disables mixed content and WebView debugging, and requires WebView113+. The inspected modern Capacitor message listener scopes native plugin messages to its allowed origin and main frame. Its upstream implementation also has a legacy `addJavascriptInterface` fallback; presence of this API alone is not a malware finding. This inspection is not an exploitability assessment of every SDK method.
- Public hash searches and direct attempts to read the VirusTotal report did not produce an accessible result. This does not mean VirusTotal has no record or that scanners found zero detections. No file was uploaded and no malware scanner result is available.

## What the official policies establish

The [Play Protect developer guide](https://developers.google.com/android/play-protect/warning-dev-guidance) distinguishes a harmful-app block from an unknown-app scan prompt and from sensitive SMS/accessibility permission blocks. The screenshot matches the harmful-app heading. It does not disclose the cause or a malware category.

The [Play Store installer-permission policy](https://support.google.com/googleplay/android-developer/answer/12085295?hl=en) limits `REQUEST_INSTALL_PACKAGES` to qualifying core functions. A book reader's self-updater would require a different distribution design for Play Store compliance. KataKecil currently distributes through GitHub; that Play Store policy is not evidence that this permission caused the observed Play Protect verdict. A future variant that only checks updates and hands download/install to the browser would reduce the app's installation capability, but it would change the requested integrated updater and would not guarantee a cleared classification. That variant has not been implemented.

Google also documents [sensitive JavaScript bridge risks](https://support.google.com/googleplay/android-developer/answer/10768383). The appropriate review is whether untrusted content can reach privileged functionality, not assuming all WebView applications are unsafe. No such cause has been established for this report.

## Review request preparation (not submitted)

Google's developer guidance distinguishes harmful-app blocks from unknown-app scan prompts and provides a classification appeal route:
https://developers.google.com/android/play-protect/warning-dev-guidance

Before submitting, identify the exact blocked APK and its hash/version, attach the screenshot, and provide the artifact URL, package name, signing certificate and explanation of the user-confirmed updater. Further SDK/binary analysis may still be required. Do not claim the app is malware-free based on this limited review.

The [current appeal form](https://support.google.com/googleplay/android-developer/contact/protectappeals) requires the SHA-256 of an APK uploaded to VirusTotal, an email address, package name and supporting information. It states that decisions are final and a response will not be provided; do not promise a diagnostic explanation from Google or submit a request merely asking for implementation advice. A real submission requires authorization to send the report and the owner's contact details.

[VirusTotal's documentation](https://docs.virustotal.com/docs/how-it-works) explains that public scanning shares reports and may share submitted samples with partners and qualified customers. Do not include signing keys, manuscripts, backups or private credentials in a submission. The published APK, not the signing archive, is the relevant sample.

Suggested classification-review description, to review against the VirusTotal results before submitting:

> Please review the Play Protect classification of our EPUB reader KataKecil, package id.karisyono.katakecil, version 1.1.2-rc.1 (versionCode6). A user reported “Harmful app blocked” both for 1.1.1 and for the candidate downloaded directly from our GitHub release. Candidate APK SHA-256: dbed7f06ade2cbbce535724231c027eecd351181f8bacf7607a7edd289bac850. Signing certificate SHA-256: a79f2655964c3aa2261fc0da33230e83d3518e2232d1f2d5c4f875f5c55c2bba. The direct updater is user-initiated, restricted to our own GitHub release APK, verifies its digest/package/version/certificate, and opens Android's installer for user confirmation. The APK requests internet and package-installation permission, plus an app-scoped signature receiver permission; it does not request SMS, contacts, accessibility, microphone or notification-listener access. The candidate only changed UI assets and release metadata; its native DEX matches 1.1.1. We have not established the cause and are not asking users to bypass Play Protect. We request classification review of the exact uploaded sample; the static inspection and advisory results are supporting information, not a malware-free certification.

No appeal, APK upload to a scanning service, or external message has been submitted.
