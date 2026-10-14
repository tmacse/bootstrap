# frozen_string_literal: true

require 'bundler/setup'
require 'jekyll'
require 'jekyll-redirect-from'
require 'jekyll-sitemap'
require 'jekyll-toc'
require 'nokogiri'
require 'kramdown-parser-gfm'
require 'addressable/template'
require 'webrick'
require 'stringio'
require 'json'
require 'tmpdir'
require 'optparse'
require 'set'

options = {}
OptionParser.new do |parser|
  parser.on('--site DIRECTORY') { |value| options[:site] = File.expand_path(value) }
  parser.on('--baseline DIRECTORY') { |value| options[:baseline] = File.expand_path(value) }
end.parse!

def check(condition, message)
  raise message unless condition
end

# Assert the actual loaded libraries, rather than trusting only lockfile text.
minimum_versions = {
  'jekyll' => '3.10.0', 'kramdown' => '2.5.2', 'nokogiri' => '1.19.4',
  'addressable' => '2.8.0', 'ffi' => '1.17.4', 'rexml' => '3.4.4'
}
minimum_versions.each do |name, minimum|
  actual = Gem.loaded_specs.fetch(name).version
  check(actual >= Gem::Version.new(minimum), "#{name} #{actual} is below #{minimum}")
end

Dir.mktmpdir('bootstrap-ruby-controls-') do |temporary|
  # Check the normal include and heading workflows through Jekyll itself.
  source = File.join(temporary, 'site')
  destination = File.join(temporary, 'output')
  Dir.mkdir(source)
  File.write(File.join(source, 'index.md'), "---\n---\n# Ordinary heading\n")
  File.write(File.join(source, '_ordinary.txt'), 'ordinary included asset')
  configuration = Jekyll.configuration(
    'source' => source, 'destination' => destination, 'plugins' => [],
    'include' => ['_ordinary.txt'], 'quiet' => true
  )
  Jekyll::Site.new(configuration).process
  check(File.read(File.join(destination, '_ordinary.txt')) == 'ordinary included asset', 'ordinary include stopped working')
  check(File.read(File.join(destination, 'index.html')).include?('id="ordinary-heading"'), 'heading ID changed')
end

# Keep normal CSS selectors, URI templates and GFM tables/task lists working.
fragment = Nokogiri::HTML.fragment('<section><h2 id="keep">Heading</h2></section>')
check(fragment.at_css('section > h2#keep').text == 'Heading', 'CSS selector control failed')
check(Addressable::Template.new('/docs/{version}/{section}/').expand('version' => '4.0', 'section' => 'components').to_s == '/docs/4.0/components/', 'URI template control failed')
markdown = Kramdown::Document.new("| Column |\n| --- |\n| Value |\n\n- [x] Completed\n", input: 'GFM').to_html
markdown_document = Nokogiri::HTML.fragment(markdown)
check(markdown_document.at_css('table') && markdown_document.at_css('input[type="checkbox"][checked]'), 'GFM table/task-list control failed')

# Exercise the upstream HTTP parser fix with ordinary request bodies and an
# allowed trailer; no listener or attack request is used by this check.
webrick_source = Bundler.load.specs.find { |spec| spec.name == 'webrick' }.source
check(webrick_source.is_a?(Bundler::Source::Git) && webrick_source.revision == '25b0e9206bf5991c6274893d53c428d23b3f2292', 'WEBrick is not using the pinned upstream fix')
request = WEBrick::HTTPRequest.new(WEBrick::Config::HTTP)
request.parse(StringIO.new("POST /docs HTTP/1.1\r\nHost: docs.example\r\nContent-Length: 5\r\n\r\nhello"))
check(request.body == 'hello' && request.content_length == 5, 'ordinary HTTP request body changed')
request = WEBrick::HTTPRequest.new(WEBrick::Config::HTTP)
request.parse(StringIO.new("POST /docs HTTP/1.1\r\nHost: docs.example\r\nTransfer-Encoding: chunked\r\nTrailer: X-Checksum\r\n\r\n1\r\na\r\n0\r\nX-Checksum: ok\r\n\r\n"))
check(request.body == 'a' && request['x-checksum'] == 'ok', 'allowed HTTP trailer stopped working')

def site_manifest(directory)
  check(directory && File.directory?(directory), 'pass --site with a built documentation directory')
  pages = Dir.glob(File.join(directory, '**', '*.html')).sort
  result = { 'pages' => {}, 'css' => {} }
  pages.each do |filename|
    relative = filename.delete_prefix("#{directory}/")
    document = Nokogiri::HTML(File.read(filename))
    heading_ids = document.css('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]').map { |node| node['id'] }.to_set
    missing_toc_anchors = document.css('.bd-toc a[href^="#"]').filter_map do |node|
      node['href'] unless heading_ids.include?(node['href'].delete_prefix('#'))
    end.uniq.sort
    result['pages'][relative] = {
      'headings' => document.css('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]').map { |node| [node.name, node['id'], node.text.strip] },
      'toc' => document.css('.bd-toc a').map { |node| [node['href'], node.text.strip] },
      'sidebar' => document.css('#bd-docs-nav a').map { |node| [node['href'], node.text.strip] },
      'navbar' => document.css('.bd-navbar a').map { |node| [node['href'], node.text.strip] },
      'redirects' => document.css('meta[http-equiv]').map { |node| [node['http-equiv'], node['content']] },
      'canonical' => document.css('link[rel="canonical"]').map { |node| node['href'] },
      # The legacy TOC also lists example headings without IDs. Retain these in
      # the manifest so a reference comparison detects newly missing anchors.
      'missing_toc_anchors' => missing_toc_anchors
    }
  end
  sitemap = File.join(directory, 'sitemap.xml')
  check(File.file?(sitemap), 'sitemap.xml is missing')
  result['sitemap'] = Nokogiri::XML(File.read(sitemap)).remove_namespaces!.xpath('//url/loc').map(&:text).sort
  Dir.glob(File.join(directory, '**', '*.css')).sort.each do |filename|
    relative = filename.delete_prefix("#{directory}/")
    result['css'][relative] = Digest::SHA256.file(filename).hexdigest
  end
  result
end

if options[:site]
  require 'digest'
  candidate = site_manifest(options[:site])
  check(candidate['pages'].key?('docs/4.0/getting-started/introduction/index.html'), 'main introduction URL is missing')
  check(candidate['pages'].key?('docs/4.0/components/tooltips/index.html'), 'component URL is missing')
  check(candidate['pages'].values.any? { |page| !page['redirects'].empty? }, 'redirect plugin produced no redirects')
  if options[:baseline]
    baseline = site_manifest(options[:baseline])
    check(candidate['pages'].keys == baseline['pages'].keys, 'page URL inventory changed')
    candidate['pages'].each do |path, features|
      reference = baseline['pages'].fetch(path)
      check((features['missing_toc_anchors'] - reference['missing_toc_anchors']).empty?, "new missing TOC anchors in #{path}")
      check(features == reference, "headings/navigation/redirects changed in #{path}")
    end
    check(candidate['sitemap'] == baseline['sitemap'], 'sitemap URL inventory changed')
    check(candidate['css'] == baseline['css'], 'published CSS changed during Ruby upgrade')
  end
  puts JSON.generate('status' => 'pass', 'pages' => candidate['pages'].size, 'sitemap_urls' => candidate['sitemap'].size, 'css_files' => candidate['css'].size, 'missing_toc_anchors' => candidate['pages'].values.sum { |page| page['missing_toc_anchors'].size }, 'toc_regression_compared' => !!options[:baseline], 'baseline_compared' => !!options[:baseline], 'loaded_versions' => minimum_versions.keys.to_h { |name| [name, Gem.loaded_specs.fetch(name).version.to_s] })
else
  puts JSON.generate('status' => 'pass', 'security_and_function_controls' => true, 'loaded_versions' => minimum_versions.keys.to_h { |name| [name, Gem.loaded_specs.fetch(name).version.to_s] })
end
