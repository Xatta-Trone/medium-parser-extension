# Changelog

#### 1.6.6
[Issue #50](https://github.com/Xatta-Trone/medium-parser-extension/issues/50) Clicking the toolbar icon now opens a popup with the services, instead of the settings page.

[Issue #42](https://github.com/Xatta-Trone/medium-parser-extension/issues/42) Turn services on or off and reorder them by dragging (or with the ↑/↓ buttons). The page buttons, popup and right-click menu follow your order.

[Issue #29](https://github.com/Xatta-Trone/medium-parser-extension/issues/29) Firefox for Android support.

[Issue #49](https://github.com/Xatta-Trone/medium-parser-extension/issues/49) Settings are saved locally when browser sync is unavailable or disabled.

Removed Google Cache and Proxy API, which no longer work. If either was your auto-redirect choice, it now uses Archive.today.

Settings page: full width, live preview, Tutorial tab removed.

[PR #52](https://github.com/Xatta-Trone/medium-parser-extension/pull/52) Fixed Medium page detection and a crash on the home page. The page buttons now stay visible above Medium's layout, and no longer stack up when moving between articles.

[PR #46](https://github.com/Xatta-Trone/medium-parser-extension/pull/46) Fixed a crash on pages without a `#root` container.

[PR #47](https://github.com/Xatta-Trone/medium-parser-extension/pull/47) The settings page opens only on first install, not on every update.

#### 1.6.5
[PR #45](https://github.com/Xatta-Trone/medium-parser-extension/pull/45) Updated the Freedium link.

#### 1.5.4 
[Issue #25](https://github.com/Xatta-Trone/medium-parser-extension/issues/25)  Added more options and more supporting sites.

#### 1.5.3
[Issue #21](https://github.com/Xatta-Trone/medium-parser-extension/issues/21) `@username` and `/me/*` path excluded.

#### 1.5.2
[Issue #21](https://github.com/Xatta-Trone/medium-parser-extension/issues/21) `/explore-topics` and `/tag/*` path excluded. Wildcard checks added.

#### 1.5.1
removed the Unrecognized manifest key 'browser_specific_settings'.

added mail support link
#### 1.5.0
Added support for [https://freedium-mirror.cfd/](https://freedium-mirror.cfd/)

Added support link to resolve the issues.

Code refactoring
#### 1.4.0
Added support for [https://readmedium.com/](https://readmedium.com/)
#### 1.3.2
Changed logo

Change archive.is to archive.today for better proxy support
#### 1.3.0
Added 3<sup>rd</sup> party API proxy support.

Added disclaimer message with the buttons. 
#### 1.2.0
Added support for [https://archive.is/](https://archive.is/)
#### 1.1.1
Removed dependency on the 3rd party server. Now you can directly read form the Google Web Cache
#### 1.1.0

Added support for all medium.com based websites such as: 
- https://medium.com 
- https://towardsdatascience.com

### 1.0.1
Minor fixed and updates.

### 1.0.0
Initial release.
