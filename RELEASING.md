# Releasing

Publishing a GitHub release submits the new version to the stores automatically.

| Store | Workflow | Status |
| --- | --- | --- |
| Firefox Add-ons (AMO) | [`publish-firefox.yml`](.github/workflows/publish-firefox.yml) | Automatic |
| Chrome Web Store | — | Manual for now |

## One-time setup (Firefox)

1. Sign in to addons.mozilla.org with the account that owns Medium Parser and open
   **Tools → Manage API Keys** (<https://addons.mozilla.org/developers/addon/api/key/>).
   Generate credentials.
2. In this repository on GitHub, go to **Settings → Secrets and variables → Actions** and add
   two repository secrets:
   - `AMO_JWT_ISSUER`: the **JWT issuer** (looks like `user:12345678:123`)
   - `AMO_JWT_SECRET`: the **JWT secret**

## Releasing a version

1. Bump `version` in both `chrome/manifest.json` and `firefox/manifest.json` (they must match),
   and add an entry to `changelog.md`. Merge to `main`.
2. On GitHub, create a release with a new tag matching the version, for example `v1.6.6` or `1.6.6`,
   and publish it.
3. The **Publish Firefox add-on** workflow then:
   - checks that the tag and both manifests have the same version
   - runs the tests and `web-ext lint`
   - builds `medium-parser-firefox-<version>.zip` and attaches it to the release
   - submits the version to AMO

AMO reviews the submission. The workflow doesn't wait for the review; Mozilla emails you when it's
approved, and the version page on AMO shows its status.

Pre-releases are skipped. To check a build without submitting, run the workflow from the
**Actions** tab with **Submit to AMO** left unticked; the zip is available under the run's artifacts.

## If the AMO step fails

- **Version already exists**: AMO never accepts the same version twice. Bump the version and release again.
- **Missing secrets / 401**: check the two secrets above, or regenerate the API keys.
- **Version mismatch**: the tag (without a leading `v`) must equal the manifest versions.
