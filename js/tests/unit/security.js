$(function () {
  'use strict'

  QUnit.module('security', {
    afterEach: function () {
      $('#qunit-fixture').html('')
    }
  })

  QUnit.test('tooltip sanitizes templates, HTML and data cannot disable sanitation', function (assert) {
    assert.expect(3)
    var $trigger = $('<button data-sanitize="false">Tooltip</button>').appendTo('#qunit-fixture')
    $trigger.tooltip({
      animation: false,
      html: true,
      template: '<div class="tooltip"><img src="x" onerror="alert(1)"><div class="tooltip-inner"></div></div>',
      title: '<a href="javascript:alert(1)" onclick="alert(1)">Unsafe</a><b>Allowed</b>'
    })
    var instance = $trigger.data('bs.tooltip')
    instance.setContent()
    var tip = instance.getTipElement()
    assert.ok(instance.config.sanitize, 'data attributes cannot disable sanitization')
    assert.notOk(tip.querySelector('[onerror], [onclick], a[href^="javascript:"]'), 'active HTML is removed')
    assert.equal(tip.querySelector('b').textContent, 'Allowed', 'safe formatting remains')
    $trigger.tooltip('dispose')
  })

  QUnit.test('popover inherits sanitization and explicit trusted overrides remain', function (assert) {
    assert.expect(3)
    var $trigger = $('<button>Popover</button>').appendTo('#qunit-fixture')
    $trigger.popover({
      html: true,
      content: '<img src="x" onerror="alert(1)"><strong>Content</strong>'
    })
    var instance = $trigger.data('bs.popover')
    instance.setContent()
    assert.notOk(instance.getTipElement().querySelector('[onerror]'), 'popover content is sanitized')
    assert.equal(instance.getTipElement().querySelector('strong').textContent, 'Content', 'safe content remains')
    $trigger.popover('dispose')
    $trigger.tooltip({
      html: true,
      sanitize: false,
      title: '<em data-custom="yes">Trusted</em>'
    })
    instance = $trigger.data('bs.tooltip')
    instance.setContent()
    assert.ok(instance.getTipElement().querySelector('[data-custom]'), 'trusted code retains an explicit override')
    $trigger.tooltip('dispose')
  })
})
