import fse from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { convertPhpdoc } from '../src/sdk/converters/phpdoc.js';
import type { SdkReference } from '../src/sdk/types.js';

const STRUCTURE_XML = `<?xml version="1.0"?>
<project name="Acme-PHP">
  <file path="Widget/Greeter.php" hash="abc">
    <namespace-alias name="\\Acme\\SDK\\Widget"/>
    <class final="true" abstract="false" namespace="\\Acme\\SDK\\Widget" line="10">
      <name>Greeter</name>
      <full_name>\\Acme\\SDK\\Widget\\Greeter</full_name>
      <docblock line="10">
        <description>Greets people politely.</description>
        <long-description>Supports optional shouting.</long-description>
      </docblock>
      <implements>\\Acme\\SDK\\Contract\\GreeterInterface</implements>
      <property namespace="\\Acme\\SDK\\Widget\\Greeter" line="12" visibility="public">
        <name>salutation</name>
        <default>'Hello'</default>
        <docblock line="12">
          <description></description>
          <long-description></long-description>
          <tag name="var" description="The salutation to use." type="string"/>
        </docblock>
      </property>
      <property namespace="\\Acme\\SDK\\Widget\\Greeter" line="13" visibility="private">
        <name>secret</name>
        <default></default>
      </property>
      <method final="false" abstract="false" static="false" namespace="\\Acme\\SDK\\Widget" line="20" visibility="public" returnByReference="false">
        <name>greet</name>
        <full_name>\\Acme\\SDK\\Widget\\Greeter::greet()</full_name>
        <argument line="20" by_reference="false">
          <name>name</name>
          <default></default>
          <type>string</type>
        </argument>
        <argument line="20" by_reference="false">
          <name>shout</name>
          <default>false</default>
          <type>?bool</type>
        </argument>
        <docblock line="20">
          <description>Greet a person by name.</description>
          <long-description></long-description>
          <tag name="param" description="Name of the person." variable="name" type="string"/>
          <tag name="param" description="Whether to shout." variable="shout" type="?bool"/>
          <tag name="return" description="The greeting." type="string"/>
          <tag name="throws" description="when name is empty" type="\\Acme\\SDK\\Exception\\ArgumentException"/>
        </docblock>
      </method>
      <method final="false" abstract="false" static="false" namespace="\\Acme\\SDK\\Widget" line="30" visibility="private" returnByReference="false">
        <name>hidden</name>
        <full_name>\\Acme\\SDK\\Widget\\Greeter::hidden()</full_name>
      </method>
    </class>
  </file>
</project>
`;

describe('convertPhpdoc', () => {
  let dir: string;
  let reference: SdkReference;

  beforeAll(async () => {
    dir = await fse.mkdtemp(path.join(os.tmpdir(), 'phpdoc-test-'));
    await fse.writeFile(path.join(dir, 'structure.xml'), STRUCTURE_XML);
    reference = await convertPhpdoc(dir);
  });

  afterAll(async () => {
    await fse.remove(dir);
  });

  it('creates one page per class with a namespace-derived slug', () => {
    expect(reference.pages).toHaveLength(1);
    const page = reference.pages[0]!;
    expect(page.slug).toBe('greeter');
    expect(page.title).toBe('Greeter');
    expect(page.tag).toBe('CLASS');
    expect(page.description).toBe('Greets people politely.');
  });

  it('groups pages by namespace', () => {
    expect(reference.groups).toEqual([{ group: 'Acme\\SDK\\Widget', pages: ['greeter'] }]);
  });

  it('reconstructs the method signature', () => {
    const content = reference.pages[0]!.content;
    expect(content).toContain(
      '```php\npublic function greet(string $name, ?bool $shout = false): string\n```'
    );
  });

  it('renders class heritage and sections', () => {
    const content = reference.pages[0]!.content;
    expect(content).toContain(
      '```php\nfinal class Greeter implements \\Acme\\SDK\\Contract\\GreeterInterface\n```'
    );
    expect(content).toContain('## Properties');
    expect(content).toContain('## Methods');
    expect(content).toContain('### greet()');
    expect(content).toContain('#### Returns');
    expect(content).toContain('#### Throws');
  });

  it('emits ResponseField entries for properties and parameters', () => {
    const content = reference.pages[0]!.content;
    expect(content).toContain(
      '<ResponseField name={"salutation"} type={"string"} required>\n  The salutation to use.\n\n  Default: `\'Hello\'`\n</ResponseField>'
    );
    expect(content).toContain(
      '<ResponseField name={"name"} type={"string"} required>\n  Name of the person.\n</ResponseField>'
    );
    expect(content).toContain(
      '<ResponseField name={"shout"} type={"?bool"}>\n  Whether to shout.\n</ResponseField>'
    );
  });

  it('excludes private members', () => {
    const content = reference.pages[0]!.content;
    expect(content).not.toContain('secret');
    expect(content).not.toContain('hidden');
  });

  it('accepts the structure.xml file path directly', async () => {
    const direct = await convertPhpdoc(path.join(dir, 'structure.xml'));
    expect(direct.pages[0]?.slug).toBe('greeter');
  });
});
