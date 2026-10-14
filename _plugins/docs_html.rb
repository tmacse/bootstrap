# frozen_string_literal: true

require 'nokogiri'
require 'jekyll-toc'

module BootstrapDocsHTML
  # A copied Holder example needs one ordinary source, while the live preview
  # retains both its fallback source and Holder data attribute.
  def example_markup(input)
    input.gsub(/<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/i) do |tag|
      attributes = []
      tag.scan(/\s+([^\s=\/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/) do |name, double, single, bare|
        match = Regexp.last_match
        attributes << [name.downcase, double || single || bare, match.begin(0), match.end(0)]
      end
      holder = attributes.find { |name, value, _start, _finish| name == 'data-src' && value.to_s.start_with?('holder.js') }
      next tag unless holder
      changes = attributes.select { |name, _value, _start, _finish| name == 'src' || name == 'data-src' }
      changes.sort_by { |_name, _value, start, _finish| -start }.each do |name, _value, start, finish|
        tag[start...finish] = name == 'data-src' ? ' src="..."' : ''
      end
      tag
    end
  end

  # Typography classes retain the examples' visual heading sizes. Keep those
  # examples at their original TOC depth while using the real target IDs.
  def docs_toc(input)
    fragment = Nokogiri::HTML::DocumentFragment.parse(input)
    fragment.css('h1,h2,h3,h4,h5,h6').each do |heading|
      typography = heading['class'].to_s.split.find { |name| name.match?(/\Ah[1-6]\z/) }
      heading.name = typography if typography
    end
    headings = fragment.css('h2,h3,h4').to_a
    headings.each { |heading| raise 'Documentation TOC heading has no ID' if heading['id'].to_s.empty? }
    parser = Jekyll::TableOfContents::Parser.new(fragment.to_html, 'min_level' => 2, 'max_level' => 4)
    toc = Nokogiri::HTML::DocumentFragment.parse(parser.build_toc)
    links = toc.css('a')
    raise 'Documentation TOC entry mismatch' unless links.size == headings.size
    links.zip(headings).each { |link, heading| link['href'] = "##{heading['id']}" }
    toc.to_html
  end
end
Liquid::Template.register_filter(BootstrapDocsHTML)

# Emit HTML void tags as HTML, without XML closing slashes. This operates on
# markup tags only; escaped code examples remain untouched.
Jekyll::Hooks.register [:pages, :documents], :post_render do |page|
  next unless page.output_ext == '.html'
  page.output = page.output.gsub(/<(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b(?:[^>"']|"[^"]*"|'[^']*')*\/>/i) do |tag|
    tag.sub(/\s*\/>\z/, '>')
  end
end
