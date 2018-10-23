/**
 * @name script-loader
 * @license MIT
 * @copyright 2018 Mikal Stordal <mikalstordal@gmail.com>
 */

//#region import

import { Command } from "commander";
import * as ConfigStore from "configstore";
import { existsSync, readdirSync, readFileSync } from "fs";
import { isAbsolute, join, resolve } from "path";
import { inspect } from "util";

//#endregion import
//#region constants

const PARSE_IF_REGEX = /^([\[\{"]|-?[0-9]+)/;

const SymbolSettings = Symbol("settings");
const SymbolDefaultSettings = Symbol("defaults");

//#endregion constants
//#region classes

/**
 * Helper class for controlling startup/shutdown routines of a program.
 */
export default class ScriptLoader {
  //#region static properties
  //#region internal

  /** @internal */
  private [SymbolSettings]: ConfigStore;

  /** @internal */
  private [SymbolDefaultSettings]: object;

  //#endregion internal

  /**
   * Error handler. May do async work.
   */
  protected onError: ErrorHandler = (e) => console.error(e);

  /**
   * Steps to preform at shutdown.
   */
  protected shutdownSteps: ShutdownHandler[] = [];

  /**
   * Steps to preform at startup.
   */
  protected startupSteps: StartupHandler[] = [];

  /**
   * Check if startup scripts is running or has ran.
   */
  protected isRunning: boolean = false;

  /**
   * Check if shutdown scripts is running.
   */
  protected isShutdownRunning: boolean = false;

  /**
   * Environment variables for settings is prefixed with this string.
   */
  protected envPrefix?: string;

  /**
   * Name of script collection.
   */
  public readonly name: string;

  /**
   * Description of script collection.
   */
  public readonly description: string;

  /**
   * Version of script collection.
   */
  public readonly version: string;

  /**
   * Current environment program was launched in. Collected from `$NODE_ENV` or
   * manually provided.
   */
  public readonly environment: string;

  /**
   * Name of current script.
   */
  public readonly scriptName: string;

  /**
   * Description of current script.
   */
  public readonly scriptDescription: string;

  /**
   * A simple state to share variables across startup/shutdown steps.
   */
  public state: any = {};

  //#endregion static properties
  //#region constructor

  public constructor(options?: IScriptLoaderOptions);
  public constructor({
    collection = "./package.json",
    configPath,
    defaultSettings,
    onError,
    resolveFrom = "",
    script = {},
    shutdownSteps,
    startupSteps,
  }: IScriptLoaderOptions = {}) {
    resolveFrom = resolve(resolveFrom);
    if (typeof collection === "string") {
      const json = readJSON<ScriptCollectionInfo>(collection);
      if (!json) {
        throw new Error("Invalid path to package.json");
      }
      collection = json;
    }
    if (typeof defaultSettings === "string") {
      const json = readJSON<object>(defaultSettings);
      if (!json) {
        throw new Error("Invalid path to settings file");
      }
      defaultSettings = json;
    }

    const configStore = new ConfigStore(collection.name, undefined, { globalConfigPath: true });
    if (configPath) {
      configStore.path = resolve(resolveFrom, configPath);
    }
    if (defaultSettings) {
      configStore.all = {...defaultSettings, ...configStore.all};
    }
    if (typeof onError === "function") {
      this.setErrorHandler(onError);
    }
    if (typeof shutdownSteps === "object" && Symbol.iterator in shutdownSteps) {
      this.addShutdownSteps(...shutdownSteps);
    }
    if (typeof startupSteps === "object" && Symbol.iterator in startupSteps) {
      this.addStartupSteps(...startupSteps);
    }

    this[SymbolDefaultSettings] = defaultSettings || {};
    this[SymbolSettings] = configStore;
    this.name = collection.name;
    this.version = collection.version;
    this.description = collection.description;
    this.environment = this.getSettingOrEnv("runtime.environment", process.env.NODE_ENV || "development");
    const {name: scriptName = "", description: scriptDescription = ""} = script;
    this.scriptName = scriptName;
    this.scriptDescription = scriptDescription;
  }

  //#endregion constructor
  //#region dynamic properties

  /**
   * Check if program was launched in development mode.
   */
  public get isInDevMode(): boolean {
    return this.environment === "development";
  }

  /**
   * Check if program was launched in production mode.
   */
  public get isInProdMode(): boolean {
    return this.environment === "production";
  }

  /**
   * Check if program was launched in test mode.
   */
  public get isInTestMode(): boolean {
    return this.environment === "test";
  }

  public get settingsPath(): string {
    return this[SymbolSettings].path;
  }

  //#endregion dynamic properties
  //#region methods

  /**
   * Checks if program has `path`.
   *
   * @example
   *
   *   // config -> { objA: { propB: "valueA" }, objC: "valueB" }
   *   program.hasSetting("objA") // true
   *   program.hasSetting("objA.propA") // false
   *   program.hasSetting("objA.propB") // true
   *   program.hasSetting("objB") // false
   *   program.hasSetting("objB.propA") // false
   *   program.hasSetting("objB.propB") // false
   *   program.hasSetting("objC") // true
   *
   * @param path dot-seperated object-path
   */
  public hasSetting(path: string): boolean {
    return this[SymbolSettings].has(path);
  }

  /**
   * Get setting(s) at `path`, or undefined if not found.
   *
   * @example
   *
   *   // config -> { objA: { propB: "valueA" }, objC: "valueB" }
   *   program.getSetting("objA") // { propB: "valueA" }
   *   program.getSetting("objA.propA") // undefined
   *   program.getSetting("objA.propB") // "valueA"
   *   program.getSetting("objB") // undefined
   *   program.getSetting("objB.propA") // undefined
   *   program.getSetting("objB.propB") // undefined
   *   program.getSetting("objC") // "valueB"
   *
   * @param path dot-seperated object-path
   */
  public getSetting<T>(path: string): T | undefined;
  /**
   * Get setting(s) at `path`, or value of `default_value` if not found.
   *
   * @example
   *
   *   // config -> { objA: { propB: "valueA" }, objC: "valueB" }
   *   program.getSetting("objA", { propB: "valueC" }) // { propB: "valueA" }
   *   program.getSetting("objA.propA", "valueD") // "valueD"
   *   program.getSetting("objA.propB", "valueD") // "valueA"
   *   program.getSetting("objB", "valueE") // "valueE"
   *   program.getSetting("objB.propA", "valueF") // "valueF"
   *   program.getSetting("objB.propB", "valueG") // "valueG"
   *   program.getSetting("objC", "valueH") // "valueB"
   *
   * @param path dot-seperated object-path
   * @param default_value default value
   * @returns the setting, settings object, or provided default value
   */
  public getSetting<T>(path: string, default_value: T): T;
  public getSetting<T>(path: string, default_value?: T): T | undefined {
    if (this.hasSetting(path)) {
      return this[SymbolSettings].get(path);
    }
    return default_value;
  }

  /**
   * Get setting(s) at `path`, or undefined if not found. If an environment
   * variable for path exists, will return value from variable instead.
   *
   * @example
   *
   *   // config -> { objA: { propB: "valueA" }, objC: "valueB" }
   *   program.getSetting("objA") // { propB: "valueA" }
   *   program.getSetting("objA.propA") // undefined
   *   program.getSetting("objA.propB") // "valueA"
   *   program.getSetting("objB") // undefined
   *   program.getSetting("objB.propA") // undefined
   *   program.getSetting("objB.propB") // undefined
   *   program.getSetting("objC") // "valueB"
   *
   * @example
   *
   *   // config -> { objA: { propB: "valueA" }, "obj-c": "valueB" }
   *   // env -> { OBJA: "{\"propA\":\"valueB\"}", OBJA_PROPB: "valueE", OBJ_C: "valueY" }
   *   program.getSetting("objA") // { propA: "valueB" }
   *   program.getSetting("objA.propB") // "valueE"
   *   program.getSetting("obj-c") // "valueY"
   *
   * @param path dot-seperated object-path
   */
  public getSettingOrEnv<T>(path: string): T | undefined;
  /**
   * Get setting(s) at `path`, or value of `default_value` if not found. If an
   * environment variable for path exists, will return value from variable
   * instead.
   *
   * @example
   *
   *   // config -> { objA: { propB: "valueA" }, objC: "valueB" }
   *   program.getSetting("objA", { propB: "valueC" }) // { propB: "valueA" }
   *   program.getSetting("objA.propA", "valueD") // "valueD"
   *   program.getSetting("objA.propB", "valueD") // "valueA"
   *   program.getSetting("objB", "valueE") // "valueE"
   *   program.getSetting("objB.propA", "valueF") // "valueF"
   *   program.getSetting("objB.propB", "valueG") // "valueG"
   *   program.getSetting("objC", "valueH") // "valueB"
   *
   * @example
   *
   *   // config -> { objA: { propB: "valueA" }, "obj-c": "valueB" }
   *   // env -> { OBJA: "{\"propA\":\"valueB\"}", "OBJA_PROPB": "valueE", OBJ_C: "valueY" }
   *   program.getSetting("objA", "valueX") // { propA: "valueB" }
   *   program.getSetting("objA.propB", "valueX") // "valueE"
   *   program.getSetting("obj-c", "valueX") // "valueY"
   *
   * @param path dot-seperated object-path
   * @param default_value default value
   * @returns the setting, settings object, or provided default value
   */
  public getSettingOrEnv<T>(path: string, default_value: T): T;
  public getSettingOrEnv<T>(path: string, default_value?: T): T | undefined {
    const env = pathToEnv(path, this.envPrefix);
    if (env in process.env) {
      return parseInput(process.env[env]);
    }
    if (this[SymbolSettings].has(path)) {
      return this[SymbolSettings].get(path);
    }
    return default_value;
  }

  /**
   * Set value of a single setting at `path`.
   * @param path dot-seperated object-path
   * @param value value of setting
   */
  public setSetting<T>(path: string, value: T): void {
    this[SymbolSettings].set(path, value);
  }

  /**
   * Store an object of settings.
   * @param values An object containg zero or more settings to store.
   */
  public setSettings<T extends object>(values: T): void {
    this[SymbolSettings].set(values);
  }

  /**
   * Delete setting(s) at path.
   * @param path dot-seperated object-path
   */
  public deleteSetting(path: string): void {
    this[SymbolSettings].delete(path);
  }

  /**
   * Find all object-paths matching `pattern`.
   * @param pattern Glob pattern matching object paths
   * @returns the matching paths
   */
  public findSettings(pattern: string): string[] {
    throw new Error("Feature not yet implemented");
  }

  /**
   * Resets all settings to defaults.
   */
  public resetSettings(): void {
    this[SymbolSettings].all = { ...this[SymbolDefaultSettings] };
  }

  /**
   * Add startup steps to preform for program. If one or more steps returns a
   * function, they will be added as shutdown steps, but at the start, and in
   * reverse order.
   * @param steps Steps to add
   * @returns this, so it is chainable
   */
  public addStartupSteps(...steps: StartupHandler[]): this {
    this.startupSteps.push(...steps);
    return this;
  }

  /**
   * Add shutdown steps to preform for program.
   * @param steps Steps to add
   */
  public addShutdownSteps(...steps: ShutdownHandler[]): this {
    this.shutdownSteps.push(...steps);
    return this;
  }

  /**
   * Sets the error handler.
   * @param onError The new handler
   */
  public setErrorHandler(onError: ErrorHandler): this {
    this.onError = onError;
    return this;
  }

  /**
   * Run startup routine.
   *
   * If any errors occur, it will abort the procedure and stop the loader.
   * It will NEVER ever throw, but will instead pass the error to the pre-set
   * error handler for it to handle before terminating the process.
   * @param attach Attach handlers to global process.
   */
  public async start(attach: boolean = true): Promise<void | never> {
    if (this.isRunning || this.isShutdownRunning) {
      return;
    }
    (this.isRunning as boolean) = true;
    try {
      if (attach) {
        process.on("SIGINT", async() => this.stop());
        process.on("SIGTERM", async() => this.stop());
        process.stdin.on("end", async() => this.stop());
      }
      const timeout = this.getSetting("runtime.startupTimeout", 2000);
      let step = 0;
      const length = this.startupSteps.length;
      for (const fn of this.startupSteps) {
        const result = await rejectAfter(
          fn(this, step, length),
          timeout,
          new Error(`Startup halted at step ${step++}`),
        );
        if (typeof result === "function") {
          this.shutdownSteps.unshift(result);
        }
      }
    } catch (error) {
      return this.stop(error);
    }
  }

  /**
   * Run shutdown routine.
   *
   * If any error is provided as an argument or occurs under the shutdown steps,
   * then the rest of the steps is skipped and the pre-set error handler is
   * called with the error.
   * @param error Any reason for skipping the shutdown routine.
   */
  public async stop(error?: any): Promise<never> {
    if (!this.isRunning || this.isShutdownRunning) {
      return void 0 as never;
    }
    (this.isRunning as boolean) = false;
    (this.isShutdownRunning as boolean) = true;
    if (error === undefined) {
      try {
        const timeout = this.getSetting("runtime.shutdownTimeout", 2000);
        let step = 0;
        const length = this.shutdownSteps.length;
        for (const fn of this.shutdownSteps) {
          await rejectAfter(fn(this, step, length), timeout, new Error(`Shutdown halted at step ${step++}`));
        }
      } catch (err) {
        error = err;
      }
    }
    if (error !== undefined) {
      await this.onError(error);
    }
    return process.exit(error !== undefined ?
      typeof error === "object" && typeof error.exitCode === "number" && error.exitCode || 1 : 0,
    );
  }

  //#endregion methods
  //#region static methods

  /**
   * Initialise a new instance and run its startup routine.
   * @param options Constructor options
   * @param attach Attach handlers to global process.
   */
  public static async start(options: IScriptLoaderOptions, attach?: boolean): Promise<ScriptLoader | never> {
    const loader = new ScriptLoader(options);
    await loader.start(attach);
    return loader;
  }

  //#endregion static methods
}

//#endregion classes
//#region functions

/**
 * Creates a CLI for multiple scripts using the same config store.
 *
 * @param options Options for
 */
export function createCLI(options: ICLIOptions): void;
export function createCLI({
  argv,
  configPath,
  defaultSettings,
  collection,
  resolveFrom = "",
  scriptsRoot = "./scripts",
}: ICLIOptions): void {
  resolveFrom = resolve(resolveFrom);
  scriptsRoot = resolve(resolveFrom, scriptsRoot);
  const program = new Command();
  const loader = new ScriptLoader({ configPath, defaultSettings, collection, resolveFrom });
  const setCwd = () => {
    const options: { cwd?: string } = program.opts() as any;
    if (options.cwd) {
      const cwd = resolve(options.cwd);
      process.chdir(cwd);
    }
  };

  program
    .version(loader.version)
    .description(loader.description)
    .option("-C --cwd <path>", "change working directiory")
  ;

  const entries = readdirSync(scriptsRoot);
  const regex = /^(\w[\w-]+)\.[jt]s$/;
  const scripts = entries.filter((e) => regex.test(e)).map((e) => regex.exec(e)![1]);
  program
    .command(`start [${scripts.join("|")}]`)
    .description(`start one of the following scripts: ${scripts.join(", ")}`)
    .action(setCwd)
    .action((script, ...args) => {
      if (scripts.includes(script)) {
        return import(join(scriptsRoot, `${script}`));
      }
      const command: Command = args.pop();
      command.help();
    })
  ;

  const config = program
    .command("config")
    .alias("settings")
    .description("manipulate configuration for program")
    .action(setCwd)
    .action((...args) => {
      if (args[0] instanceof Command) {
        args[0].help();
      }
    })
  ;

  config
    .command("set <path> [value]", "set value of given dot-seperated object-path")
    .action((_, path, value) => {
      if (_ !== "set") {
        return;
      }
      try {
        if (typeof value === "object") {
          value = undefined;
        }
        value = parseInput(value);
        loader.setSetting(path, value);
        logColor(loader.getSetting(path));
      } catch (error) {
        console.error(error);
      }
    })
  ;

  config
    .command("get <path>", "get value of given dot-seperated object-path")
    .action((_, path) => {
      if (_ !== "get") {
        return;
      }
      try {
        logColor(loader.getSetting(path));
      } catch (error) {
        console.error(error);
      }
    })
  ;

  config
    .command("has <path>", "check if object-path leads to an value")
    .action((_, path) => {
      if (_ !== "has") {
        return;
      }
      try {
        logColor(loader.hasSetting(path));
      } catch (error) {
        console.error(error);
      }
    })
  ;

  config
    .command("delete <path>", "deletes value of given dot-seperated object-path")
    .action((_, path) => {
      if (_ !== "delete") {
        return;
      }
      try {
        loader.deleteSetting(path);
      } catch (error) {
        console.error(error);
      }
    })
  ;

  config
    .command("list [path]", "lists all (sub-)config names for root or object-path")
    .action((_, path) => {
      if (_ !== "list") {
        return;
      }
      if (typeof path === "string") {
        const val = loader.getSetting(path, {});
        if (typeof val === "object") {
          for (const [key, value] of Object.entries(val)) {
            logColor({ key, type: typeof value });
          }
        }
      } else {
        for (const [key, value] of Object.entries(loader[SymbolSettings].all)) {
          logColor({ key, type: typeof value });
        }
      }
    })
  ;

  config
    .command("reset", "reset configuration back to defaults")
    .action((_) => {
      if (_ !== "reset") {
        return;
      }
      try {
        loader.resetSettings();
      } catch (error) {
        console.error(error);
      }
    })
  ;

  if (!process.argv.slice(2).length) {
    program.help();
  }
  else {
    program.parse(argv);
  }
}

/**
 * Rejects `promise` after `delay`.
 */
async function rejectAfter<T>(promise: Await<T>, delay: number = 1000, error?: any) {
  return Promise.race<T>([
    promise,
    new Promise((_, reject) => setTimeout(reject, delay, error)),
  ]);
}

function readJSON<T>(path: string): T | undefined {
  if (isAbsolute(path) && existsSync(path)) {
    return JSON.parse(readFileSync(path, "utf8"));
  }
}

function logColor(message) {
  console.log(inspect(message, { colors: true }));
}

function parseInput<T = string>(input?: string): T | undefined {
  if (typeof input === "string") {
    if (PARSE_IF_REGEX.test(input)) {
      return JSON.parse(input);
    }
    return input as any;
  }
}

function pathToEnv(path: string, prefix: string = ""): string {
  return `${prefix}${path.replace(/[-\.]/g, "_").toUpperCase()}`;
}

//#endregion functions
//#region types

/**
 * Each startup handler is provided with the program that runs it, and a function to stop the program.
 * The safest way to shutdown here is to return after calling the provided stop function.
 */
export type StartupHandler = (program: ScriptLoader, stepIndex: number, totalSteps: number)
  => Await<ShutdownHandler | void>;

/**
 * Each shutdown handler is provied with the program that runs it.
 */
export type ShutdownHandler = (program: ScriptLoader, stepIndex: number, totalSteps: number)
  => Await<void>;

/**
 * Handles any error thrown by startup/shutdown steps.
 */
export type ErrorHandler = (error: any) => any;

/**
 * Value `T` is only truly available when awaited (or wrapped in Promise.resolve())
 */
type Await<T> = T | Promise<T> | PromiseLike<T>;

//#endregion types
//#region interfaces

export interface IScriptLoaderOptions {
  /**
   * Either an object with the collection info, or a path to a JSON-file
   * containing said info. The path can either be relative to `resolveFrom` or
   * absolute.
   */
  collection?: ScriptCollectionInfo | string;
  /**
   * Where to store config. The path can either be relative to `resolveFrom` or
   * absolute.
   *
   * If this is not set, the config will be stored in its default location at
   * `~/.config/<info.name>/config.json`.
   */
  configPath?: string;
  /**
   * Either an object with settings, or a path to a JSON-file containing the
   * settings. The path can either be relative to `resolveFrom` or absolute.
   */
  defaultSettings?: object | string;
  /**
   * Handles error thrown in either startup or shutdown routines.
   */
  onError?: ErrorHandler;
  /**
   * Prefix environment variables for settings with this string.
   */
  prefixEnv?: string;
  /**
   * Where to resolve paths from.
   * Defaults to current working directory.
   */
  resolveFrom?: string;
  /**
   * Provide information for current script.
   */
  script?: ScriptInfo;
  /**
   * Pre-set any steps for shutdown routine.
   */
  shutdownSteps?: ShutdownHandler[] | Iterable<ShutdownHandler> | IterableIterator<ShutdownHandler>;
  /**
   * Pre-set any steps for startup routine.
   */
  startupSteps?: StartupHandler[] | Iterable<StartupHandler> | IterableIterator<StartupHandler>;
}

export interface ICLIOptions {
  /**
   * Arguments for program to process.
   */
  argv: string[];
  /**
   * Either an object with the collection info, or a path to a JSON-file
   * containing said info. The path can either be relative to `resolveFrom` or
   * absolute.
   */
  collection?: ScriptCollectionInfo | string;
  /**
   * Where to store config. The path can either be relative to `resolveFrom` or
   * absolute.
   *
   * If this is not set, the config will be stored in its default location at
   * `~/.config/<info.name>/config.json`.
   */
  configPath?: string;
  /**
   * Either an object with settings, or a path to a JSON-file containing the
   * settings. The path can either be relative to `resolveFrom` or absolute.
   */
  defaultSettings?: object | string;
  /**
   * Prefix environment variables for settings with this string.
   */
  prefixEnv?: string;
  /**
   * Resolves relative paths relative to this value.
   */
  resolveFrom?: string;
  /**
   * Root folder for scripts.
   */
  scriptsRoot?: string;
}

interface ScriptInfo {
  /**
   * Provide a name for current script.
   */
  name?: string;
  /**
   * Provide a description for current script.
   */
  description?: string;
}

interface ScriptCollectionInfo {
  name: string;
  description: string;
  version: string;
}

//#endregion interfaces
