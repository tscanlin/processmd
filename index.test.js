const spawn = require('child_process').spawn
const processmdLib = require('./index')

const outputJson = require('./test/data/output.json')
const outputSummaryJson = require('./test/data/outputSummary.json')
const backJson = require('./test/data/back.json')

describe('processmd', () => {
  it('should process a directory to JSON properly', done => {
    const cli = spawn('node', [
      './cli.js',
      'test/data/input/**/*.{yml,md}',
      '--stdout',
      '--outputDir',
      'test/data/output'
    ])

    cli.stdout.on('data', data => {
      const parsedData = JSON.parse(data.toString())
      expect(parsedData.sourceFileArray).toEqual(outputJson.sourceFileArray)
      Object.keys(parsedData.fileMap).sort().forEach(key => {
        Object.keys(parsedData.fileMap[key]).sort().forEach(prop => {
          if (
            typeof parsedData.fileMap[key][prop] === 'string' &&
            (prop === 'bodyHtml' || prop === 'bodyContent')
          ) {
            // Fix for windows breaking tests with different newline character.
            expect(
              parsedData.fileMap[key][prop].split('\r\n').join('\n')
            ).toEqual(outputJson.fileMap[key][prop].split('\r\n').join('\n'))
          } else {
            expect(parsedData.fileMap[key][prop]).toEqual(
              outputJson.fileMap[key][prop]
            )
          }
        })
      })
    })

    cli.on('close', code => {
      expect(code).toEqual(0)
      done()
    })
  })

  it('should process a directory to JSON properly with a summary file', done => {
    const cli = spawn('node', [
      './cli.js',
      'test/data/input/**/*.{yml,md}',
      '--stdout',
      '--outputDir',
      'test/data/output',
      '--preview',
      '40'
    ])

    cli.stdout.on('data', data => {
      const parsedData = JSON.parse(data.toString())
      expect(parsedData.sourceFileArray).toEqual(outputSummaryJson.sourceFileArray)
      Object.keys(parsedData.fileMap).sort().forEach(key => {
        Object.keys(parsedData.fileMap[key]).sort().forEach(prop => {
          if (
            typeof parsedData.fileMap[key][prop] === 'string' &&
            (prop === 'bodyHtml' || prop === 'bodyContent')
          ) {
            // Fix for windows breaking tests with different newline character.
            expect(
              parsedData.fileMap[key][prop].split('\r\n').join('\n')
            ).toEqual(outputSummaryJson.fileMap[key][prop].split('\r\n').join('\n'))
          } else {
            expect(parsedData.fileMap[key][prop]).toEqual(
              outputSummaryJson.fileMap[key][prop]
            )
          }
        })
      })
    })

    cli.on('close', code => {
      expect(code).toEqual(0)
      done()
    })
  })

  it('should process a directory back to source properly', done => {
    const cli = spawn('node', [
      './cli.js',
      'test/data/output/**/*.json',
      '--convertMode',
      'source',
      '--stdout',
      '--outputDir',
      'test/data/back'
    ])

    cli.stdout.on('data', data => {
      const parsedData = JSON.parse(data.toString())
      expect(parsedData.sourceFileArray).toEqual(backJson.sourceFileArray)
      Object.keys(parsedData.fileMap).sort().forEach(key => {
        expect(parsedData.fileMap[key].split('\r\n').join('\n')).toEqual(
          backJson.fileMap[key]
        )
      })
    })

    cli.on('close', code => {
      expect(code).toEqual(0)
      done()
    })
  })

  it('#isMarkdown should properly determine markdown files', () => {
    expect(
      processmdLib._isMarkdown({
        bodyContent: 'Hi!',
        bodyHtml: '<p>Hi!</p>'
      })
    ).toBe(true)
  })

  it('#isMarkdown should properly determine when files are NOT markdown files', () => {
    expect(
      processmdLib._isMarkdown({
        title: 'Foo',
        someProp1: true
      })
    ).toBe(false)
  })

  it('#findCommonDir should find the lowest common parent from an array of files', () => {
    expect(
      processmdLib._findCommonDir([
        'test/data/output/frontmatter.json',
        'test/data/output/L1/L2/test2.json',
        'test/data/output/L1/test.json',
        'test/data/output/README.json'
      ])
    ).toBe('test/data/output/')
  })

  it('#findCommonDir should match complete paths only', () => {
    expect(
      processmdLib._findCommonDir([
        'content/pages',
        'content/posts'
      ])
    ).toBe('content/')

    expect(
      processmdLib._findCommonDir([
        'pages/2016/about.md',
        'posts/drafts/hello_world.md',
        'posts/drafts/test_post.md'
      ])
    ).toBe('')

    expect(
      processmdLib._findCommonDir([
        'pages/about.md'
      ])
    ).toBe('pages/')

    expect(
      processmdLib._findCommonDir([
        'about.md'
      ])
    ).toBe('')
  })

  it('should parse markdownOptions if argument is JSON', done => {
    const cli = spawn('node', [
      './cli.js',
      'test/data/input/README.md',
      '--includeBodyProps',
      '--markdownOptions',
      '{"linkify":true}',
      '--stdout',
      '--outputDir',
      'test/data/output'
    ])

    const output = []
    cli.stdout.on('data', data => {
      output.push(data.toString())
    })

    cli.on('close', code => {
      const parsedOutput = JSON.parse(output.join(''))
      expect(parsedOutput.fileMap['test/data/output/README.json'].bodyHtml.indexOf('<a href=')).not.toEqual(-1)
      expect(code).toEqual(0)
      done()
    })
  })

  it('should pass markdownOptions as a string if argument is not JSON (markdown-it preset name)', done => {
    const cli = spawn('node', [
      './cli.js',
      'test/data/input/**/*.{yml,md}',
      '--stdout',
      '--outputDir',
      'test/data/output',
      '--markdownOptions zero'
    ])

    cli.on('close', code => {
      expect(code).toEqual(0)
      done()
    })
  })
})
