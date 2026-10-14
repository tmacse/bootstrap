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
require_relative '../_plugins/docs_html'

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

def copied_image_attributes(tag)
  tag.sub(/\A<img\b/i, '').sub(/>\z/, '')
     .scan(/([^\s=\/>]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/).flatten.map(&:downcase)
end

# Check copyable image markup before a DOM parser can discard duplicate attributes.
markup_filter = Object.new.extend(BootstrapDocsHTML)
check(copied_image_attributes('<img src="first" src="second" alt="Normal">').count('src') == 2, 'raw image attribute parser discarded duplicates')
normal_image = '<img class="keep" src="/images/ordinary.png" alt="Ordinary">'
check(markup_filter.example_markup(normal_image) == normal_image, 'ordinary image source changed')
quoted_normal = %q(<img src="ordinary.png" alt='Literal data-src="holder.js/example"'>)
check(markup_filter.example_markup(quoted_normal) == quoted_normal, 'quoted ordinary image attribute text was rewritten')
holder_image = '<img class="keep" data-src="holder.js/100px180/" alt="Card" src="data:image/svg+xml,placeholder">'
copy = markup_filter.example_markup(holder_image)
check(copy == '<img class="keep" src="..." alt="Card">', 'Holder copy markup has wrong source or duplicate attributes')
check(markup_filter.example_markup("<img data-src='holder.js/64x64' src='fallback' alt='Normal'>") == "<img src=\"...\" alt='Normal'>", 'single-quoted Holder markup changed')
check(markup_filter.example_markup('<p data-src="holder.js/example">Ordinary</p>') == '<p data-src="holder.js/example">Ordinary</p>', 'non-image markup changed')

# The TOC uses real IDs and keeps visual example headings out of the sidebar.
toc_filter = Object.new.extend(BootstrapDocsHTML)
toc = Nokogiri::HTML.fragment(toc_filter.docs_toc('<h2 id="real-target">Different title</h2><h3 class="h5">Example title</h3>'))
check(toc.css('a').map { |node| node['href'] } == ['#real-target'], 'TOC target or example depth changed')
begin
  toc_filter.docs_toc('<h2>Missing ID</h2>')
  raise 'TOC accepted a heading with no ID'
rescue RuntimeError => error
  check(error.message == 'Documentation TOC heading has no ID', 'TOC missing-ID control failed')
end

if options[:site]
  require 'digest'
  candidate = site_manifest(options[:site])
  snippet_images = 0
  Dir.glob(File.join(options[:site], '**', '*.html')).each do |filename|
    document = Nokogiri::HTML(File.read(filename))
    document.css('figure.highlight code').each do |code|
      code.text.scan(/<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/i).each do |tag|
        attributes = copied_image_attributes(tag)
        check(attributes.uniq.size == attributes.size, "duplicate copied image attributes in #{filename}: #{attributes.inspect}")
        check(attributes.count('src') == 1, "copied image needs exactly one source in #{filename}")
        check(!tag.match?(/\sdata-src=["']holder\.js/i), "uncorrected copied Holder source in #{filename}")
        snippet_images += 1
      end
    end
  end
  check(snippet_images > 50, 'generated copyable image examples were not exercised')
  check(candidate['pages'].values.all? { |page| page['missing_toc_anchors'].empty? }, 'documentation has missing TOC anchors')
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
  puts JSON.generate('status' => 'pass', 'pages' => candidate['pages'].size, 'copyable_image_examples' => snippet_images, 'sitemap_urls' => candidate['sitemap'].size, 'css_files' => candidate['css'].size, 'missing_toc_anchors' => candidate['pages'].values.sum { |page| page['missing_toc_anchors'].size }, 'toc_regression_compared' => !!options[:baseline], 'baseline_compared' => !!options[:baseline], 'loaded_versions' => minimum_versions.keys.to_h { |name| [name, Gem.loaded_specs.fetch(name).version.to_s] })
else
  puts JSON.generate('status' => 'pass', 'security_and_function_controls' => true, 'loaded_versions' => minimum_versions.keys.to_h { |name| [name, Gem.loaded_specs.fetch(name).version.to_s] })
end
