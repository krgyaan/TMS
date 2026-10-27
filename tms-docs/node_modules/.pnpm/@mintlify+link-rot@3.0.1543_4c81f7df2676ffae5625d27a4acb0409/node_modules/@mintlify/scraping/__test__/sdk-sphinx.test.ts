import fse from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { convertSphinx } from '../src/sdk/converters/sphinx.js';
import type { SdkReference } from '../src/sdk/types.js';

const indexPage = {
  current_page_name: 'index',
  title: 'Example SDK documentation',
  body: '<section><h1>Example SDK documentation<a class="headerlink" href="#example" title="Link to this heading"></a></h1><p>Welcome to the example SDK. It does things.</p><p>See the <a class="reference internal" href="widgets.html#widgets.Widget">Widget docs</a> and the <a class="reference external" href="https://example.com/docs">docs site</a>.</p><div class="admonition warning"><p class="admonition-title">Warning</p><p>Handle with care.</p></div></section>',
};

const widgetsPage = {
  current_page_name: 'widgets',
  title: 'widgets module',
  body: '<section><h1>widgets module<a class="headerlink" href="#widgets" title="Link to this heading"></a></h1><dl class="py class"><dt class="sig sig-object py" id="widgets.Widget"><em class="property"><span class="pre">class</span><span class="w"> </span></em><span class="sig-prename descclassname"><span class="pre">widgets.</span></span><span class="sig-name descname"><span class="pre">Widget</span></span><span class="sig-paren">(</span><em class="sig-param"><span class="n"><span class="pre">name</span></span></em><span class="sig-paren">)</span><a class="reference internal" href="_modules/widgets/#Widget"><span class="viewcode-link"><span class="pre">[source]</span></span></a><a class="headerlink" href="#widgets.Widget" title="Link to this definition"></a></dt><dd><p>A widget.</p><dl class="py method"><dt class="sig sig-object py" id="widgets.Widget.spin"><span class="sig-name descname"><span class="pre">spin</span></span><span class="sig-paren">(</span><em class="sig-param"><span class="n"><span class="pre">speed</span></span><span class="o"><span class="pre">=</span></span><span class="default_value"><span class="pre">1</span></span></em><span class="sig-paren">)</span><a class="headerlink" href="#widgets.Widget.spin" title="Link to this definition"></a></dt><dd><p>Spins the widget.</p></dd></dl></dd></dl></section>',
};

const skippedPage = { current_page_name: 'genindex', title: 'Index', body: '<h1>Index</h1>' };

describe('convertSphinx', () => {
  let dir: string;
  let reference: SdkReference;

  beforeAll(async () => {
    dir = await fse.mkdtemp(path.join(os.tmpdir(), 'sphinx-test-'));
    await fse.writeJson(path.join(dir, 'index.fjson'), indexPage);
    await fse.writeJson(path.join(dir, 'widgets.fjson'), widgetsPage);
    await fse.writeJson(path.join(dir, 'genindex.fjson'), skippedPage);
    reference = await convertSphinx(dir);
  });

  afterAll(async () => {
    await fse.remove(dir);
  });

  it('emits one page per content file with slugs from current_page_name', () => {
    expect(reference.pages.map((page) => page.slug).sort()).toEqual(['index', 'widgets']);
  });

  it('groups guide pages and autodoc module pages separately', () => {
    expect(reference.groups).toEqual([
      { group: 'Getting Started', pages: ['index'] },
      { group: 'API Reference', pages: ['widgets'] },
    ]);
  });

  it('tags autodoc pages as MODULE', () => {
    const widgets = reference.pages.find((page) => page.slug === 'widgets');
    expect(widgets?.tag).toBe('MODULE');
    expect(reference.pages.find((page) => page.slug === 'index')?.tag).toBeUndefined();
  });

  it('converts signatures to python code blocks with headings', () => {
    const content = reference.pages.find((page) => page.slug === 'widgets')?.content ?? '';
    expect(content).toContain('### Widget');
    expect(content).toContain('```python\nclass widgets.Widget(name)\n```');
    expect(content).toContain('#### spin()');
    expect(content).toContain('```python\nspin(speed=1)\n```');
  });

  it('strips headerlinks and viewcode links', () => {
    for (const page of reference.pages) {
      expect(page.content).not.toContain('');
      expect(page.content).not.toContain('[source]');
      expect(page.content).not.toContain('_modules');
    }
  });

  it('rewrites internal links and keeps external ones', () => {
    const index = reference.pages.find((page) => page.slug === 'index');
    expect(index?.content).toContain('[Widget docs](/widgets)');
    expect(index?.content).toContain('https://example.com/docs');
  });

  it('converts admonitions to callouts and extracts descriptions', () => {
    const index = reference.pages.find((page) => page.slug === 'index');
    expect(index?.content).toContain('<Warning>');
    expect(index?.content).toContain('Handle with care.');
    expect(index?.description).toBe('Welcome to the example SDK.');
  });
});
