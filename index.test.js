const spawn = require('child_process').spawn
const processtoLib = require('./index')
const processto = processtoLib.default
const readFileContent = processtoLib._readFileContent
const outputJson = require('./test/data/output.json')
const backJson = require('./test/data/back.json')
// _findCommonDir
// _isMarkdown
// console.log(outputJson)

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
      console.log(JSON.stringify(parsedData));
      // expect(parsedData).toEqual(backJson)
    })

    cli.on('close', (code) => {
      expect(code).toEqual(0)
      done()
    })
  })


})


// function matchKeys(srcObj, testObj) {
//   Object.keys(srcObj).forEach((key) => {
//     try {
//       const subKeys = Object.keys(srcObj[key])
//       if (subKeys.length && typeof srcObj[key] === 'string') {
//         matchKeys(srcObj[key], testObj[key])
//       }
//     } catch (e) {}
//     if (typeof srcObj[key] === 'string') {
//       expect(srcObj[key]).toEqual(testObj[key])
//     }
//   })
// }
