![JUKE build](https://github.com/stylemistake/juke-build/blob/master/assets/juke-build.png)

> The AKE-less Build System for JavaScript and Node.js.
> Inspired by [NUKE](https://nuke.build/).

This project is a work in progress, take a look at our
[roadmap](https://github.com/stylemistake/juke-build/projects/1).

## Project goals

### Simplicity

Everything should be as simple as possible in all technical aspects. Builds
are written in pure JavaScript and provide only the bare minimum for getting
the job done.

Currently it packs the following:

- A robust dependency model between targets
- File timestamp checker for inputs/outputs
- Built-in CLI argument (and environment) parser with a strongly typed
Parameter API.
- Asynchronous execution of external programs via `Juke.exec()`

You can bring your own tools into the mix, e.g. the glorious
[google/zx](https://github.com/google/zx), or native JavaScript tooling, e.g.
[webpack](https://webpack.js.org/), with no restrictions imposed by our build
framework.

### Minimal dependencies

Build system should be native to JavaScript and Node.js, and require nothing
but the Node.js executable, i.e. no dependency on npm or TypeScript compiler.

### Strongly typed

Strongly typed API with fully instrospectible build scripts that are written
in plain JavaScript, which allows us to parse the build script and generate
definition files for tighter integration with other tooling (e.g. CI).

## How to build

```
./build.cjs
```

## General usage

Copy contents of the `dist` folder anywhere you want to use Juke, then
create a javascript file for the build script with the following contents:

```ts
const Juke = require('./juke');

// TODO: Declare targets here

// Build runs after calling setup.
Juke.setup();
```

### Create targets

Target is a simple container for your build script, that defines how it should be
executed in relation to other targets. It may have dependencies on other targets,
required parameters and various other conditions for executing the target.

All targets must have a `name`, which is used in CLI for specifying the target.

```ts
const Target = Juke.createTarget({
  name: 'foo',
  executes: async () => {
    console.log('Hello, world!');
  },
});
```

### Declare dependencies

```ts
const Target = Juke.createTarget({
  dependsOn: [OtherTarget],
  // ...
});
```

### Set a default target

When no target is provided via CLI, Juke will execute the default target.

```ts
const Target = Juke.createTarget({ ... });

Juke.setup({
  default: Target,
});
```

### Declare file inputs and outputs

If your target consumes and creates files, you can declare them on the target,
so it would check whether it actually needs to rebuild.

If any input file is newer than an output file, target will be rebuilt, otherwise
it will be skipped.

Supports globs.

```ts
const Target = Juke.createTarget({
  inputs: ['package.json', 'src/**/*.js'],
  outputs: ['dest/bundle.js'],
  // ...
});
```

### Create parameters

Available parameter types are: `string`, `number` and `boolean`.
Add a `[]` suffix to the type to make it an array.

To provide a parameter via CLI, you can either specify it by name
(i.e. `--name`), or its alias (i.e. `-N`). If parameter is not `boolean`,
a value is expected, which you can provide via `--name=value` or `-Nvalue`.

To fetch the parameter's value, you must use a `get` helper, which is a
property of the execution context - object that is passed to almost every
target field in Juke:

- `dependsOn`
- `inputs`
- `outputs`
- `onlyWhen`
- `executes`

```ts
const Parameter = Juke.createParameter({
  name: 'name',
  type: 'string[]',
  alias: 'N',
});

const Target = Juke.createTarget({
  name: 'foo',
  parameters: [Parameter],
  dependsOn: ({ get }) => [
    get(Parameter).includes('foo') && FooTarget,
  ],
  executes: async ({ get }) => {
    const values = get(Parameter);
    console.log('Parameter values:', values);
  },
  // ...
});
```

### Conditionally run targets

If you need more control over when the target builds, you can provide a custom
condition using `onlyWhen`. Target will build only when the condition is
`true`.

Function can be `async` if it has to be, target will wait for all promises to
resolve.

```ts
const Target = Juke.createTarget({
  onlyWhen: ({ get }) => get(BuildModeParameter) === BUILD_ALL,
  // ...
});
```

### Execute an external program

Juke provides a handy `Juke.exec` helper.

```ts
const Target = Juke.createTarget({
  name: 'foo',
  executes: async () => {
    await Juke.exec('yarn', ['install']);
  },
});
```

On program completion, you get its stdout and stderr. In case, when you need
to run a program just to parse its output, you can set a `silent` option to
stop it from piping its output to `stdio`.

```ts
const { stdout, stderr, combined } = await Juke.exec(command, ...args, {
  silent: true,
});
```

It throws by default if program has exited with a non-zero exit code
(or was killed by a non-EXIT signal). If uncatched, error propagates
through Juke and puts dependent targets into a failed state.

You can disable this behavior via:

```ts
const { code } = Juke.exec(command, ...args, {
  throw: false,
});
```

You can also simulate an exit code by rethrowing it yourself.

```ts
throw new Juke.ExitCode(1);
```

### Run the build

You can build targets by specifying their names via CLI.

Every flag that you specify via CLI is transformed into parameters, and their
names are canonically written in `--kebab-case`.

```
./build.js [globalFlags] task-1 [flagsLocalToTask1] task-2 [flagsLocalToTask2]
```

To specify an array of parameters, you can simply specify the same flag
multiple times:

```
./build.js task-1 --foo=A --foo=B
```

You can also specify parameters via the environment. Environment variable
names must be written in `CONSTANT_CASE`. If this parameter is an array,
you can use a comma to separate the values.

```
FOO=A,B ./build.js task-1
```

## Examples

[Our own build pipeline](https://github.com/stylemistake/juke-build/blob/master/build.cjs)

[/tg/station13 build pipeline](https://github.com/tgstation/tgstation/blob/master/tools/build/build.js)

<details>
  <summary>Screenshot</summary>
  <img alt="image" src="https://user-images.githubusercontent.com/1516236/123164088-26166580-d47b-11eb-9b03-b048274a4499.png">
</details>

## License

Source code is available under the **MIT** license.

The Authors retain all copyright to their respective work here submitted.
