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
const NEWLINE = process.platform === 'win32' ? '\r\n' : '\n'
const FRONTMATTER_SEPERATOR = '---' + NEWLINE

const SOURCE_MODE = 'source'

// Highlighting with highlight.js

const defaultOptions = require('./defaultOptions')

// Main function
function processto(options, callback) {
  options = Object.assign({}, defaultOptions, options)

  // Init marked.
  let markedOptions = {}
  if (options.highlightCode) {
    markedOptions = {
      highlight: function (code) {
        return require('highlight.js').highlightAuto(code).value
      }
    }
  }
  marked.setOptions(markedOptions)

  options.markdownRenderer = options.markdownRenderer || marked

  const globs = (options.files || []).concat(options._)
  if (globs.length === 0) {
    throw new Error('You must pass file patterns in to be processed.')
  }

  const p = new Promise(function(resolve, reject) {
    globby(globs).then(function(result) {
      const commonDir = findCommonDir(result)
      options._commonDir = commonDir

      if (options.watch) {
        const d = debounce(function() {
          processOutput()
        }, 200, true)

        fs.watch(commonDir, function (event, filename) {
          d()
        })
      }

      let processingFunc = processYamlAndMarkdown
      if (typeof options._customProcessingFunc === 'function') {
        processingFunc = options._customProcessingFunc // used for testing.
      } else if (options.convertMode === SOURCE_MODE) {
        processingFunc = processJson
      }

      function processOutput() {
        const summaryObj = {}
        summaryObj.fileMap = {}
        summaryObj.sourceFileArray = result
        let finishCount = 0
        result.forEach(function(file, i) {
          processingFunc(file, options, function(newFile, content) {
            finishCount++
            // Replace backslashes with forward slashes to keep windows consistent.
            const filename = replaceBackslashes(newFile)
            summaryObj.fileMap[filename] = options.convertMode === SOURCE_MODE
              ? content
              : JSON.parse(content)

            if (finishCount === result.length) {
              resolve(summaryObj)
            }
          })
        })
      }

      processOutput()
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
        bodyHtml: options.markdownRenderer(content),
      })
    }

    // Rename to the new file.
    const baseFilename = file.replace(options._commonDir, '')
    const parsedPath = path.parse(path.join(options.outputDir, baseFilename))
    const sourceExt = parsedPath.ext
    const sourceBase = parsedPath.base
    const newPathObj = Object.assign({}, parsedPath, {
      ext: EXTENSIONS.JSON,
      base: options.filenamePrefix +
        parsedPath.base.replace(sourceExt, EXTENSIONS.JSON),
    })
    const newPath = path.format(newPathObj)

    if (options.preview > 0 && jsonData.bodyContent) {
      // TODO: These regular expressions could probably be better.
      jsonData.preview = jsonData.bodyHtml.match(/<p>(.*?)<\/p>/)[1]
      jsonData.preview = jsonData.preview.split(/<[^>]*>/).join('')
      jsonData.preview = jsonData.preview.substring(0, options.preview) + '…'
    }
    if (options.includeTitle && jsonData.bodyContent) {
      jsonData.title = jsonData.bodyHtml.match(/>(.*?)<\//)[1]
    }
    if (options.includeDir) {
      jsonData.dir = replaceBackslashes(path.dirname(newPath))
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

    // TODO: make this a default callback
    // 2 spaces indent for stringify.
    writeFileContent(newPath, JSON.stringify(jsonData, null, 2), function(e, d) {
      cb(newPath, JSON.stringify(jsonData))
    })
  })
}

function processJson(file, options, cb) {
  readFileContent(file, (err, file, fileContent) => {
    const fileData = JSON.parse(fileContent)

    // Process content.
    let newContent = ''
    const cleanProps = cleanFileProps(
      cleanMarkdownProps(Object.assign({}, fileData))
    )
    const cleanYaml = yaml.safeDump(cleanProps)
    let extension = '.yml'
    if (isMarkdown(fileData)) {
      newContent += fileData.bodyContent + NEWLINE
      if (Object.keys(cleanProps).length > 0) {
        newContent =
          FRONTMATTER_SEPERATOR +
          cleanYaml +
          FRONTMATTER_SEPERATOR +
          NEWLINE +
          newContent
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
      base: options.filenamePrefix +
        parsedPath.base.replace(sourceExt, extension),
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
  delete obj.preview
  delete obj.title
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

// Replace backslashes for windows paths.
function replaceBackslashes(str) {
  return str.split('\\').join('/')
}

// Determine if its data for a markdown file.
function isMarkdown(data) {
  return Boolean(data.bodyContent && data.bodyHtml)
}

// Find the common parent directory given an array of files.
function findCommonDir(files) {
  return files.reduce(function(p, c) {
    // If it's a file not in any directory then just skip it by assigning the previous value.
    if (c.indexOf('/') === -1) {
      return p
    }
    return !p ? c : p.split('').filter((letter, i) => letter === c[i]).join('')
  }, '')
}

// Debounce from: https://davidwalsh.name/function-debounce
function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
}

module.exports = {
  default: processto,
  _readFileContent: readFileContent, // for testing.
  _writeFileContent: writeFileContent, // for testing.
  _isMarkdown: isMarkdown, // for testing.
  _findCommonDir: findCommonDir, // for testing.
}
