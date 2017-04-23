'use strict';

const fs = require('fs')
const globby = require('globby')
const marked = require('marked')
const yaml = require('js-yaml')

marked.setOptions({
  // renderer: new marked.Renderer(),
  // gfm: true,
  // tables: true,
  // breaks: false,
  // pedantic: false,
  // sanitize: false,
  // smartLists: true,
  // smartypants: false
});

const defaultOptions = require('./defaultOptions')

function processto(options, callback) {
  // const ignoreList = defaultOptions.ignore.concat(options.ignore)
  options = Object.assign({}, defaultOptions, options)
  // options.ignore = ignoreList

  const files = (options.files || []).concat(options._)
  // if ( !( (options.htmlRaw || options.html.length || options.webpages.length) && (options.cssRaw || options.css.length) ) ) {
  //   throw new Error('You must include HTML and CSS for input.')
  // }

  const p = new Promise(function(resolve, reject) {

    globby(files).then(function(result) {
      console.log(result)
      result.forEach(function(file) {
        processFile(file, function(err, data) {
          console.log(err, data);
          // writeFile()
        })
      })
    })
  })

  // Enable callback support too.
  if (callback) {
    p.then((result) => {
      callback(null, result)
    })
  }

  return p
}

function processFile(file, cb) {
  // console.log(file);
  if (fs.lstatSync(file).isDirectory()) {
    // return cb(new Error(''))
    return
  }
  fs.readFile(file, (err, data) => {
    const fileContent = data.toString()
    // console.log(fileContent);
    const hasFrontmatter = fileContent.indexOf('---\n') === 0
    const isYaml = file.endsWith('.yaml') || file.endsWith('.yml')
    let content = fileContent.trim()
    let frontmatter = {}

    if (isYaml) {
      const data = yaml.safeLoad(content)
      return cb(err, Object.assign({}, data))
    }

    if (hasFrontmatter) {
      let splitContent = fileContent.split('---\n')
      // Remove first string in split content which is empty.
      if (splitContent[0] === '') {
        splitContent.shift()
      }
      frontmatter = yaml.safeLoad(splitContent[0])
      content = splitContent[1].trim()
    }

    return cb(err, Object.assign({}, frontmatter, {
      bodyContent: content,
      bodyHtml: marked(content)
    }))
  })
}

function writeFile(file, content, cb) {

}

module.exports = {
  default: processto,
}
