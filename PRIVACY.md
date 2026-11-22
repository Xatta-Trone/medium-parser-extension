# Privacy Policy

_Last updated: 21 November 2026_

This policy covers the Medium Parser browser extension for Chrome, Edge and other Chromium browsers,
and for Firefox.

## Summary

Medium Parser does not collect, store or sell any personal data. It has no accounts, analytics,
tracking or ads, and it never sends data to the developer.

## What the extension stores

- **Your settings**: menu option, auto-redirect choice, "open in new tab", and which services are
  shown and in what order. They are saved in your browser's extension storage (`storage.sync`, or
  `storage.local` if sync is unavailable). If you use your browser's sync feature, your browser
  provider syncs these settings between your devices; the developer cannot see them.
- **The last auto-redirected article**: in auto-redirect mode, the extension remembers the last
  article URL it redirected in the tab's session storage, so it doesn't redirect the same article
  twice. Your browser deletes this when you close the tab.

Nothing else is stored.

## What leaves your browser

When you choose a reader service, the extension opens that service with the URL of the Medium
article you are viewing, for example `https://freedium-mirror.cfd/<article URL>`. This happens:

- when you click one of the extension's buttons on the page, in the toolbar popup or in the
  right-click menu, or
- automatically on Medium articles, only if you turned on **Auto redirect** in the settings.

The services are:

- Freedium (freedium-mirror.cfd)
- Read-Medium (readmedium.com)
- Archive.today (archive.today) and Archive.is (archive.is)

These are independent third-party websites. The extension sends them only the article URL, as part
of opening their page. What they do with it is covered by their own privacy policies. You can turn
off any service in the settings.

The extension itself makes no other network requests.

## Permissions

- **storage**: saves your settings.
- **contextMenus**: adds the Medium Parser entries to the right-click menu.
- **activeTab**: lets the toolbar popup read the URL of the current tab after you click the
  extension icon.
- **Access to websites**: the extension checks each page to detect Medium articles, including
  Medium publications on their own domains. On other sites it does nothing. It does not read or
  send page content.

## Changes

Changes to this policy are published in this file, and its history is visible on
[GitHub](https://github.com/Xatta-Trone/medium-parser-extension/commits/main/PRIVACY.md).

## Contact

Questions or concerns: open an issue at
<https://github.com/Xatta-Trone/medium-parser-extension/issues>.
