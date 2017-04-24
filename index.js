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

const FRONTMATTER_SEPERATOR = '---\n'

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
  // const ignoreList = defaultOptions.ignore.concat(options.ignore)
  options = Object.assign({}, defaultOptions, options)
  // options.ignore = ignoreList

  const globs = (options.files || []).concat(options._)
  // if ( !( (options.htmlRaw || options.html.length || options.webpages.length) && (options.cssRaw || options.css.length) ) ) {
  //   throw new Error('You must include HTML and CSS for input.')
  // }

  // if (options.convertMode === SOURCE_MODE) {
  //
  // }

  const p = new Promise(function(resolve, reject) {
    console.log(globs);
    globby(globs, {
      // matchBase: true
    }).then(function(result) {
      console.log(result)
      const commonDir = findCommonDir(result);
      const processingFunc = options.convertMode === SOURCE_MODE
        ? unProcessFile
        : processFile
      const processingCallbackFunc = options.convertMode === SOURCE_MODE
        ? () => {} //unProcessFileCallback
        : processFileCallback

      result.forEach(function(file) {
        processingFunc(file, commonDir, function(err, data) {
          processingCallbackFunc(file, EXTENSIONS.JSON, commonDir, data)
        })
      })
    })
  })

  function processFileCallback(file, ext, commonDir, data) {
    const baseFilename = file.replace(commonDir, '')
    // console.log(baseFilename, err, data)
    const parsedPath = path.parse(path.join(options.outputDir, baseFilename))
    const sourceExt = parsedPath.ext
    const sourceBase = parsedPath.base
    const newPathObj = Object.assign({}, parsedPath, {
      ext: ext,
      base: parsedPath.base.replace(sourceExt, ext)
    })
    const newPath = path.format(newPathObj)

    if (options.includeDir) {
      data.dir = path.dirname(newPath)
    }
    if (options.includeBase) {
      data.base = path.basename(newPath)
    }
    if (options.includeExt) {
      data.ext = ext
    }
    if (options.includeSourceBase) {
      data.sourceBase = sourceBase
    }
    if (options.includeSourceExt) {
      data.sourceExt = sourceExt
    }
    // console.log('@@@', newPathObj);

    writeFile(newPath, JSON.stringify(data), function(e, d) {
      // console.log(e,d);
    })
  }

  // Enable callback support too.
  if (callback) {
    p.then(result => {
      callback(null, result)
    })
  }

  return p
}

function processFile(file, commonDir, cb) {
  if (fs.lstatSync(file).isDirectory()) {
    return
  }
  fs.readFile(file, (err, data) => {
    const fileContent = data.toString()
    const hasFrontmatter = fileContent.indexOf(FRONTMATTER_SEPERATOR) === 0
    const isYaml = file.endsWith('.yaml') || file.endsWith('.yml')
    let content = fileContent.trim()
    let frontmatter = {}

    if (isYaml) {
      const data = yaml.safeLoad(content)
      // Callback for YAML.
      return cb(err, Object.assign({}, data))
    }

    if (hasFrontmatter) {
      let splitContent = fileContent.split(FRONTMATTER_SEPERATOR)
      // Remove first string in split content which is empty.
      if (splitContent[0] === '') {
        splitContent.shift()
      }
      frontmatter = yaml.safeLoad(splitContent[0])
      content = splitContent[1].trim()
    }

    // Callback for markdown.
    return cb(
      err,
      Object.assign({}, frontmatter, {
        bodyContent: content,
        bodyHtml: marked(content),
      })
    )
  })
}



function isMarkdown(data) {
  return Boolean(data.bodyContent && data.bodyHtml)
}

function unProcessFile(file, commonDir, cb) {
  if (fs.lstatSync(file).isDirectory()) {
    return
  }
  fs.readFile(file, (err, data) => {
    const fileContent = data.toString()
    const fileData = JSON.parse(fileContent)

    console.log(file);
    const parsedPath = path.parse(file)

    // if (isMarkdown) {
    //
    // }

    // console.log(parsedPath);
    // const yamlContent = yaml.safeDump(fileData)
    // console.log(yamlContent, isMarkdown(fileData));


    // console.log(fileData);
    // console.log(path.format(fileData));
    // const hasFrontmatter = fileContent.indexOf('---\n') === 0
    // const isYaml = file.endsWith('.yaml') || file.endsWith('.yml')
    // let content = fileContent.trim()
    // let frontmatter = {}

    // if (isYaml) {
    //   // Callback for YAML.
    //   return cb(err, Object.assign({}, data))
    // }
    //
    // if (hasFrontmatter) {
    //   let splitContent = fileContent.split('---\n')
    //   // Remove first string in split content which is empty.
    //   if (splitContent[0] === '') {
    //     splitContent.shift()
    //   }
    //   frontmatter = yaml.safeLoad(splitContent[0])
    //   content = splitContent[1].trim()
    // }
    //
    // // Callback for markdown.
    // return cb(
    //   err,
    //   Object.assign({}, frontmatter, {
    //     bodyContent: content,
    //     bodyHtml: marked(content),
    //   })
    // )
  })
}

// Write a file making sure the directory exists first.
function writeFile(file, content, cb) {
  mkdirp(path.dirname(file), function(err) {
    fs.writeFile(file, content, (e, data) => {
      cb(e, data)
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

// Find the common parent directory given an array of files.
function findCommonDir(files) {
  return files.reduce(function(p, c) {
    return !p ? c : p.split('').filter((letter, i) => letter === c[i]).join('')
  }, null)
}

module.exports = {
  default: processto,
}
