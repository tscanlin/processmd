# processto

![Build Status](https://travis-ci.org/tscanlin/processto.svg?branch=master)

Processto uses [globby](https://github.com/sindresorhus/globby) to process directories of markdown and yaml files to a mirrored tree of JSON files. Additionally, with the `convertMode: "source"` option you can convert back from json to the input markdown and yaml files. This is mostly useful for blogs or static content for websites or other places where json is used but the readability of yaml is useful.


## Getting Started

Install with npm

```bash
npm install --save-dev processto
```


## Usage

You can then use the cli

```bash
processto \"content/**/*.{yml,md}\" --outputDir output
```

A markdown file such as this:
```
---
test: frontmatter
draft: true
num: 1
---

# processto

Process a directory of markdown *and* yaml files to JSON files
```

Would become this json:
```
{
  "test":"frontmatter",
  "draft":true,
  "num":1,
  "bodyContent":"# processto\r\n\r\nProcess a directory of markdown *and* yaml files to JSON files",
  "bodyHtml":"<h1 id=\"processto\">processto</h1>\n<p>Process a directory of markdown <em>and</em> yaml files to JSON files</p>\n",
  "title":"processto",
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

Processto will also output some summary data as a json object to stdout when used with the `--stdout` option. Then you can direct that to a file.

```bash
processto \"content/**/*.{yml,md}\" --stdout --outputDir output > summary.json
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
  // Prefix for output filenames, default is no prefix, just the original filename.
  filenamePrefix: '',
  // For markdown files how many characters should be included in an add `preview` property. 0 for no preview.
  preview: 0,
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
  // Custom markdown renderer function, null to use the default: `marked`.
  markdownRenderer: null,
}
```


## Alternative options

As you can imagine, there are a number of other projects that already accomplish similar functionality including: [markdown-to-json](https://github.com/scottstanfield/markdown-to-json), [md-to-json](https://www.npmjs.com/package/md-to-json), and [gulp-markdown-to-json](https://www.npmjs.com/package/gulp-markdown-to-json). But none of those quite fit my needs and I didn't want to require gulp just for this.


Hope you enjoy!
