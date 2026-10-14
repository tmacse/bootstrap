'use strict';

// Never let caller options lift the limit protecting recursive AST consumers.
const MAX_NESTING = 256;

exports.assertDepth = depth => {
  if (depth > MAX_NESTING) {
    throw new RangeError(`Pattern nesting exceeds the hard limit of ${MAX_NESTING}`);
  }
};

exports.assertSafeTree = ast => {
  const active = new Set();
  const stack = [{ node: ast, depth: 0 }];
  while (stack.length) {
    const { node, depth, exit } = stack.pop();
    if (exit) {
      active.delete(node);
      continue;
    }
    // A terminal child does not introduce another parsing container.
    exports.assertDepth(node.nodes ? depth : Math.max(0, depth - 1));
    if (active.has(node)) throw new RangeError('AST contains a child cycle');
    if (!node.nodes) continue;
    active.add(node);
    stack.push({ node, exit: true });
    for (let i = node.nodes.length - 1; i >= 0; i--) {
      stack.push({ node: node.nodes[i], depth: depth + 1 });
    }
  }
};
