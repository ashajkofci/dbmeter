# Acro dB Meter

Acro dB Meter is a desktop sound pressure level display for
[Room EQ Wizard (REW)](https://www.roomeqwizard.com/). It shows the live
A-weighted, slow SPL value and can calculate an average over a period selected
with a button or the Space key.

![Acro dB Meter logo](acro.png)

## Features

- Native Windows and macOS packages
- Separate Intel and Apple Silicon macOS downloads, without duplicate archives
- Live 60–100 dB analog and digital display
- Start/stop averaging without retaining an unbounded sample history
- Automatic connection-loss detection and manual reconnection
- Built-in demo mode for browser-based testing
- Keyboard controls, responsive layout, and reduced-motion support
- Isolated desktop renderer with an allowlisted localhost-only REW bridge

## Use the desktop app

1. Start REW and enable its API on the default port, `4735`.
2. Install and open Acro dB Meter.
3. The app connects automatically. Use **Reconnect** if REW was started later.
4. Select **Record average**, or press Space, to start and stop an average.

REW can also be launched with its API enabled:

- Windows: `"C:\Program Files\REW\roomeqwizard.exe" -api`
- macOS: `open -a REW.app --args -api`

## Develop

Requirements:

- Node.js 22 or later
- Python 3.9 or later (only for browser/demo mode)

```bash
npm ci
npm test
npm start
```

The desktop app talks only to `http://127.0.0.1:4735`. To preview the web
version against a local mock API instead:

```bash
npm run demo
```

The demo opens at `http://127.0.0.1:8080/?demo=true`. The Python server binds
only to loopback and applies restrictive browser security headers.

Local, unsigned packages can be created for development with:

```bash
npm run pack
```

Do not distribute those development packages. Official tagged releases are
signed and, on macOS, notarized.

## Release Windows and macOS builds

The release workflow runs for a version tag or from its manual button. It tests
the project, builds one Windows installer plus separate Intel and Apple Silicon
macOS DMGs, and publishes a GitHub release only after all platform jobs
succeed. Redundant ZIP copies and a double-size universal macOS bundle are
deliberately omitted.

Create a protected GitHub Actions environment named `release-signing`, add
required reviewers, limit deployment to protected release tags, and configure
these environment secrets:

| Secret | Purpose |
| --- | --- |
| `WINDOWS_CERTIFICATE` | Base64-encoded `.pfx` code-signing certificate, or another `CSC_LINK` value supported by electron-builder |
| `WINDOWS_CERTIFICATE_PASSWORD` | Password for the Windows certificate |
| `MACOS_CERTIFICATE` | Base64-encoded Developer ID Application `.p12` certificate |
| `MACOS_CERTIFICATE_PASSWORD` | Password for the macOS certificate |
| `APPLE_ID` | Apple ID used for notarization |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password for that Apple ID |
| `APPLE_TEAM_ID` | Apple Developer team identifier |

Keep signing credentials in the protected environment; never add certificate
files or passwords to the repository. Protect release tags and restrict who
can modify Actions workflows in the repository settings. The workflow pins
third-party action execution to reviewed commit SHAs.

To publish a version such as `1.1.0`, open
**Actions → Release desktop apps → Run workflow** on `main` and enter `1.1.0`.
The manual workflow applies that version to both packages without modifying the
repository.

Leave **Require trusted Windows signing and Apple signing/notarization**
unchecked if you do not have certificates. This creates an explicitly
`-UNSIGNED` GitHub pre-release with checksums. Windows SmartScreen and macOS
Gatekeeper may warn or block those packages; this cannot be securely avoided
without trusted platform certificates. No self-signed certificate is generated.

Check that option only after configuring all secrets below. After the
protected-environment approval, the workflow creates the version tag and
GitHub release.

Alternatively, update the version in `package.json` and push a matching release
tag:

```bash
git tag -s v1.1.0 -m "Acro dB Meter 1.1.0"
git push origin v1.1.0
```

An annotated tag also works when GPG tag signing is not configured. Tag-push
releases are always treated as signed releases and deliberately stop if any
signing or notarization secret is absent.

## Security design

- Electron uses context isolation, renderer sandboxing, and no Node.js
  integration.
- The preload bridge exposes one operation. The main process accepts only the
  four REW routes and methods required by the app.
- Navigation, popups, webviews, redirects, and Electron permission requests
  are denied.
- A Content Security Policy prevents inline scripts, remote resources, plugins,
  forms, and framing.
- REW responses have time and size limits and must contain valid JSON.
- Release jobs have read-only permissions except for the final publishing job,
  which receives only `contents: write`.

## Troubleshooting

If the app shows **Offline**:

1. Confirm REW is running and its API is enabled.
2. Confirm the API is using port `4735`.
3. Select **Reconnect**.
4. Use `npm run demo` to separate an REW/API problem from a display problem.

The macOS release must report a valid Developer ID signature and notarization
ticket. Windows may still show a reputation warning for a new publisher until
SmartScreen reputation is established, even when the executable is correctly
signed.

## License

MIT
