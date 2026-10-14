/* eslint-env node */

'use strict'

const fs = require('fs')
const acorn = require('acorn')

// Compression must preserve the syntax level of the declared legacy browser targets.
const files = [
  'dist/js/bootstrap.js',
  'dist/js/bootstrap.min.js',
  'dist/js/bootstrap.bundle.js',
  'dist/js/bootstrap.bundle.min.js',
  'assets/js/docs.min.js'
]

files.forEach((file) => {
  acorn.parse(fs.readFileSync(file, 'utf8'), {
    ecmaVersion: 5
  })
})
console.log(`ES5 distribution syntax: ${files.length} files passed`)
