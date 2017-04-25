# processto

Use [globby](https://github.com/sindresorhus/globby) to process directories of markdown and yaml files to a mirrored tree of JSON files. Additionally, with the `convertMode: "source"` option you can convert back from json to the input markdown and yaml files. This is mostly useful for blogs or static sites.

This projects uses yargs, globby, js-yaml, and marked.


## Getting Started

Install with npm

```bash
npm install --save-dev processto
```


## Usage

You can then use the cli

```bash
processto \"content/**/*.{yml,md}\" --stdout --outputDir output
```

## Options

```js
module.exports = {
  // The directory output will be processed to.
  outputDir: './dist',
  // Include the directory as `dir` on the resulting json objects.
  includeDir: true,
  // Include the filename (.json) as `base` on the resulting json objects.
  includeBase: true,
  // Include the extension (.json) as `ext` on the resulting json objects.
  includeExt: true,
  // Include the source filename (.md / .yml) as `sourceBase` on the resulting json objects.
  includeSourceBase: true,
  // Include the source extension (.md / .yml) as `sourceExt` on the resulting json objects.
  includeSourceExt: true,
  // Convert mode. Possible options for this are 'json' or 'source'.
  convertMode: 'json',
  // Whether to output to stdout or not.
  stdout: false,
}
```
