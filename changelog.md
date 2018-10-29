# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.3] - 2018-10-29

### Added

- Added a new method `setScriptInfo` to set script info after constructor.

### Fixed

- Relative paths in constructor options (e.g. `collection`) should resolve relative to option
  `resolveFrom`.

## [0.2.2] - 2018-10-28

### Added

- You can now supply the prefix for environment variables under the setting
  `runtime.envPrefix`.

- You can now supply induvidual timeouts for each step in both startup and
  shutdown routines.

- Added explaination for runtime settings for loader in readme and note for the
  cli interface.

### Changed

- Changed 'version' to 'release' in install section in readme.

### Fixed

- Prefix supplied to constructor was not used by loader.

## [0.2.1] - 2018-10-23

### Added

- To make it easier to use, we can now supply the startup/shutdown steps
  directly to the constructor.

- Added a static method `start(options?, attach?)`, to initialise a new loader
  and start it. It will only resolve if no error took place. You can supply it
  with any constructor options and a boolean for attaching events to process.

### Changed

- To prevent conflicts with environment variables for other programs you
  can now prefix any variables the loader looks for.

- Changed some other property names for constructor options. See code.

- Updated examples.

- Some more tweaks you can check in the commit log...

### Fixed

- Failed to initialise because a method in constructor was called before the
  loader was ready to use the method.

- Failed to stop if start threw an error because it was not 'running' _yet_.

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

[Unreleased]: https://github.com/revam/node-script-loader/compare/v0.2.3...HEAD
[0.2.3]: https://github.com/revam/node-script-loader/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/revam/node-script-loader/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/revam/node-script-loader/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/revam/node-script-loader/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/revam/node-script-loader/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/revam/node-script-loader/compare/v0.1.0...v0.1.1
