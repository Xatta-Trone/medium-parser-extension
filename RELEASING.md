# Releasing

A release is three steps:

1. **Bump both manifests.** Set the same new `version` in `chrome/manifest.json` and
   `firefox/manifest.json`.
2. **Add a changelog entry** for that version at the top of `changelog.md`. Merge both changes to `main`.
3. **Publish a GitHub release** from `main`, tagged with the version (for example `v1.6.7`). You can
   paste the changelog entry as the release notes.

Both stores get the new version automatically. Each store reviews it before it goes live.

**Exception: new permissions.** If the version adds a permission to the manifest, the Chrome Web
Store won't accept the submission until you justify it. The workflow still uploads the package, then
fails at the submit step. Open the item in the
[Developer Dashboard](https://chrome.google.com/webstore/devconsole), add the justification on the
**Privacy** tab, then click **Submit for review** there. You don't need to re-run the workflow.
Firefox isn't affected.

The rest of this page covers the one-time setup, what the workflows do, and what to do if one fails.

| Store | Workflow |
| --- | --- |
| Firefox Add-ons (AMO) | [`publish-firefox.yml`](.github/workflows/publish-firefox.yml) |
| Chrome Web Store | [`publish-chrome.yml`](.github/workflows/publish-chrome.yml) |

The two workflows run independently, so one store failing doesn't block the other.

## One-time setup: Firefox

1. Sign in to addons.mozilla.org with the account that owns Medium Parser and open
   **Tools → Manage API Keys** (<https://addons.mozilla.org/developers/addon/api/key/>).
   Generate credentials.
2. In this repository on GitHub, go to **Settings → Secrets and variables → Actions** and add
   two repository secrets:
   - `AMO_JWT_ISSUER`: the **JWT issuer** (looks like `user:12345678:123`)
   - `AMO_JWT_SECRET`: the **JWT secret**

## One-time setup: Chrome

The workflow uses the Chrome Web Store API v2 with a Google Cloud service account.

1. In the [Google Cloud console](https://console.cloud.google.com/), create a project (or pick one),
   then search for **Chrome Web Store API** and **Enable** it.
2. Go to **IAM & Admin → Service accounts → Create service account**. Any name works, for example
   `medium-parser-publisher`. It needs no roles; skip the permissions steps.
3. Open the new service account → **Keys → Add key → Create new key → JSON**. A `.json` file downloads.
   Treat it like a password.
4. In the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole),
   go to **Account**, and add the service account's email (it ends in `.iam.gserviceaccount.com`).
   A publisher can have only one service account.
5. In the Dashboard, go to **Publisher → Settings** and copy your **publisher ID**.
6. Add two repository secrets on GitHub, as for Firefox:
   - `CWS_SERVICE_ACCOUNT_KEY`: the whole contents of the JSON key file
   - `CWS_PUBLISHER_ID`: the publisher ID

   After adding the key as a secret, delete the downloaded file.

The extension ID (`elgmajanahbjpbcljflifdnnmpodfiij`) is public and set in the workflow.

To check the setup without publishing, run **Publish Chrome extension** from the **Actions** tab with
**Submit** left unticked. Its **Check store credentials** step signs in and prints the item's
current status without changing anything.

## Releasing a version

1. Bump `version` in both `chrome/manifest.json` and `firefox/manifest.json` (they must match),
   and add an entry to `changelog.md`. Merge to `main`.
2. On GitHub, create a release with a new tag matching the version, for example `v1.6.6` or `1.6.6`,
   and publish it.
3. Both workflows then:
   - check that the tag and both manifests have the same version
   - run the tests (Firefox also runs `web-ext lint`)
   - build `medium-parser-<firefox|chrome>-<version>.zip` and attach it to the release
   - submit the version to their store

Both stores review submissions. The workflows don't wait for review. Mozilla emails you when a
version is approved. Chrome publishes it automatically once approved, and the Developer Dashboard
shows its status.

Pre-releases are skipped. To check a build without submitting, run either workflow from the
**Actions** tab with its submit box left unticked; the zip is available under the run's artifacts.

## If a store step fails

- **Version already exists / must be higher**: neither store accepts the same version twice. Bump the
  version and release again.
- **Version mismatch**: the tag (without a leading `v`) must equal the manifest versions.
- **AMO 401**: check `AMO_JWT_ISSUER` and `AMO_JWT_SECRET`, or regenerate the API keys.
- **Chrome "Getting an access token failed"**: `CWS_SERVICE_ACCOUNT_KEY` is wrong or the key was
  deleted. Create a new JSON key and update the secret.
- **Chrome 403 / permission denied**: the service account email isn't added under **Account** in
  the Developer Dashboard, the publisher ID is wrong, or the Chrome Web Store API isn't enabled.
- **Chrome upload rejected while in review**: a previous version is still pending review. Wait for it,
  or cancel that submission in the Developer Dashboard, then re-run the workflow.
- **Chrome visibility changed**: if you changed the item's visibility in the Dashboard, publish once
  manually there before the API can publish again.
