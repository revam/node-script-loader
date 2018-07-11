# script-loader

Create startup/shutdown routines for scripts.

## Usage

Basic usage:

```js
import Loader from "script-loader";

new Loader()
  .addStartupSteps(
    () => console.info("starting up"),
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
  console.info("starting application");
  /* ... */
  return () => console.info("stopping application");
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

The documentation is not yet available.
