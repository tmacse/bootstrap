# Legacy Argparse compatibility

This private compatibility layer uses the official MIT-licensed `argparse@2.0.1`
as its implementation. Version 2 retains the version 1 aliases used by
`js-yaml@3` and removes the vulnerable `sprintf-js` dependency. Its deprecated
constructor `version` option creates a version action without retaining the
parser's version property, so `js-yaml --version` prints an empty line.

The wrapper preserves that one property after constructing the official parser,
and retains its other exports, descriptors, prototype and static inheritance.
It adds no parser, formatter or security bypass. `test-build-compat` checks the
legacy version output, help output, normal YAML conversion and invalid YAML exit.
This is a repository-maintained adapter, not an upstream patched release.

## Dependency maintenance

Dependabot checks this vendor manifest as well as the repository root. A vendor
manifest update is incomplete until the root `package-lock.json` is regenerated
and reviewed with it. Run `npm install --package-lock-only` at the repository
root, then `npm ci`, `npm run test-build-compat`, the full `npm test`, and the Ruby
documentation checks before merging. Keep the compatibility adapter and bounded
parser contracts; a green manifest-only PR does not prove the root lock updated.
