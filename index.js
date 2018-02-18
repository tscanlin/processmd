'use strict'

const fs = require('fs')
const path = require('path')
const globby = require('globby')
const MarkdownIt = require('markdown-it')
const markdownItHighlight = require('markdown-it-highlight').default
const yaml = require('js-yaml')
const mkdirp = require('mkdirp')
const removeMd = require('remove-markdown')
const defaultOptions = require('./defaultOptions')

const EXTENSIONS = {
  JSON: '.json',
  MD: '.md',
  YML: '.yml'
}
const NEWLINE = '\n'
const FRONTMATTER_SEPERATOR = '---'

const SOURCE_MODE = 'source'

// Main function
function processmd (options, callback) {
  options = Object.assign({}, defaultOptions, options)

  const markdownIt = MarkdownIt(options.markdownOptions)

  if (options.highlightCode) {
    markdownIt.use(markdownItHighlight)
  }
  if (options.headingIds) {
    markdownIt.use(require('markdown-it-named-headings'))
  }

  options.markdownRenderer = options.markdownRenderer || function mdRender (str) { return markdownIt.render(str) }

  const globs = (options.files || []).concat(options._ || [])
  if (globs.length === 0) {
    throw new Error('You must pass file patterns in to be processed.')
  }

  const p = new Promise(function (resolve, reject) {
    globby(globs).then(function (result) {
      const commonDir = findCommonDir(result)
      options._commonDir = commonDir

      if (options.watch) {
        const d = debounce(
          function () {
            processOutput()
          },
          options.watchDebounce,
          true
        )

        // fs.watch isn't supported on linux.
        try {
          fs.watch(commonDir, { recursive: true }, function (event, filename) {
            d()
          })
        } catch (e) {
          console.log(e)
        }
      }

      let processingFunc = processYamlAndMarkdown
      if (typeof options._customProcessingFunc === 'function') {
        processingFunc = options._customProcessingFunc // used for testing.
      } else if (options.convertMode === SOURCE_MODE) {
        processingFunc = processJson
      }

      function processOutput () {
        const summaryObj = {}
        summaryObj.fileMap = {}
        summaryObj.sourceFileArray = result
        let finishCount = 0
        result.forEach(function (file, i) {
          processingFunc(file, options, function (newFile, content) {
            finishCount++

            // Replace backslashes with forward slashes to keep windows consistent.
            const filename = replaceBackslashes(newFile)

            // Remove body props from summary.
            if (!options.includeBodyProps) {
              content = removeBodyProps(content)
            }

            summaryObj.fileMap[filename] = options.convertMode === SOURCE_MODE
              ? content
              : JSON.parse(content)

            if (finishCount === result.length) {
              if (options.summaryOutput) {
                writeFileContent(options.summaryOutput, JSON.stringify(summaryObj, null, 2), function (e, d) {
                  resolve(summaryObj)
                })
              } else {
                resolve(summaryObj)
              }
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

function processYamlAndMarkdown (file, options, cb) {
  readFileContent(file, (err, file, fileContent) => {
    if (err) throw (err)
    const hasFrontmatter = fileContent.indexOf(FRONTMATTER_SEPERATOR) === 0
    const isYaml = file.endsWith('.yaml') || file.endsWith('.yml')
    let content = fileContent.trim()
    let frontmatter = {}
    let jsonData = {}

    // Markdown.
    if (hasFrontmatter) {
      const splitContent = fileContent.match(/^-{3}[\s\S]+?-{3}/)
      frontmatter = yaml.safeLoad(splitContent[0].substring(3, splitContent[0].length - 3))
      content = fileContent.substring(splitContent[0].length).trim()
    }

    if (isYaml) {
      jsonData = yaml.safeLoad(content)
    } else {
      jsonData = Object.assign({}, frontmatter, {
        bodyContent: content,
        bodyHtml: options.markdownRenderer(content)
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
        parsedPath.base.replace(sourceExt, EXTENSIONS.JSON)
    })
    const newPath = path.format(newPathObj)

    if (options.preview > 0 && jsonData.bodyContent) {
      const preview = removeMd(jsonData.bodyContent).split('\r').join('') // fix Windows eol.
      let splitPoint = 0
      let i = splitPoint
      while (i < options.preview) {
        i++
        if (preview[i] === ' ') {
          splitPoint = i
        }
        if (preview[i] === undefined) {
          splitPoint = i
          break
        }
      }
      jsonData.preview = preview.substring(0, splitPoint).trim()
    }
    if (options.includeTitle && jsonData.bodyContent) {
      jsonData.title = jsonData.title || jsonData.bodyHtml.match(/>(.*?)<\//)[1]
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
    writeFileContent(newPath, JSON.stringify(jsonData, null, 2), function (e, d) {
      cb(newPath, JSON.stringify(jsonData))
    })
  })
}

function processJson (file, options, cb) {
  readFileContent(file, (err, file, fileContent) => {
    if (err) throw (err)
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
          FRONTMATTER_SEPERATOR + NEWLINE +
          cleanYaml +
          FRONTMATTER_SEPERATOR + NEWLINE + NEWLINE +
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
        parsedPath.base.replace(sourceExt, extension)
    })
    const newPath = path.format(newPathObj)

    writeFileContent(newPath, newContent, function (e, d) {
      cb(newPath, newContent)
    })
  })
}

function cleanFileProps (obj) {
  delete obj.dir
  delete obj.base
  delete obj.ext
  delete obj.sourceBase
  delete obj.sourceExt
  return obj
}

function cleanMarkdownProps (obj) {
  delete obj.bodyContent
  delete obj.bodyHtml
  delete obj.preview
  delete obj.title
  return obj
}

// Read a file making sure that it is not a directory first.
function readFileContent (file, cb) {
  if (!file || fs.lstatSync(file).isDirectory()) {
    return null
  }
  fs.readFile(file, (err, data) => {
    cb(err, file, data && data.toString())
  })
}

// Write a file making sure the directory exists first.
function writeFileContent (file, content, cb) {
  mkdirp(path.dirname(file), function (err) {
    if (err) throw (err)
    fs.writeFile(file, content, (e, data) => {
      cb(e, data)
    })
  })
}

// Replace backslashes for windows paths.
function replaceBackslashes (str) {
  return str.split('\\').join('/')
}

// Determine if its data for a markdown file.
function isMarkdown (data) {
  return Boolean(data.bodyContent && data.bodyHtml)
}

// Find the common parent directory given an array of files.
function findCommonDir (files) {
  const path = files.reduce((path, file, fileIndex) => {
    // If it's a file not in any directory then just skip it
    // by assigning the previous value.
    if (!file.includes('/')) {
      return path
    }

    // No path set yet
    if (!path && fileIndex === 0) {
      return file.substr(0, file.lastIndexOf('/') + 1)
    } else {
      // Get index of last shared character
      let sharedIndex = Array.from(path).findIndex((element, index) => {
        if (file[index] !== element) {
          return index - 1
        }
      })

      // Round to nearest full directory
      if (sharedIndex > -1) {
        sharedIndex = path.substr(0, sharedIndex).lastIndexOf('/')
      }

      // Return shared directory path
      if (sharedIndex > -1) {
        return path.substr(0, sharedIndex + 1)
      } else if (file.startsWith(path)) {
        return path
      }

      // No shared directory path
      return ''
    }
  }, '')

  return path
}

// Remove body props from summary.
function removeBodyProps (content) {
  try {
    const json = JSON.parse(content)
    delete json.bodyContent
    delete json.bodyHtml
    return JSON.stringify(json)
  } catch (e) { }
}

// Debounce from: https://davidwalsh.name/function-debounce
function debounce (func, wait, immediate) {
  var timeout
  return function () {
    var context = this
    var args = arguments
    var later = function () {
      timeout = null
      if (!immediate) func.apply(context, args)
    }
    var callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) func.apply(context, args)
  }
}

module.exports = {
  default: processmd,
  _readFileContent: readFileContent, // for testing.
  _writeFileContent: writeFileContent, // for testing.
  _isMarkdown: isMarkdown, // for testing.
  _findCommonDir: findCommonDir // for testing.
}
