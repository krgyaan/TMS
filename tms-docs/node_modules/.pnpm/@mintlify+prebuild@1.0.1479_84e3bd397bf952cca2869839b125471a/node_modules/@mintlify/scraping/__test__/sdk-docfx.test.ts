import fse from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { convertDocfx } from '../src/sdk/converters/docfx.js';
import type { SdkReference } from '../src/sdk/types.js';

const clientYml = `### YamlMime:ManagedReference
items:
- uid: Acme.Widgets.Client
  id: Client
  parent: Acme.Widgets
  children:
  - Acme.Widgets.Client.Name
  - Acme.Widgets.Client.Timeout
  - Acme.Widgets.Client.PaintAsync(Acme.Widgets.Models.Color,System.Int32)
  name: Client
  fullName: Acme.Widgets.Client
  type: Class
  namespace: Acme.Widgets
  summary: A widget client. Prefer <xref href="Acme.Widgets.Models.Color" data-throw-if-not-resolved="false"></xref> over raw values.
  syntax:
    content: public class Client
- uid: Acme.Widgets.Client.Name
  id: Name
  parent: Acme.Widgets.Client
  name: Name
  type: Property
  namespace: Acme.Widgets
  summary: The client name.
  syntax:
    content: public string Name { get; set; }
    return:
      type: System.String
- uid: Acme.Widgets.Client.Timeout
  id: Timeout
  parent: Acme.Widgets.Client
  name: Timeout
  type: Property
  namespace: Acme.Widgets
  summary: Timeout backed by <xref href="System.TimeSpan" data-throw-if-not-resolved="false"></xref>.
  syntax:
    content: public TimeSpan? Timeout { get; set; }
    return:
      type: System.TimeSpan
- uid: Acme.Widgets.Client.PaintAsync(Acme.Widgets.Models.Color,System.Int32)
  id: PaintAsync(Acme.Widgets.Models.Color,System.Int32)
  parent: Acme.Widgets.Client
  name: PaintAsync(Color, int)
  type: Method
  namespace: Acme.Widgets
  summary: Paints using a <code>Color</code>.
  syntax:
    content: public Task<bool> PaintAsync(Color color, int coats = 1)
    parameters:
    - id: color
      type: Acme.Widgets.Models.Color
      description: The <xref href="Acme.Widgets.Models.Color" data-throw-if-not-resolved="false"></xref> to apply.
    - id: coats
      type: System.Int32
      description: Number of coats.
    return:
      type: System.Threading.Tasks.Task{System.Boolean}
references:
- uid: System.String
  name: string
- uid: System.TimeSpan
  name: TimeSpan
- uid: System.Int32
  name: int
- uid: Acme.Widgets.Models.Color
  name: Color
- uid: System.Threading.Tasks.Task{System.Boolean}
  name: Task<bool>
`;

const colorYml = `### YamlMime:ManagedReference
items:
- uid: Acme.Widgets.Models.Color
  id: Color
  parent: Acme.Widgets.Models
  children:
  - Acme.Widgets.Models.Color.Red
  name: Color
  fullName: Acme.Widgets.Models.Color
  type: Enum
  namespace: Acme.Widgets.Models
  summary: Available colors for <code>IDictionary&lt;string, string&gt;</code> lookups.
  syntax:
    content: public enum Color
- uid: Acme.Widgets.Models.Color.Red
  id: Red
  parent: Acme.Widgets.Models.Color
  name: Red
  type: Field
  namespace: Acme.Widgets.Models
  summary: The color red.
  syntax:
    content: Red = 0
`;

const tocYml = `### YamlMime:TableOfContent
items:
- uid: Acme.Widgets
  name: Acme.Widgets
  type: Namespace
  items:
  - uid: Acme.Widgets.Client
    name: Client
    type: Class
- uid: Acme.Widgets.Models
  name: Acme.Widgets.Models
  type: Namespace
  items:
  - uid: Acme.Widgets.Models.Color
    name: Color
    type: Enum
`;

describe('convertDocfx', () => {
  let sourcePath: string;
  let reference: SdkReference;

  beforeAll(async () => {
    sourcePath = await fse.mkdtemp(path.join(os.tmpdir(), 'docfx-test-'));
    await fse.writeFile(path.join(sourcePath, 'Acme.Widgets.Client.yml'), clientYml);
    await fse.writeFile(path.join(sourcePath, 'Acme.Widgets.Models.Color.yml'), colorYml);
    await fse.writeFile(path.join(sourcePath, 'toc.yml'), tocYml);
    reference = await convertDocfx(sourcePath);
  });

  afterAll(async () => {
    await fse.remove(sourcePath);
  });

  it('creates one page per top-level type with namespace-scoped slugs', () => {
    expect(reference.pages.map((page) => page.slug)).toEqual(['widgets/client', 'models/color']);
    expect(reference.pages.map((page) => page.tag)).toEqual(['CLASS', 'ENUM']);
    expect(reference.pages.map((page) => page.title)).toEqual(['Client', 'Color']);
  });

  it('groups pages by namespace in toc order', () => {
    expect(reference.groups).toEqual([
      { group: 'Acme.Widgets', pages: ['widgets/client'] },
      { group: 'Acme.Widgets.Models', pages: ['models/color'] },
    ]);
  });

  it('renders properties as ResponseFields with nullability-driven required', () => {
    const content = reference.pages[0]?.content ?? '';
    expect(content).toContain('<ResponseField name={"Name"} type={"string"} required>');
    expect(content).toContain('<ResponseField name={"Timeout"} type={"TimeSpan"}>');
  });

  it('renders method signatures, parameters, and returns', () => {
    const content = reference.pages[0]?.content ?? '';
    expect(content).toContain('### PaintAsync()');
    expect(content).toContain(
      '```csharp\npublic Task<bool> PaintAsync(Color color, int coats = 1)\n```'
    );
    expect(content).toContain('<ResponseField name={"color"} type={"Color"} required>');
    expect(content).toContain('<ResponseField name={"coats"} type={"int"}>');
    expect(content).toContain('`Task<bool>`');
  });

  it('resolves xrefs to page links or inline code', () => {
    const content = reference.pages[0]?.content ?? '';
    expect(content).toContain('Prefer [Color](/models/color) over raw values.');
    expect(content).toContain('Timeout backed by `TimeSpan`.');
    expect(content).toContain('The [Color](/models/color) to apply.');
  });

  it('keeps namespace slugs unique when names differ only by separator', async () => {
    const dir = await fse.mkdtemp(path.join(os.tmpdir(), 'docfx-collide-'));
    const typeYml = (namespace: string) => `### YamlMime:ManagedReference
items:
- uid: ${namespace}.Thing
  id: Thing
  name: Thing
  fullName: ${namespace}.Thing
  type: Class
  namespace: ${namespace}
  syntax:
    content: public class Thing
`;
    await fse.writeFile(path.join(dir, 'a.yml'), typeYml('Acme.Sub.Zone'));
    await fse.writeFile(path.join(dir, 'b.yml'), typeYml('Acme.Sub-Zone'));
    const result = await convertDocfx(dir);
    const slugs = result.pages.map((page) => page.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(result.pages).toHaveLength(2);
    await fse.rm(dir, { recursive: true, force: true });
  });

  it('escapes generic angle brackets in prose', () => {
    const content = reference.pages[1]?.content ?? '';
    expect(content).toContain('`IDictionary<string, string>`');
    expect(content).toContain('<ResponseField name={"Red"} type={"0"} required>');
    expect(reference.pages[1]?.description).toBe(
      'Available colors for IDictionary<string, string> lookups.'
    );
  });
});
