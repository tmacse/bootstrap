# Maintained braces leaf

This private package is derived from the MIT-licensed npm `braces@3.0.3`
release (registry integrity is recorded in the previous root lockfile).
`LICENSE`, `index.js` and the original `lib` algorithms are retained.
It is a repository-owned implementation, not a claimed upstream patched release.

The parser enforces a non-configurable limit of 256 nested containers, including
parentheses, curly braces and square bracket literals. Escaped and quoted text
retains the original parser rules. Iterative checks before `stringify`, `compile`
and `expand` reject excessive `nodes` nesting and child cycles in supplied ASTs;
normal `parent` and `prev` links are deliberately not traversed.
The two parent-chain lookups actually used by `expand` separately enforce the
same hard depth bound and detect cycles, preserving normal parser backlinks.

The callable API plus `create`, `parse`, `stringify`, `compile` and `expand`
are preserved, as are range limits, options, pattern arrays and return types.
Only the public entry point is exported, keeping guarded helpers private.
The root override replaces the leaf in the Babel, Karma and micromatch build
chains while retaining their existing matching APIs.

This Bootstrap build dependency is adapted from `vendor/site-braces-safe` in the sibling branch-counter-priority-site remediation candidate. The upstream braces 3.0.3 API and MIT license remain; parsing and recursive AST consumers enforce a non-overridable nesting limit of 256, and cyclic child/parent paths fail with RangeError. This local fork is unpublished and its implementation requires independent review; absence of an upstream npm advisory for its new package name is not security proof.
