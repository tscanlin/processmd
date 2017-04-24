'use strict'

const fs = require('fs')
const path = require('path')
const globby = require('globby')
const marked = require('marked')
const yaml = require('js-yaml')
const mkdirp = require('mkdirp')

const EXTENSIONS = {
  JSON: '.json',
  MD: '.md',
  YML: '.yml',
}

const SOURCE_MODE = 'source'

const FRONTMATTER_SEPERATOR = '---\r\n'


marked.setOptions(
  {
    // renderer: new marked.Renderer(),
    // gfm: true,
    // tables: true,
    // breaks: false,
    // pedantic: false,
    // sanitize: false,
    // smartLists: true,
    // smartypants: false
  }
)

const defaultOptions = require('./defaultOptions')


function processto(options, callback) {
  options = Object.assign({}, defaultOptions, options)

  const globs = (options.files || []).concat(options._)
  // if ( !( (options.htmlRaw || options.html.length || options.webpages.length) && (options.cssRaw || options.css.length) ) ) {
  //   throw new Error('You must include HTML and CSS for input.')
  // }

  const p = new Promise(function(resolve, reject) {
    console.log(globs);
    globby(globs, {
      // matchBase: true
    }).then(function(result) {
      console.log(result)
      const commonDir = findCommonDir(result);
      options._commonDir = commonDir
      const processingFunc = options.convertMode === SOURCE_MODE
        ? unProcessFile
        : processFile

      result.forEach(function(file) {
        processingFunc(file, options, function(err, data) { })
      })
    })
  })

  // Enable callback support too.
  // if (callback) {
  //   p.then(result => {
  //     callback(null, result)
  //   })
  // }

  return p
}

function processFile(file, options, cb) {
  if (fs.lstatSync(file).isDirectory()) {
    return
  }
  fs.readFile(file, (err, data) => {
    const fileContent = data.toString()
    const hasFrontmatter = fileContent.indexOf(FRONTMATTER_SEPERATOR) === 0
    const isYaml = file.endsWith('.yaml') || file.endsWith('.yml')
    let content = fileContent.trim()
    let frontmatter = {}
    let jsonData = {}

    // Markdown.
    if (hasFrontmatter) {
      let splitContent = fileContent.split(FRONTMATTER_SEPERATOR)
      // Remove first string in split content which is empty.
      if (splitContent[0] === '') {
        splitContent.shift()
      }
      frontmatter = yaml.safeLoad(splitContent[0])
      content = splitContent[1].trim()
    }

    if (isYaml) {
      jsonData = yaml.safeLoad(content)
    } else {
      jsonData = Object.assign({}, frontmatter, {
        bodyContent: content,
        bodyHtml: marked(content),
      })
    }

    // Rename to the new file.
    const baseFilename = file.replace(options._commonDir, '')
    const parsedPath = path.parse(path.join(options.outputDir, baseFilename))
    const sourceExt = parsedPath.ext
    const sourceBase = parsedPath.base
    const newPathObj = Object.assign({}, parsedPath, {
      ext: EXTENSIONS.JSON,
      base: parsedPath.base.replace(sourceExt, EXTENSIONS.JSON)
    })
    const newPath = path.format(newPathObj)

    if (options.includeDir) {
      jsonData.dir = path.dirname(newPath)
    }
    if (options.includeBase) {
      jsonData.base = path.basename(newPath)
    }
    if (options.includeExt) {
      jsonData.ext = EXTENSIONS.JSON
    }
    if (options.includeSourceBase) {
      jsonData.sourceBase = sourceBase
    }
    if (options.includeSourceExt) {
      jsonData.sourceExt = sourceExt
    }

    writeFile(newPath, JSON.stringify(jsonData), cb)
  })
}

function unProcessFile(file, options, cb) {
  if (fs.lstatSync(file).isDirectory()) {
    return
  }
  fs.readFile(file, (err, data) => {
    const fileContent = data.toString()
    const fileData = JSON.parse(fileContent)

    // Process content.
    let newContent = ''
    const cleanProps = cleanFileProps(cleanMarkdownProps(Object.assign({}, fileData)))
    const cleanYaml = yaml.safeDump(cleanProps)
    let extension = '.yml'
    if (isMarkdown(fileData)) {
      newContent += fileData.bodyContent
      if (Object.keys(cleanProps).length > 0) {
        newContent = FRONTMATTER_SEPERATOR + cleanYaml + FRONTMATTER_SEPERATOR + '\n' + fileData.bodyContent
      }
      extension = '.md'
    } else {
      newContent = cleanYaml
    }

    // Rename to the new file.
    const baseFilename = file.replace(options._commonDir, '')
    const parsedPath = path.parse(path.join(options.outputDir, baseFilename))
    const sourceExt = parsedPath.ext
    // const sourceBase = parsedPath.base
    const newPathObj = Object.assign({}, parsedPath, {
      ext: extension,
      base: parsedPath.base.replace(sourceExt, extension)
    })
    const newPath = path.format(newPathObj)

    writeFile(newPath, newContent, cb)
  })
}

function cleanFileProps(obj) {
  delete obj.dir
  delete obj.base
  delete obj.ext
  delete obj.sourceBase
  delete obj.sourceExt
  return obj
}

function cleanMarkdownProps(obj) {
  delete obj.bodyContent
  delete obj.bodyHtml
  return obj
}

// Determine if its data for a markdown file.
function isMarkdown(data) {
  return Boolean(data.bodyContent && data.bodyHtml)
}

// Write a file making sure the directory exists first.
function writeFile(file, content, cb) {
  mkdirp(path.dirname(file), function(err) {
    fs.writeFile(file, content, (e, data) => {
      cb(e, data)
    })
  })
}

// Find the common parent directory given an array of files.
function findCommonDir(files) {
  return files.reduce(function(p, c) {
    return !p ? c : p.split('').filter((letter, i) => letter === c[i]).join('')
  }, null)
}

module.exports = {
  default: processto,
}
