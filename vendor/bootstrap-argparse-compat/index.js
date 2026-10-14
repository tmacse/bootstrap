'use strict'

const engine = require('argparse-engine')
const NativeArgumentParser = engine.ArgumentParser

function ArgumentParser(...args) {
  const parser = Reflect.construct(NativeArgumentParser, args, new.target || NativeArgumentParser)
  const options = args[args.length - 1]
  if (options && Object.prototype.hasOwnProperty.call(options, 'version')) {
    parser.version = options.version
  }
  return parser
}

ArgumentParser.prototype = NativeArgumentParser.prototype
Object.setPrototypeOf(ArgumentParser, NativeArgumentParser)
module.exports = Object.defineProperties({}, Object.getOwnPropertyDescriptors(engine))
module.exports.ArgumentParser = ArgumentParser
