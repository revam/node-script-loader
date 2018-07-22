/*!
 * program-helper
 * Copyright (c) 2018 Mikal Stordal <mikalstordal@gmail.com>
 */

import { Command } from "commander";
import * as ConfigStore from "configstore";
import { readdirSync } from "fs";
import { join, resolve } from "path";

const SymbolSettings = Symbol("settings");

/**
 * Value `T` is only truly available when awaited (or wrapped in Promise.resolve())
 */
type Await<T> = T | Promise<T> | PromiseLike<T>;
/**
 * Each startup handler is provided with the program that runs it, and a function to stop the program.
 * The safest way to shutdown here is to return after calling the provided stop function.
 */
export type StartupHandler = (program: Program) => Await<ShutdownHandler | any>;
/**
 * Each shutdown handler is provied with the program that runs it.
 */
export type ShutdownHandler = (program: Program) => any;
/**
 * Handles any error thrown by startup/shutdown steps.
 */
export type ErrorHandler = (error: any) => any;

/**
 * Program constructor options.
 */
export interface IProgramOptions {
  /**
   * Default settings for program.
   */
  defaultSettings?: any;
  /**
   * Override environment.
   */
  environment?: string;
}

/**
 * Helper class for controlling startup/shutdown routines of a program.
 */
export default class Program {
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
  /** @internal */
  private [SymbolSettings]: ConfigStore;

  /**
   * Current environment program was launched in. Collected from `$NODE_ENV` or
   * manually provided.
   */
  public readonly environment: string = process.env.NODE_ENV || "development";

  constructor(configName: string, options: IProgramOptions = {}) {
    if ("environment" in options && typeof options.environment === "string") {
      this.environment = options.environment;
    }
    this[SymbolSettings] = new ConfigStore(configName, options.defaultSettings);
  }

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

  /**
   * Checks if program has `path`.
   *
   * Example object-path
   *
   *   objA.propB => { objA: { propB: "value" } }
   *
   * @param path dot-seperated object-path
   */
  public hasSetting(path: string): boolean {
    return this[SymbolSettings].has(path);
  }

  /**
   * Get setting(s) at `path`, or undefined if not found.
   * @param path dot-seperated object-path
   */
  public getSetting<T>(path: string): T | undefined;
  /**
   * Get setting(s) at `path`, or value of `default_value` if not found.
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
   * Start program.
   */
  public async start(): Promise<void> {
    try {
      process.on("SIGINT", () => this.stop());
      process.on("SIGTERM", () => this.stop());
      const timeout =  this.getSetting("runtime.startupTimeout", 2000);
      let step = 1;
      for (const fn of this.startupSteps) {
        const result = await rejectAfter(
          fn(this),
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
   * Stop program.
   * @param error Any reason for skipping the shutdown routine.
   */
  public async stop(error?: any): Promise<never> {
    try {
      if (error !== undefined) {
        const timeout = this.getSetting("runtime.shutdownTimeout", 2000);
        let step = 1;
        for (const fn of this.shutdownSteps) {
          await rejectAfter(fn(this), timeout, new Error(`Shutdown halted at step ${step++}`));
        }
      }
    } catch (err) {
      error = err;
    } finally {
      if (error !== undefined) {
        await this.onError(error);
      }
      return process.exit(error !== undefined ?
        typeof error === "object" && typeof error.exitCode === "number" && error.exitCode || 1 : 0,
      );
    }
  }
}

/**
 * Creates a CLI for multiple scripts using the same config store.
 * @param scriptsRoot Folder containing scripts
 * @param pkg Package configuration
 * @param argv Arguments for command
 */
export function createCLI(
  scriptsRoot: string,
  pkg: {name: string, description: string, version: string},
  argv: string[],
) {
  scriptsRoot = resolve(scriptsRoot);
  const program = new Command();

  interface IProgramOptions {
    cwd?: string;
  }

  const setCwd = () => {
    const options: IProgramOptions = program.opts() as any;
    if (options.cwd) {
      const cwd = resolve(options.cwd);
      process.chdir(cwd);
    }
  };

  program
    .version(pkg.version)
    .description(pkg.description)
    .option("-C --cwd <path>", "change working directiory")
  ;

  const entries = readdirSync(scriptsRoot);
  const regex = /^(\w[\w-]*)\.[jt]s/;
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
    .description("manipulate configuration for program")
    // .action(setCwd)
    // .action((...args) => (args.pop() as Command).help())
  ;

  config
    .command("set <path> <value>", "set value of given dot-seperated object-path")
    .action(setCwd)
  ;

  config
    .command("get <path>", "get value of given dot-seperated object-path")
    .action(setCwd)
  ;

  config
    .command("has <path>", "check if object-path leads to an value")
    .action(setCwd)
  ;

  config
    .command("delete <path>", "deletes value of given dot-seperated object-path")
    .action(setCwd)
  ;

  config
    .command("find <glob pattern>", "finds all keys matching pattern")
    .action(setCwd)
  ;

  config
    .command("reset", "reset configuration")
    .action(setCwd)
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
function rejectAfter<T>(promise: Await<T>, delay: number = 1000, error?: any) {
  return Promise.race<T>([
    promise,
    new Promise((_, reject) => setTimeout(reject, delay, error)),
  ]);
}
