# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2018-10-13

### Added

- Added a new export `createCLI`, to easier produce cli programs.
  The created cli application has two basic sub-commands, `start <script>` and
  `config <sub-command>`. See help for usage.

- Added a changelog to easier keep track of (summerised) changes.

- Added missing linting rules and license file

- Added a new method `resetSettings` to reset settings back to defaults.

### Changed

- Program constructor now accepts absolute paths as an alternative in `pkg` and
  `options.defaultSettings`.

- Fixed lining warnings/errors in code

- Name override of program is now part of `IProgamOptions` instead of an extra
  argument.

- Exclude built files from VCS (git).

- Updated all dependencies

- Updated npm scripts

- Development builds now contain source maps for code and declaration files.

### Fixed

- A `StartupHandler` should expect its return value to equal either a shutdown-
  handler or `void`.

- A `ShutdownHandler` should have its return value wrapped in `Await`, and
  should expect the value to equal `void`.

- Removed development files from packed package. (Added .npmignore)

## 0.1.0 - 2018-07-12

### Added

- Initial release

[Unreleased]: http://git.lan/mist/node-program/compare/v0.1.1...HEAD
[0.1.1]: http://git.lan/mist/node-program/compare/v0.1.0...v0.1.1
