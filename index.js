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
const NEWLINE = '\r\n'
const FRONTMATTER_SEPERATOR = '---\r\n'

const SOURCE_MODE = 'source'

marked.setOptions()

const defaultOptions = require('./defaultOptions')

// Main function
function processto(options, callback) {
  options = Object.assign({}, defaultOptions, options)

  const globs = (options.files || []).concat(options._)
  if (globs.length === 0) {
    throw new Error('You must pass file patterns in to be processed.')
  }

  const p = new Promise(function(resolve, reject) {
    // console.log(globs);
    globby(globs, {
      // matchBase: true
    }).then(function(result) {
      // console.log(result)
      const commonDir = findCommonDir(result);
      options._commonDir = commonDir
      let processingFunc = processYamlAndMarkdown
      if (typeof options._customProcessingFunc === 'function') {
        processingFunc = options._customProcessingFunc // used for testing.
      } else if (options.convertMode === SOURCE_MODE) {
        processingFunc = processJson
      }

      const summaryObj = {}
      summaryObj.fileMap = {}
      summaryObj.sourceFileArray = result
      let finishCount = 0
      result.forEach(function(file, i) {
        processingFunc(file, options, function(newFile, content) {
          finishCount++
          summaryObj.fileMap[newFile] = content

          if (finishCount === result.length) {
            resolve(summaryObj)
          }
        })
      })
    })
  })

  // Enable callback support too.
  if (callback) {
    p.then(result => {
      callback(null, result)
    })
  }

  return p
}

function processYamlAndMarkdown(file, options, cb) {
  readFileContent(file, (err, file, fileContent) => {
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

    // Todo make this a default callback
    writeFileContent(newPath, JSON.stringify(jsonData), function(e, d) {
      cb(newPath, JSON.stringify(jsonData))
    })
  })
}

function processJson(file, options, cb) {
  readFileContent(file, (err, file, fileContent) => {
    const fileData = JSON.parse(fileContent)

    // Process content.
    let newContent = ''
    const cleanProps = cleanFileProps(cleanMarkdownProps(Object.assign({}, fileData)))
    const cleanYaml = yaml.safeDump(cleanProps)
    let extension = '.yml'
    if (isMarkdown(fileData)) {
      newContent += fileData.bodyContent + NEWLINE
      if (Object.keys(cleanProps).length > 0) {
        newContent = FRONTMATTER_SEPERATOR + cleanYaml + FRONTMATTER_SEPERATOR + NEWLINE + newContent
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

    writeFileContent(newPath, newContent, function(e, d) {
      cb(newPath, newContent)
    })
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


// Read a file making sure that it is not a directory first.
function readFileContent(file, cb) {
  if (fs.lstatSync(file).isDirectory()) {
    return null
  }
  fs.readFile(file, (err, data) => {
    cb(err, file, data && data.toString())
  })
}

// Write a file making sure the directory exists first.
function writeFileContent(file, content, cb) {
  mkdirp(path.dirname(file), function(err) {
    fs.writeFile(file, content, (e, data) => {
      cb(e, data)
    })
  })
}

// Determine if its data for a markdown file.
function isMarkdown(data) {
  return Boolean(data.bodyContent && data.bodyHtml)
}

// Find the common parent directory given an array of files.
function findCommonDir(files) {
  return files.reduce(function(p, c) {
    return !p ? c : p.split('').filter((letter, i) => letter === c[i]).join('')
  }, null)
}

module.exports = {
  default: processto,
  _readFileContent: readFileContent, // for testing.
  _writeFileContent: writeFileContent, // for testing.
  _isMarkdown: isMarkdown, // for testing.
  _findCommonDir: findCommonDir, // for testing.
}
