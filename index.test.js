const spawn = require('child_process').spawn;
const processtoLib = require('./index');
const processto = processtoLib.default;
const readFileContent = processtoLib._readFileContent;

// _findCommonDir
// _isMarkdown

describe('processto', () => {
  it('should process a directory properly', (done) => {
    const cli = spawn('node', [
      './cli.js',
      'test/data/input/**/*.{yml,md}',
      '--stdout',
      '--outputDir',
      'test/data/output',
    ])
    // console.log(cli);

    cli.stdout.on('data', (data) => {
      console.log(data.toString());
      // Code.expect(data.toString()).to.equal(testResults.simpleCss)
    })

    cli.on('close', (code) => {
      // console.log(code);
      // Code.expect(code).to.equal(0)
      done()
    })
  });

  // const bar = {
  //   foo: {
  //     x: 1,
  //     y: 2,
  //   },
  // };
  //
  // expect(bar).toMatchSnapshot();
});
