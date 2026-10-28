import { XMLParser } from 'fast-xml-parser';
import fse from 'fs-extra';
import path from 'node:path';

import { markdownToMdx } from '../convert.js';
import type { SdkNavGroup, SdkPage, SdkReference } from '../types.js';

type DocTag = {
  '@_name'?: string;
  '@_description'?: string;
  '@_type'?: string;
  '@_variable'?: string;
  '@_link'?: string;
};
type Docblock = { description?: string; 'long-description'?: string; tag?: DocTag[] };
type PhpArgument = { name?: string; default?: string; type?: string };
type PhpMethod = {
  name?: string;
  argument?: PhpArgument[];
  docblock?: Docblock;
  '@_visibility'?: string;
  '@_static'?: string;
  '@_abstract'?: string;
};
type PhpProperty = {
  name?: string;
  default?: string;
  docblock?: Docblock;
  '@_visibility'?: string;
  '@_static'?: string;
};
type PhpConstant = { name?: string; value?: string; docblock?: Docblock; '@_visibility'?: string };
type PhpElement = {
  name?: string;
  full_name?: string;
  extends?: string;
  implements?: string[];
  docblock?: Docblock;
  constant?: PhpConstant[];
  property?: PhpProperty[];
  method?: PhpMethod[];
  '@_namespace'?: string;
  '@_final'?: string;
  '@_abstract'?: string;
};
type PhpFile = {
  class?: PhpElement[];
  interface?: PhpElement[];
  trait?: PhpElement[];
  enum?: PhpElement[];
};

type Entry = {
  element: PhpElement;
  keyword: string;
  tag: string;
  name: string;
  fullName: string;
  namespace: string[];
  slug: string;
  group: string;
};

const ARRAY_TAGS = new Set([
  'file',
  'class',
  'interface',
  'trait',
  'enum',
  'method',
  'property',
  'constant',
  'argument',
  'tag',
  'implements',
]);

const KINDS = [
  { key: 'class', tag: 'CLASS' },
  { key: 'interface', tag: 'INTERFACE' },
  { key: 'trait', tag: 'TRAIT' },
  { key: 'enum', tag: 'ENUM' },
] as const;

export async function convertPhpdoc(sourcePath: string): Promise<SdkReference> {
  const file = (await fse.stat(sourcePath)).isDirectory()
    ? path.join(sourcePath, 'structure.xml')
    : sourcePath;
  const xml = await fse.readFile(file, 'utf8');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: false,
    parseAttributeValue: false,
    htmlEntities: true,
    isArray: (name) => ARRAY_TAGS.has(name),
  });
  const parsed = parser.parse(xml) as { project?: { file?: PhpFile[] } };
  const entries = collectEntries(parsed.project?.file ?? []);
  if (entries.length === 0) {
    throw new Error(`No phpDocumentor elements found in ${file}`);
  }

  const slugByName = new Map(entries.map((entry) => [entry.fullName, entry.slug]));
  const renderer = new PhpdocRenderer(slugByName);

  const byGroup = new Map<string, Entry[]>();
  for (const entry of entries) {
    const members = byGroup.get(entry.group) ?? [];
    members.push(entry);
    byGroup.set(entry.group, members);
  }
  const rootGroup = entries.find((entry) => entry.namespace.length === 0)?.group;
  const groupNames = [...byGroup.keys()].sort((left, right) => {
    if (left === rootGroup) return -1;
    if (right === rootGroup) return 1;
    return left.localeCompare(right);
  });

  const pages: SdkPage[] = [];
  const groups: SdkNavGroup[] = [];
  for (const groupName of groupNames) {
    const members = (byGroup.get(groupName) ?? []).sort((left, right) =>
      left.name.localeCompare(right.name)
    );
    const groupPages = members.map((entry) => renderer.renderPage(entry));
    pages.push(...groupPages);
    groups.push({ group: groupName, pages: groupPages.map((page) => page.slug) });
  }

  return { pages, groups };
}

function collectEntries(files: PhpFile[]): Entry[] {
  const raw: Omit<Entry, 'slug' | 'group' | 'namespace'>[] = [];
  const namespaces: string[][] = [];
  for (const file of files) {
    for (const kind of KINDS) {
      for (const element of file[kind.key] ?? []) {
        const name = element.name ?? '';
        if (!name) continue;
        const fullName = (element.full_name ?? name).replace(/^\\/, '');
        raw.push({ element, keyword: kind.key, tag: kind.tag, name, fullName });
        namespaces.push(namespaceSegments(element, name, fullName));
      }
    }
  }
  const prefix = commonPrefix(namespaces);
  const taken = new Set<string>();
  return raw.map((entry, index) => {
    const namespace = (namespaces[index] ?? []).slice(prefix.length);
    const group = namespace.length ? namespace.join('\\') : prefix.join('\\') || 'Reference';
    const base = [...namespace.map(slugify), slugify(entry.name)].join('/');
    let slug = base;
    let counter = 2;
    while (taken.has(slug)) slug = `${base}-${counter++}`;
    taken.add(slug);
    return { ...entry, namespace, group, slug };
  });
}

function namespaceSegments(element: PhpElement, name: string, fullName: string): string[] {
  const namespace = element['@_namespace']?.replace(/^\\/, '');
  if (namespace) return namespace.split('\\');
  const segments = fullName.split('\\');
  return segments.at(-1) === name ? segments.slice(0, -1) : segments;
}

function commonPrefix(lists: string[][]): string[] {
  let prefix = lists[0] ?? [];
  for (const list of lists.slice(1)) {
    let index = 0;
    while (index < prefix.length && prefix[index] === list[index]) index++;
    prefix = prefix.slice(0, index);
  }
  return prefix;
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9-_.]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item'
  );
}

function tagsOf(docblock: Docblock | undefined, name: string): DocTag[] {
  return docblock?.tag?.filter((tag) => tag['@_name'] === name) ?? [];
}

function publicOnly<Member extends { '@_visibility'?: string }>(members?: Member[]): Member[] {
  return members?.filter((member) => (member['@_visibility'] ?? 'public') === 'public') ?? [];
}

function isNullable(type: string): boolean {
  return type.startsWith('?') || /(^|\|)null(\||$)/i.test(type);
}

class PhpdocRenderer {
  constructor(private slugByName: Map<string, string>) {}

  renderPage(entry: Entry): SdkPage {
    const { element } = entry;
    const lines: string[] = [];
    const summary = this.docblock(element.docblock);
    if (summary) lines.push(summary);
    lines.push(...this.renderHeritage(entry));

    const constants = publicOnly(element.constant).sort((left, right) =>
      (left.name ?? '').localeCompare(right.name ?? '')
    );
    const properties = publicOnly(element.property).sort((left, right) =>
      (left.name ?? '').localeCompare(right.name ?? '')
    );
    const methods = publicOnly(element.method);
    const constructors = methods.filter((method) => method.name === '__construct');
    const others = methods
      .filter((method) => method.name !== '__construct')
      .sort((left, right) => (left.name ?? '').localeCompare(right.name ?? ''));

    if (constants.length) {
      lines.push('## Constants');
      for (const constant of constants) {
        const type = tagsOf(constant.docblock, 'var')[0]?.['@_type'] ?? '';
        const body = [
          this.docblock(constant.docblock),
          constant.value ? `Value: \`${escapeInlineCode(constant.value)}\`` : '',
        ]
          .filter(Boolean)
          .join('\n\n');
        lines.push(this.responseField(constant.name ?? '', type, false, body));
      }
    }

    for (const ctor of constructors) {
      lines.push('## Constructor');
      lines.push(...this.renderMethodBody(ctor, 3));
    }

    if (properties.length) {
      lines.push('## Properties');
      for (const property of properties) {
        const varTag = tagsOf(property.docblock, 'var')[0];
        const type = varTag?.['@_type'] ?? '';
        const description =
          this.docblock(property.docblock) ||
          (varTag?.['@_description']
            ? markdownToMdx(this.resolveInline(varTag['@_description']))
            : '');
        const body = [
          description,
          property.default ? `Default: \`${escapeInlineCode(property.default)}\`` : '',
        ]
          .filter(Boolean)
          .join('\n\n');
        lines.push(this.responseField(property.name ?? '', type, isNullable(type), body));
      }
    }

    if (others.length) {
      lines.push('## Methods');
      for (const method of others) {
        lines.push(`### ${method.name}()`);
        lines.push(...this.renderMethodBody(method, 4));
      }
    }

    return {
      slug: entry.slug,
      title: entry.name,
      description: this.firstSentence(element.docblock),
      tag: entry.tag,
      content: lines.filter(Boolean).join('\n\n'),
    };
  }

  private renderHeritage(entry: Entry): string[] {
    const { element } = entry;
    const heritage = [
      element.extends ? `extends ${element.extends}` : '',
      element.implements?.length ? `implements ${element.implements.join(', ')}` : '',
    ].filter(Boolean);
    if (!heritage.length) return [];
    const modifiers = [
      element['@_abstract'] === 'true' ? 'abstract' : '',
      element['@_final'] === 'true' ? 'final' : '',
    ].filter(Boolean);
    return [this.codeBlock([...modifiers, entry.keyword, entry.name, ...heritage].join(' '))];
  }

  private renderMethodBody(method: PhpMethod, depth: number): string[] {
    const lines = [this.codeBlock(this.signature(method))];
    const comment = this.docblock(method.docblock);
    if (comment) lines.push(comment);

    const args = method.argument ?? [];
    const paramTags = tagsOf(method.docblock, 'param');
    if (args.length) {
      lines.push(`${'#'.repeat(depth)} Parameters`);
      for (const arg of args) {
        const paramTag = paramTags.find((tag) => tag['@_variable'] === arg.name);
        const type = arg.type || paramTag?.['@_type'] || '';
        const optional = Boolean(arg.default) || isNullable(type);
        const body = paramTag?.['@_description']
          ? markdownToMdx(this.resolveInline(paramTag['@_description']))
          : '';
        lines.push(this.responseField(arg.name ?? '', type, optional, body));
      }
    }

    const returnTag = tagsOf(method.docblock, 'return')[0];
    if (returnTag?.['@_type'] && returnTag['@_type'] !== 'void') {
      lines.push(`${'#'.repeat(depth)} Returns`);
      const description = returnTag['@_description']
        ? `\n\n${markdownToMdx(this.resolveInline(returnTag['@_description']))}`
        : '';
      lines.push(`\`${escapeInlineCode(returnTag['@_type'])}\`${description}`);
    }

    const throwsTags = tagsOf(method.docblock, 'throws');
    if (throwsTags.length) {
      lines.push(`${'#'.repeat(depth)} Throws`);
      lines.push(
        markdownToMdx(
          throwsTags
            .map((tag) => {
              const description = tag['@_description'] ? ` ${tag['@_description']}` : '';
              return `- \`${escapeInlineCode(tag['@_type'] ?? 'Exception')}\`${description}`;
            })
            .join('\n')
        )
      );
    }

    return lines;
  }

  private signature(method: PhpMethod): string {
    const params = (method.argument ?? [])
      .map((arg) => {
        const type = arg.type ? `${arg.type} ` : '';
        const fallback = arg.default ? ` = ${arg.default}` : '';
        return `${type}$${arg.name}${fallback}`;
      })
      .join(', ');
    const modifiers = [
      method['@_abstract'] === 'true' ? 'abstract' : '',
      'public',
      method['@_static'] === 'true' ? 'static' : '',
    ].filter(Boolean);
    const returnType = tagsOf(method.docblock, 'return')[0]?.['@_type'];
    const returns = returnType && method.name !== '__construct' ? `: ${returnType}` : '';
    return `${modifiers.join(' ')} function ${method.name}(${params})${returns}`;
  }

  private docblock(docblock?: Docblock): string {
    if (!docblock) return '';
    const chunks: string[] = [];
    const sees = [...tagsOf(docblock, 'see'), ...tagsOf(docblock, 'link')]
      .map((tag) => this.seeLink(tag))
      .filter(Boolean);
    const markdown = [
      docblock.description ?? '',
      docblock['long-description'] ?? '',
      sees.length ? `See ${sees.join(', ')}.` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
    if (markdown) chunks.push(markdownToMdx(this.resolveInline(markdown)));
    const deprecated = tagsOf(docblock, 'deprecated')[0];
    if (deprecated) {
      const reason = deprecated['@_description']
        ? `: ${markdownToMdx(this.resolveInline(deprecated['@_description']))}`
        : '';
      chunks.push(`<Warning>Deprecated${reason}</Warning>`);
    }
    return chunks.filter(Boolean).join('\n\n');
  }

  private seeLink(tag: DocTag): string {
    const target = tag['@_link'] || tag['@_description'] || '';
    if (!target) return '';
    if (/^https?:/.test(target)) return `[${tag['@_description'] || target}](${target})`;
    const slug = this.resolve(target);
    if (slug) return `[${target.replace(/^\\/, '')}](/${slug})`;
    return `\`${target}\``;
  }

  private resolveInline(text: string): string {
    return text.replace(
      /\{@(?:see|link)\s+([^\s}]+)\s*([^}]*)\}/g,
      (_match, target: string, label: string) => {
        const name = label.trim() || target.replace(/^\\/, '');
        if (/^https?:/.test(target)) return `[${name}](${target})`;
        const slug = this.resolve(target);
        return slug ? `[${name}](/${slug})` : `\`${target}\``;
      }
    );
  }

  private resolve(target: string): string | undefined {
    const normalized = target.replace(/^\\/, '').split('::')[0] ?? '';
    return this.slugByName.get(normalized);
  }

  private firstSentence(docblock?: Docblock): string | undefined {
    const text = [docblock?.description ?? '', docblock?.['long-description'] ?? '']
      .join(' ')
      .replace(/\{@(?:see|link)\s+([^\s}]+)[^}]*\}/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) return undefined;
    const sentence = text.split(/(?<=\.)\s/)[0] ?? text;
    return truncate(sentence, 160);
  }

  private responseField(name: string, type: string, optional: boolean, body?: string): string {
    const typeAttr = type ? ` type=${this.jsxString(truncate(type, 80))}` : '';
    const requiredAttr = optional ? '' : ' required';
    return `<ResponseField name=${this.jsxString(name)}${typeAttr}${requiredAttr}>\n${indent(body || '')}\n</ResponseField>`;
  }

  private jsxString(value: string): string {
    return `{${JSON.stringify(value)}}`;
  }

  private codeBlock(code: string): string {
    return `\`\`\`php\n${code}\n\`\`\``;
  }
}

function indent(text: string): string {
  return text
    .split('\n')
    .map((line) => (line ? `  ${line}` : line))
    .join('\n');
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function escapeInlineCode(text: string): string {
  return text.replace(/`/g, '');
}
