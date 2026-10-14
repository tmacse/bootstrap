'use strict'

// This diagnostic adapter runs only in the supported Node.js build environment.
/* eslint compat/compat: off */

const path = require('path')
const url = require('url')

function highlightedHTML(message) {
  if (typeof message.extract !== 'string' || !Number.isInteger(message.hiliteStart) ||
      !Number.isInteger(message.hiliteLength) || message.hiliteStart < 0 ||
      message.hiliteLength < 1 || message.hiliteStart + message.hiliteLength > message.extract.length) {
    throw new Error('VNU diagnostic has no valid complete HTML highlight')
  }
  return message.extract.slice(message.hiliteStart, message.hiliteStart + message.hiliteLength)
}

function diagnosticPath(message, roots) {
  const file = url.fileURLToPath(message.url)
  for (const root of roots) {
    const relative = path.relative(root.directory, file)
    if (relative && !path.isAbsolute(relative) && relative !== '..' && relative.indexOf(`..${path.sep}`) !== 0) {
      return root.prefix + relative.split(path.sep).join('/')
    }
  }
  throw new Error('VNU diagnostic is outside the checked input directories')
}

function evaluate(output, exitCode, roots) {
  if (exitCode !== 0 && exitCode !== 1) {
    throw new Error(`Unexpected VNU exit code: ${exitCode}`)
  }
  const report = JSON.parse(output)
  if (!report || !Array.isArray(report.messages)) {
    throw new Error('Invalid VNU JSON report')
  }
  let blocking = 0
  const unexpected = []
  report.messages.forEach((message) => {
    if (!message || typeof message.message !== 'string' ||
        !['error', 'info', 'non-document-error'].includes(message.type) ||
        message.subType && !['warning', 'fatal', 'io', 'internal'].includes(message.subType)) {
      throw new Error('Invalid VNU diagnostic schema')
    }
    if (message.type === 'info' && message.subType !== 'warning') {
      return
    }
    blocking++
    if (message.type === 'non-document-error') {
      unexpected.push(message)
      return
    }
    const entry = {
      path: diagnosticPath(message, roots),
      type: message.type,
      subType: message.subType || null,
      message: message.message,
      highlightHTML: highlightedHTML(message)
    }
    unexpected.push(entry)
  })
  if (exitCode === 0 && blocking > 0 || exitCode === 1 && blocking === 0) {
    throw new Error('VNU exit code does not match the --Werror diagnostics')
  }
  return {
    unexpected,
    passed: unexpected.length === 0
  }
}

module.exports = {
  evaluate
}
