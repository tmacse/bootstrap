source 'https://rubygems.org'

ruby '>= 3.2', '< 4.0'

group :development, :test do
  gem 'jekyll', '~> 3.10.0'
  gem 'jekyll-redirect-from', '~> 0.13.0'
  gem 'jekyll-sitemap', '~> 1.2.0'
  gem 'jekyll-toc', '~> 0.5.1'

  # Keep Jekyll's existing Markdown dialect while closing parser advisories.
  gem 'kramdown', '>= 2.5.2', '< 3.0'
  gem 'kramdown-parser-gfm', '~> 1.1'
  gem 'nokogiri', '>= 1.19.4', '< 2.0'
  gem 'addressable', '>= 2.8.0', '< 3.0'
  gem 'ffi', '>= 1.17.4', '< 2.0'
  # SafeYAML and Liquid still require libraries extracted from Ruby 3.4.
  gem 'base64', '~> 0.3'
  gem 'bigdecimal', '~> 3.1'
  # Use the official trailer-parsing fix, not yet in the 1.9.2 release.
  gem 'webrick', git: 'https://github.com/ruby/webrick.git', ref: '25b0e9206bf5991c6274893d53c428d23b3f2292'
  gem 'bundler-audit', '~> 0.9', require: false
end
