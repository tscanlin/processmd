# processmd

![Build Status](https://travis-ci.org/tscanlin/processmd.svg?branch=master)

processmd uses [globby](https://github.com/sindresorhus/globby) and [markdown-it](https://github.com/markdown-it/markdown-it) to process directories of markdown and yaml files to a JSON files with html. It has many options to format the output as you like, you can convert a nested directory of yaml to json and optionally add a "summary" file with info about all the files. Additionally, with the `convertMode: "source"` option you can convert back from json to the input markdown and yaml files. This is mostly useful for blogs or static content for websites or other places where json is easier to use but the readability of yaml is useful.

Comparison to similar tools:

|  Package | Processes folder to single file  | Processes folder to multiple files | cli API  | Uses gulp | includes metadata about file |  Markdown preview |
|---|---|---|---|---|---|---|
| [markdown-to-json](https://www.npmjs.com/package/markdown-to-json) or [markdown-to-json-with-content](https://www.npmjs.com/package/markdown-to-json-with-content)  |  ✓  |  ×  |  ✓  | ×  | ×   |  ✓ |
|  [gulp-markdown-to-json](https://github.com/sparkartgroup/gulp-markdown-to-json) | ✓  |  ✓ | ×  |  ✓ |  ✓ | ×  |
| [markdown-json](https://www.npmjs.com/package/markdown-json)  | ✓  | ×  | ✓  | ×  |  × | ✓  |
| [**processmd**](https://github.com/tscanlin/processmd)  | ✓  | ✓  | ✓  | ×  |  ✓ | ✓  |

I'll note that processmd can also convert back from json to yaml and it has a suite of tests. If you know a tool that you think should be on this list please open a PR.

## Getting Started

Install with npm

```bash
npm install --save-dev processmd
```


## Usage

You can then use the cli

```bash
processmd "content/**/*.{yml,md}" --outputDir output
```

And watch files to automatically recompile them.

```bash
processmd "content/**/*.{yml,md}" --outputDir output --watch
```

With an input markdown file such as this:
```
---
test: frontmatter
draft: true
num: 1
---

# processmd

Process a directory of markdown *and* yaml files to JSON files
```

This would be the resulting JSON:
```
{
  "test":"frontmatter",
  "draft":true,
  "num":1,
  "bodyContent":"# processmd\r\n\r\nProcess a directory of markdown *and* yaml files to JSON files",
  "bodyHtml":"<h1 id=\"processmd\">processmd</h1>\n<p>Process a directory of markdown <em>and</em> yaml files to JSON files</p>\n",
  "title":"processmd",
  "dir":"test/data/output",
  "base":"frontmatter.json",
  "ext":".json",
  "sourceBase":"frontmatter.md",
  "sourceExt":".md"
}
```

And given the following input directory:
```bash
.
├── L1
│   ├── L2
│   │   └── test2.yml
│   └── test.yml
├── README.md
└── frontmatter.md
```

It would produce this directory output:
```bash
.
├── L1
│   ├── L2
│   │   └── test2.json
│   └── test.json
├── README.json
└── frontmatter.json
```

## Advanced Usage

processmd will also output some summary data as a json object to stdout when used with the `--stdout` option. Then you can direct that to a file.

```bash
processmd \"content/**/*.{yml,md}\" --stdout --outputDir output > summary.json
```

summary.json will contain:

```
{
  "fileMap":{
    "test/data/output/frontmatter.json":"{...}",
    "test/data/output/L1/test.json":"{...}",
    ...
  }
  "sourceFileArray":[
    "test/data/input/frontmatter.md",
    "test/data/input/L1/test.yml",
    ...
  }
```


## Options

```js
module.exports = {
  // The directory output will be processed to.
  outputDir: './dist',
  // Output location for the summary file (relative path to json file that has content from all files).
  summaryOutput: null,
  // Watch mode, recompile on file changes.
  watch: false,
  // Debounce timeout for watching files.
  watchDebounce: 1000,
  // Prefix for output filenames, default is no prefix, just the original filename.
  filenamePrefix: '',
  // For markdown files, rendering mathematical equations.
  renderLatex: true,
  // For markdown files, highlight code block.
  highlightCode: true,
  // For markdown files, how many characters should be included in an add `preview` property. 0 for no preview.
  preview: 0,
  // Option to override the preview delimeter to handle internationalization and add greater flexibility (default: ' ').
  previewDelimiter: ' ',
  // Include body props in summary file.
  includeBodyProps: false,
  // Include the markdown document title as `title` on the resulting json objects.
  includeTitle: true,
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
  // Custom markdown renderer function, null to use the default: `markdown-it`.
  markdownRenderer: null,
  // Options to pass to the default markdown processor, markdown-it.
  // See here for options: https://github.com/markdown-it/markdown-it#init-with-presets-and-options
  markdownOptions: {},
  // Include generated ids on headings.
  headingIds: false
}
```

To turn off options you can [prefix them with '--no-'](https://github.com/yargs/yargs/blob/master/docs/tricks.md#negate)

For example, if you want to disable code highlighting you would run:

```
$ processmd ReadMe.md --no-highlightCode
```

## Development

To update tests, add new test files to `test/data/input`, and run `npm run start && npm run back`

Enjoy!
