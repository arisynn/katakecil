# Play Protect report — 2026-11-05

Status: unresolved. A user reported the “Harmful app blocked” dialog while updating KataKecil. The owner confirmed that the blocked target was version 1.1.1. The screenshot does not identify the malware category or offending component. This is not sufficient evidence to call the warning a false positive or to attribute it to sideloading or the updater permission.

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

## Review request preparation (not submitted)

Google's developer guidance distinguishes harmful-app blocks from unknown-app scan prompts and provides a classification appeal route:
https://developers.google.com/android/play-protect/warning-dev-guidance

Before submitting, identify the exact blocked APK and its hash/version, attach the screenshot, and provide the artifact URL, package name, signing certificate and explanation of the user-confirmed updater. Further SDK/binary analysis may still be required. Do not claim the app is malware-free based on this limited review.

Suggested initial description, after substituting the confirmed blocked version:

> A user of our EPUB reader KataKecil reported a Google Play Protect “Harmful app blocked” warning during a user-initiated update. Please identify the detected category or component so we can investigate and correct it. Our direct updater retrieves only our own GitHub release APK, checks its SHA-256, package ID, version and signing certificate, and opens Android's installer for user confirmation. Attached are the screenshot, exact blocked artifact details and limited static inspection findings. We have not determined the cause of the classification and are requesting review rather than asking users to bypass Play Protect.

No appeal, APK upload to a scanning service, or external message has been submitted.
