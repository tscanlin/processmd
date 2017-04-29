#!/usr/bin/env node 

const processto = require('./index.js').default
const defaultOptions = require('./defaultOptions.js')
// prettier-ignore
const argv = require('yargs')
  .usage('Usage: $0 <command> [options]').argv

if (process.argv && process.argv.length > 2) {
  const options = Object.assign({}, defaultOptions, argv)

  processto(options, (err, data) => {
    if (options.stdout) {
      // Indent JSON 2 spaces.
      process.stdout.write(JSON.stringify(data, null, 2))
    }
  })
} else {
  throw new Error('You need to pass arguments to css-razor')
}
