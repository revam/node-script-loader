# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2018-10-21

### Added

- Added a new method `loader.getSettingOrEnv`, to get value either from an
  environment value if available, or get the setting, or get the default value
  provided as a second argument. Takes the same arguments as
  `loader.getSetting`.

- Also listens for End-of-File (EOF) on `process.stdin` (standard input) when
  attached to process.

- Added two new arguments to `StartupHandler` and `ShutdownHandler`. `stepIndex` and
  `totalSteps`. The first is the index of the current handler in the starup stack,
  the second is the total amount of steps it needs to do to finish the startup.

  Note: `stepIndex` starts at zero.

### Changed

- Compare links now point to github.

- Renamed package to "script-loader", changed mentions of previous package name,
  and updated usage examples for package. Also renamed the default exported
  class to `ScriptLoader`.

- Changed constructor arguments for `ScriptLoader`. Read the options description
  to see what it does.

- It is now possible to attach handlers to the `process` object by passing
  a truthy value to `loader.start(value?)` (typescript expects a boolean). This
  will not conflict with previous behaviour by defaulting the to true.

- The `start` and `stop` method can only be called once. And `stop` can only be
  called after `start`.

- Not possible to override the `loader.name` gotten from package or simular
  config, but we can instead provid an extra option `scriptName` to clarify
  to more easily identify what script is run.

- Reorganized file.

## [0.1.2] - 2018-10-14

### Fixed

- Shutdown steps was not ran because of a typo.

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

[Unreleased]: https://github.com/revam/node-script-loader/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/revam/node-script-loader/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/revam/node-script-loader/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/revam/node-script-loader/compare/v0.1.0...v0.1.1
