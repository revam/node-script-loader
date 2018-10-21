# script-loader

Create startup/shutdown routines for scripts.

## Install

Install from github:

**Spesific version:**

```sh
$ npm install --save https://github.com/revam/node-script-loader/releases/download/v$VERSION/package.tgz
```

Install from git.lan (Internet people can ignore this):

**Latest release:**

```sh
$ npm install --save https://git.lan/mist@node/script-loader@latest/npm-pack.tgz
```

**Spesific version:**

```sh
$ npm install --save https://git.lan/mist@node/script-loader@v$VERSION/npm-pack.tgz
```

## Usage

Basic usage:

```js
import Loader from "script-loader";

new Loader({ resolveFrom: __dirname, scriptName: "example script"})
  .addStartupSteps(
    (l) => console.info("starting up %s %s v%s", l.name, l.scriptName, l.version),
    createApplication,
  )
  .addShutdownSteps(
    () => console.info("shutting down"),
  )
  .setErrorHandler(
    (error) => console.error(error),
  )
  .start()
;

function createApplication(loader) {
  console.info("starting some application");
  return () => console.info("stopping some application");
}
```

Load order:

```js
import Loader from "script-loader";

new Loader()
  .addStartupSteps(
    // just does some work
    () => console.info("start 1"),
    // just does some work
    () => console.info("start 2"),
    // also registers a shutdown handler
    () => () => console.info("stop 2"),
    // also registers a shutdown handler
    () => () => console.info("stop 1"),
    () => console.info("start 3"),
    // stops the script manually (no event)
    (loader) => loader.stop(),
    // will never reach after stop is called
    () => console.info("never"),
  )
  .addShutdownSteps(
    () => console.info("stop 3"),
  )
  .start()
;
// will print the messages in numerical accending order, from start to stop.
```

## Documentation

The documentation is not available for now, but if you use TypeScript, the
definitions are available with some (short) descriptions. There are also some
examples above for how you could use this library.

## Typescript

This module includes a [TypeScript](https://www.typescriptlang.org/)
declaration file to enable auto complete in compatible editors and type
information for TypeScript projects. This module depends on the Node.js
types, so install `@types/node`:

```sh
npm install --save-dev @types/node
```

## Changelog and versioning

All notable changes to this project will be documented in [changelog.md](./changelog.md).

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## License

This project is licensed under the MIT license. See [license](./license) for the
full terms.