'use strict'

// This test runs only in the supported Node.js build environment.
/* eslint compat/compat: off */

const assert = require('assert')
const childProcess = require('child_process')
const fs = require('fs')
const http = require('http')
const os = require('os')
const path = require('path')
const axios = require(require.resolve('axios', {
  paths: [path.dirname(require.resolve('github-build'))]
}))
const Build = require('github-build')
const braces = require('braces')
const micromatch = require('micromatch')
const SauceTunnel = require('sauce-tunnel')
const vnu = require('vnu-jar')
const vnuReport = require('./vnu-report')

const yamlPath = path.dirname(require.resolve('js-yaml/package.json'))
const yamlVersion = require(path.join(yamlPath, 'package.json')).version
const versionOutput = childProcess.spawnSync(process.execPath, [path.join(yamlPath, 'bin/js-yaml.js'), '--version'], {
  encoding: 'utf8'
})
assert.strictEqual(versionOutput.status, 0)
assert.strictEqual(versionOutput.stdout.trim(), yamlVersion)
const helpOutput = childProcess.spawnSync(process.execPath, [path.join(yamlPath, 'bin/js-yaml.js'), '--help'], {
  encoding: 'utf8'
})
assert.strictEqual(helpOutput.status, 0)
assert(helpOutput.stdout.includes('--compact'))
const yamlOutput = childProcess.spawnSync(process.execPath, [path.join(yamlPath, 'bin/js-yaml.js')], {
  input: 'name: ordinary\n',
  encoding: 'utf8'
})
assert.strictEqual(yamlOutput.status, 0)
assert.deepStrictEqual(JSON.parse(yamlOutput.stdout), {
  name: 'ordinary'
})
const invalidYaml = childProcess.spawnSync(process.execPath, [path.join(yamlPath, 'bin/js-yaml.js'), '--compact'], {
  input: 'name: [ordinary\n',
  encoding: 'utf8'
})
assert.strictEqual(invalidYaml.status, 1)

const patterns = [
  ['js/{src,dist}/*.js', 'js/(src|dist)/*.js', ['js/src/*.js', 'js/dist/*.js']],
  ['file-{01..03}.css', 'file-(0[1-3]).css', ['file-01.css', 'file-02.css', 'file-03.css']],
  ['a/{b,{c,d}}', 'a/(b|(c|d))', ['a/b', 'a/c', 'a/d']]
]

patterns.forEach(([pattern, compiled, expanded]) => {
  assert.strictEqual(braces.compile(pattern), compiled)
  assert.strictEqual(braces.stringify(braces.parse(pattern)), pattern)
  assert.deepStrictEqual(braces.expand(pattern), expanded)
  assert.deepStrictEqual(braces(pattern, {
    expand: true
  }), expanded)
})

assert.deepStrictEqual(braces.expand('{a,a,b}', {
  nodupes: true
}), ['a', 'b'])
assert.deepStrictEqual(micromatch(['a.js', 'b.css', '.a.js'], '*.{js,css}'), ['a.js', 'b.css'])
assert(micromatch.matcher('*.@(js|css)')('a.js'))
assert(micromatch.isMatch('.a.js', '*.js', {
  dot: true
}))
assert(micromatch.isMatch('A.JS', '*.js', {
  nocase: true
}))

const tooDeep = `${'{'.repeat(257)}a${'}'.repeat(257)}`
const tooManyParens = `${'('.repeat(257)}a${')'.repeat(257)}`
;['parse', 'compile', 'expand', 'stringify'].forEach((method) => {
  assert.throws(() => braces[method](tooDeep, {
    maxDepth: Infinity
  }), RangeError)
  assert.throws(() => braces[method](tooManyParens), RangeError)
})

const childCycle = {
  type: 'root',
  nodes: []
}
childCycle.nodes.push(childCycle)
;['compile', 'expand', 'stringify'].forEach((method) => {
  assert.throws(() => braces[method](childCycle), RangeError)
})

const parentCycle = {
  type: 'paren',
  nodes: []
}
parentCycle.parent = parentCycle
assert.throws(() => braces.expand({
  type: 'root',
  nodes: [{
    type: 'paren',
    parent: parentCycle,
    nodes: []
  }]
}), RangeError)

async function testStatusAPI() {
  const originalAdapter = axios.defaults.adapter
  const states = []
  axios.defaults.adapter = (config) => {
    assert.strictEqual(config.method, 'post')
    assert.strictEqual(config.url, 'https://api.github.com/repos/example/project/statuses/example-sha')
    const data = JSON.parse(config.data)
    states.push(data.state)
    return Promise.resolve({
      status: 201,
      data,
      headers: {},
      config
    })
  }

  try {
    const build = new Build({
      repo: 'example/project',
      sha: 'example-sha',
      label: 'bundlesize',
      token: 'test-only'
    })
    const responses = [
      await build.start('ordinary status'),
      await build.pass('ordinary status'),
      await build.fail('ordinary status'),
      await build.error('ordinary status')
    ]
    responses.forEach((result) => {
      assert.strictEqual(result.status, 201)
      assert.strictEqual(result.data.description, 'ordinary status')
    })
    assert.deepStrictEqual(states, ['pending', 'success', 'failure', 'error'])
    const unavailable = new Error('unavailable')
    unavailable.response = {
      status: 503,
      data: 'unavailable'
    }
    axios.defaults.adapter = () => Promise.reject(unavailable)
    await assert.rejects(build.start(), {
      status: 503,
      error: 'unavailable'
    })
  } finally {
    axios.defaults.adapter = originalAdapter
  }
}

async function testSauceTransport() {
  const requests = []
  const server = http.createServer((request, response) => {
    requests.push([request.method, request.url])
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify(request.method === 'DELETE' ? {} : ['example-tunnel']))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const tunnel = new SauceTunnel('example', 'test-only', 'example-tunnel', true, [])
    tunnel.baseUrl = `http://127.0.0.1:${server.address().port}`
    tunnel.id = 'example-tunnel'
    const tunnels = await new Promise((resolve) => tunnel.getTunnels(resolve))
    assert.deepStrictEqual(tunnels, ['example-tunnel'])
    await new Promise((resolve, reject) => {
      tunnel.killTunnel((error) => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    })
    assert.deepStrictEqual(requests, [['GET', '/tunnels'], ['DELETE', '/tunnels/example-tunnel']])
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
}

async function testAll() {
  testHTMLGate()
  await testStatusAPI()
  await testSauceTransport()
}

function testHTMLGate() {
  const directory = fs.mkdtempSync(path.join(process.env.VNU_TEST_TMPDIR || os.tmpdir(), 'vnu-controls-'))
  const validPath = path.join(directory, 'valid.html')
  const invalidPath = path.join(directory, 'invalid.html')
  fs.writeFileSync(validPath, '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Normal</title></head><body><p>Normal content.</p></body></html>\n')
  fs.writeFileSync(invalidPath, '<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body><p>Normal content.</p></body></html>\n')
  const args = ['-jar', vnu, '--format', 'json', '--stdout', '--Werror']
  const roots = [{
    directory,
    prefix: ''
  }]
  try {
    const valid = childProcess.spawnSync('java', args.concat(validPath), {
      encoding: 'utf8'
    })
    assert.ifError(valid.error)
    assert(vnuReport.evaluate(valid.stdout, valid.status, roots).passed)

    const invalid = childProcess.spawnSync('java', args.concat(invalidPath), {
      encoding: 'utf8'
    })
    assert.ifError(invalid.error)
    assert(!vnuReport.evaluate(invalid.stdout, invalid.status, roots).passed)
    const repeated = childProcess.spawnSync('java', args.concat([invalidPath, invalidPath]), {
      encoding: 'utf8'
    })
    const repeatedResult = vnuReport.evaluate(repeated.stdout, repeated.status, roots)
    assert.strictEqual(repeatedResult.unexpected.length, 2)
    assert(!repeatedResult.passed)
    assert.throws(() => vnuReport.evaluate('{', 0, roots), SyntaxError)
    assert.throws(() => vnuReport.evaluate(valid.stdout, 2, roots), /Unexpected VNU exit code/)
    const missingJava = childProcess.spawnSync(process.execPath, [path.join(__dirname, 'vnu-jar.js')], {
      encoding: 'utf8',
      env: Object.assign({}, process.env, {
        PATH: directory
      })
    })
    assert.strictEqual(missingJava.status, 1)
    assert(missingJava.stderr.includes('Java is unavailable'))
    console.log('VNU controls: valid HTML accepted; new/duplicate errors and tool/JSON failures rejected.')
  } finally {
    fs.rmSync(directory, {
      recursive: true,
      force: true
    })
  }
}

testAll().then(() => {
  console.log('Build dependency compatibility and guarded brace APIs passed.')
}).catch((error) => {
  console.error(error)
  process.exit(1)
})
