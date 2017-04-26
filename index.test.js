const spawn = require('child_process').spawn
const processtoLib = require('./index')
const processto = processtoLib.default

const readFileContent = processtoLib._readFileContent
const outputJson = require('./test/data/output.json')
const backJson = require('./test/data/back.json')

describe('processto', () => {
  it('should process a directory to JSON properly', (done) => {
    const cli = spawn('node', [
      './cli.js',
      'test/data/input/**/*.{yml,md}',
      '--stdout',
      '--outputDir',
      'test/data/output',
    ])

    cli.stdout.on('data', (data) => {
      const parsedData = JSON.parse(data.toString())
      expect(parsedData).toEqual(outputJson)
    })

    cli.on('close', (code) => {
      expect(code).toEqual(0)
      done()
    })
  })

  it('should process a directory back to source properly', (done) => {
    const cli = spawn('node', [
      './cli.js',
      'test/data/output/**/*.json',
      '--convertMode',
      'source',
      '--stdout',
      '--outputDir',
      'test/data/back',
    ])

    cli.stdout.on('data', (data) => {
      const parsedData = JSON.parse(data.toString())
      expect(parsedData).toEqual(backJson)
    })

    cli.on('close', (code) => {
      expect(code).toEqual(0)
      done()
    })
  })

  it('#isMarkdown should properly determine markdown files', () => {
    expect(processtoLib._isMarkdown({
      bodyContent: 'Hi!',
      bodyHtml: '<p>Hi!</p>'
    })).toBe(true)
  })

  it('#isMarkdown should properly determine when files are NOT markdown files', () => {
    expect(processtoLib._isMarkdown({
      title: 'Foo',
      someProp1: true,
    })).toBe(false)
  })

  it('#findCommonDir should find the lowest common parent from an array of files', () => {
    expect(processtoLib._findCommonDir([
      "test/data/output/frontmatter.json",
      "test/data/output/L1/L2/test2.json",
      "test/data/output/L1/test.json",
      "test/data/output/README.json"
    ])).toBe('test/data/output/')
  })
})
