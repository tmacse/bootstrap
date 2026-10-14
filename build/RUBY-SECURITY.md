# Ruby documentation toolchain

The documentation uses Jekyll 3.10 with the existing redirect, sitemap and TOC
plugins. This upgrade keeps the Bootstrap 4 templates, document URLs and browser
targets. The Ruby requirement applies to building documentation; it does not
change the browser runtime of Bootstrap's CSS and JavaScript.

Use the Ruby version in `.ruby-version` with a Ruby version manager. The system
Ruby on macOS is not sufficient for the current Nokogiri security fixes. Keep
gems in a project or version-manager directory instead of replacing system gems.

```sh
bundle install
bundle exec bundler-audit check --update
bundle exec jekyll build --destination /absolute/path/to/temporary/site
bundle exec ruby build/test-ruby-docs.rb --site /absolute/path/to/temporary/site
```

The check runs ordinary Markdown, GFM table and task-list, Jekyll include and
heading, CSS selector, and URI template controls through the installed libraries.
It checks the generated page URLs, redirects and sitemap, and reports missing
TOC anchors. The legacy TOC includes example headings that have no IDs. Pass
`--baseline /absolute/path/to/reference/site` to compare page URLs, heading IDs,
navigation, redirects, sitemap URLs and CSS bytes with a reference build, and
reject newly missing TOC anchors. Without a baseline, no TOC regression
comparison is claimed.

The original vulnerable lockfile cannot safely represent a current dependency
installation. A reference build that substitutes native dependencies or old Ruby
API adapters must be identified as a compatibility reference, not an exact build
of the original lockfile. The candidate build and dependency audit use the real
repository Gemfile and lockfile. Audit results apply to the advisory database
revision used for that run.

The minimum parser versions close documented issues in Jekyll, kramdown, Nokogiri,
Addressable and ffi. kramdown's GFM parser is a separate gem in the 2.x series;
`kramdown-parser-gfm` keeps Jekyll's existing default Markdown dialect.
Base64 and BigDecimal are declared explicitly because SafeYAML and Liquid still
require them after Ruby 3.4 moved them out of its default gems.

WEBrick is pinned to the immutable upstream commit
`25b0e9206bf5991c6274893d53c428d23b3f2292` from its official repository. That
commit fixes the upstream trailer-parsing bug by parsing trailers separately and accepting only
declared, permitted trailer fields. The latest released 1.9.2 gem does not
contain this fix. The dependency uses actual patched upstream source with its
existing Ruby/BSD license; it does not relabel an unpatched release. The checks
verify the loaded Git source and ordinary fixed-length/chunked body behavior.
The related advisory has withdrawn/unreviewed records; its severity is not
evidence that request smuggling is reachable through Bootstrap's static server.
This dependency choice follows the confirmed upstream parser fix.

Sources:

- [Jekyll include/symlink fix](https://jekyllrb.com/news/2018/09/19/security-fixes-for-3-6-3-7-3-8/)
- [kramdown security releases](https://kramdown.gettalong.org/news.html)
- [Nokogiri security advisories](https://github.com/sparklemotion/nokogiri/security/advisories)
- [Addressable CVE-2021-32740](https://github.com/sporkmonger/addressable/security/advisories/GHSA-jxhc-q857-3j6g)
- [ffi CVE-2018-1000201](https://github.com/ffi/ffi/releases/tag/1.9.24)
- [WEBrick upstream trailer fix](https://github.com/ruby/webrick/commit/25b0e9206bf5991c6274893d53c428d23b3f2292)
