#!/usr/bin/env node

const processmd = require('./index.js').default
const defaultOptions = require('./defaultOptions.js')
// prettier-ignore
const argv = require('yargs')
  .usage('Usage: $0 <command> [options]').argv

if (process.argv && process.argv.length > 2) {
  const options = Object.assign({}, defaultOptions, argv)
  try {
    options.markdownOptions = JSON.parse(options.markdownOptions)
  } catch (err) {
    // noop: markdownOptions was not valid JSON, leave it as a string
  }

  processmd(options, (err, data) => {
    if (err) {
      process.stderr.write(JSON.stringify(err))
    }
    if (options.stdout) {
      // Indent JSON 2 spaces.
      process.stdout.write(JSON.stringify(data, null, 2))
    }
  })
} else {
  throw new Error('You need to pass arguments to processmd')
}
