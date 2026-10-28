import fse from 'fs-extra';
import yaml from 'js-yaml';
import path from 'node:path';

import { htmlToMdx } from '../convert.js';
import type { SdkNavGroup, SdkPage, SdkReference } from '../types.js';

type DocfxParameter = { id?: string; type?: string; description?: string };
type DocfxSyntax = {
  content?: string;
  parameters?: DocfxParameter[];
  typeParameters?: DocfxParameter[];
  return?: { type?: string; description?: string };
};
type DocfxItem = {
  uid: string;
  parent?: string;
  children?: string[];
  name?: string;
  type?: string;
  namespace?: string;
  summary?: string;
  remarks?: string;
  example?: string[];
  syntax?: DocfxSyntax;
};
type DocfxFile = { items?: DocfxItem[]; references?: { uid?: string; name?: string }[] };
type TocNode = { uid?: string; type?: string; items?: TocNode[] };

const PAGE_TAGS: Record<string, string> = {
  Class: 'CLASS',
  Interface: 'INTERFACE',
  Enum: 'ENUM',
  Struct: 'STRUCT',
  Delegate: 'DELEGATE',
};

export async function convertDocfx(sourcePath: string): Promise<SdkReference> {
  const files = await loadManagedReferenceFiles(sourcePath);
  const itemsByUid = new Map<string, DocfxItem>();
  const namesByUid = new Map<string, string>();
  for (const file of files) {
    for (const item of file.items ?? []) {
      if (!item.uid) continue;
      itemsByUid.set(item.uid, item);
      if (item.name) namesByUid.set(item.uid, item.name);
    }
    for (const reference of file.references ?? []) {
      if (reference.uid && reference.name && !namesByUid.has(reference.uid)) {
        namesByUid.set(reference.uid, reference.name);
      }
    }
  }

  const types = [...itemsByUid.values()]
    .filter((item) => item.type !== undefined && item.type in PAGE_TAGS)
    .sort((left, right) => (left.name ?? '').localeCompare(right.name ?? ''));
  const namespaceSlug = namespaceSlugs(
    [...new Set(types.map((type) => type.namespace ?? ''))].sort()
  );
  const slugByUid = new Map<string, string>();
  for (const type of types) {
    slugByUid.set(
      type.uid,
      path.posix.join(namespaceSlug.get(type.namespace ?? '') ?? '', slugify(type.name ?? type.uid))
    );
  }

  const renderer = new DocfxRenderer(slugByUid, namesByUid, itemsByUid);
  const { tocNamespaces, tocOrder } = await loadToc(sourcePath);

  const typesByNamespace = new Map<string, DocfxItem[]>();
  for (const type of types) {
    const namespace = type.namespace ?? '';
    typesByNamespace.set(namespace, [...(typesByNamespace.get(namespace) ?? []), type]);
  }
  const namespaceOrder = [
    ...tocNamespaces.filter((namespace) => typesByNamespace.has(namespace)),
    ...[...typesByNamespace.keys()]
      .filter((namespace) => !tocNamespaces.includes(namespace))
      .sort(),
  ];

  const pages: SdkPage[] = [];
  const groups: SdkNavGroup[] = [];
  for (const namespace of namespaceOrder) {
    const ordered = orderByToc(
      typesByNamespace.get(namespace) ?? [],
      tocOrder.get(namespace) ?? []
    );
    const namespacePages = ordered.map((type) => renderer.renderPage(type));
    pages.push(...namespacePages);
    groups.push({
      group: namespace || 'Reference',
      pages: namespacePages.map((page) => page.slug),
    });
  }

  return { pages, groups };
}

async function loadManagedReferenceFiles(sourcePath: string): Promise<DocfxFile[]> {
  const entries = await fse.readdir(sourcePath);
  const files: DocfxFile[] = [];
  for (const entry of entries.filter((name) => /\.ya?ml$/.test(name)).sort()) {
    const raw = await fse.readFile(path.join(sourcePath, entry), 'utf8');
    if (!raw.startsWith('### YamlMime:ManagedReference')) continue;
    const parsed = yaml.load(raw);
    if (parsed && typeof parsed === 'object') files.push(parsed as DocfxFile);
  }
  return files;
}

async function loadToc(
  sourcePath: string
): Promise<{ tocNamespaces: string[]; tocOrder: Map<string, string[]> }> {
  const tocNamespaces: string[] = [];
  const tocOrder = new Map<string, string[]>();
  const tocPath = path.join(sourcePath, 'toc.yml');
  if (!(await fse.pathExists(tocPath))) return { tocNamespaces, tocOrder };
  const parsed = yaml.load(await fse.readFile(tocPath, 'utf8')) as
    | { items?: TocNode[] }
    | undefined;
  const collect = (nodes: TocNode[]) => {
    for (const node of nodes) {
      if (node.type === 'Namespace' && node.uid !== undefined) {
        tocNamespaces.push(node.uid);
        tocOrder.set(
          node.uid,
          (node.items ?? [])
            .map((child) => child.uid)
            .filter((uid): uid is string => typeof uid === 'string')
        );
      }
      if (node.items) collect(node.items);
    }
  };
  collect(parsed?.items ?? []);
  return { tocNamespaces, tocOrder };
}

function orderByToc(types: DocfxItem[], order: string[]): DocfxItem[] {
  const rank = new Map(order.map((uid, index) => [uid, index]));
  return [...types].sort((left, right) => {
    const leftRank = rank.get(left.uid);
    const rightRank = rank.get(right.uid);
    if (leftRank !== undefined && rightRank !== undefined) return leftRank - rightRank;
    if (leftRank !== undefined) return -1;
    if (rightRank !== undefined) return 1;
    return (left.name ?? '').localeCompare(right.name ?? '');
  });
}

function namespaceSlugs(namespaces: string[]): Map<string, string> {
  const parts = namespaces.map((namespace) => namespace.split('.'));
  let common = parts[0] ?? [];
  for (const segments of parts.slice(1)) {
    let index = 0;
    while (index < common.length && common[index] === segments[index]) index += 1;
    common = common.slice(0, index);
  }
  const slugs = new Map<string, string>();
  const used = new Set<string>();
  for (const [index, namespace] of namespaces.entries()) {
    const segments = parts[index] ?? [];
    const rest = segments.slice(common.length);
    const base = slugify((rest.length ? rest : segments.slice(-1)).join('-'));
    let slug = used.has(base) ? slugify(segments.join('-')) : base;
    for (let suffix = 2; used.has(slug); suffix += 1) {
      slug = `${slugify(segments.join('-'))}-${suffix}`;
    }
    used.add(slug);
    slugs.set(namespace, slug);
  }
  return slugs;
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/`+\d*/g, '')
      .replace(/[^a-z0-9-_.]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item'
  );
}

class DocfxRenderer {
  constructor(
    private slugByUid: Map<string, string>,
    private namesByUid: Map<string, string>,
    private itemsByUid: Map<string, DocfxItem>
  ) {}

  renderPage(item: DocfxItem): SdkPage {
    const lines: string[] = [this.prose(item.summary)];
    if (item.syntax?.content) lines.push(this.codeBlock(item.syntax.content));
    lines.push(this.prose(item.remarks));
    lines.push(...(item.example ?? []).map((example) => this.renderExample(example)));

    switch (item.type) {
      case 'Enum':
        lines.push(...this.renderEnum(item));
        break;
      case 'Delegate':
        lines.push(...this.renderSignatureDetails(item.syntax, 2));
        break;
      default:
        lines.push(...this.renderTypeMembers(item));
    }

    return {
      slug: this.slugByUid.get(item.uid) ?? slugify(item.name ?? item.uid),
      title: item.name ?? item.uid,
      description: this.firstSentence(item.summary),
      tag: PAGE_TAGS[item.type ?? ''],
      content: lines.filter(Boolean).join('\n\n'),
    };
  }

  private members(item: DocfxItem): DocfxItem[] {
    return (item.children ?? [])
      .map((uid) => this.itemsByUid.get(uid))
      .filter((member): member is DocfxItem => member !== undefined);
  }

  private renderTypeMembers(item: DocfxItem): string[] {
    const members = this.members(item);
    const lines: string[] = [];
    const constructors = members.filter((member) => member.type === 'Constructor');
    const fields = members.filter((member) => member.type === 'Field').sort(byName);
    const properties = members
      .filter((member) => member.type === 'Property' || member.type === 'Event')
      .sort(byName);
    const methods = members.filter(
      (member) => member.type === 'Method' || member.type === 'Operator'
    );

    if (constructors.length) {
      lines.push('## Constructors');
      for (const ctor of constructors) lines.push(...this.renderMember(ctor, 3));
    }
    if (fields.length) {
      lines.push('## Fields');
      for (const field of fields) lines.push(this.memberField(field));
    }
    if (properties.length) {
      lines.push('## Properties');
      for (const property of properties) lines.push(this.memberField(property));
    }
    if (methods.length) {
      lines.push('## Methods');
      const grouped = new Map<string, DocfxItem[]>();
      for (const method of methods) {
        const base = baseName(method.name ?? method.uid);
        grouped.set(base, [...(grouped.get(base) ?? []), method]);
      }
      for (const [name, overloads] of [...grouped.entries()].sort(([left], [right]) =>
        left.localeCompare(right)
      )) {
        lines.push(`### ${name}()`);
        for (const overload of overloads) lines.push(...this.renderMember(overload, 4));
      }
    }
    return lines;
  }

  private renderEnum(item: DocfxItem): string[] {
    const lines: string[] = ['## Members'];
    for (const member of this.members(item).filter((child) => child.type === 'Field')) {
      const value = member.syntax?.content?.split('=')[1]?.trim() ?? '';
      lines.push(
        this.responseField(member.name ?? member.uid, value, false, this.prose(member.summary))
      );
    }
    return lines;
  }

  private renderMember(member: DocfxItem, depth: number): string[] {
    const lines: string[] = [];
    if (member.syntax?.content) lines.push(this.codeBlock(member.syntax.content));
    lines.push(this.prose(member.summary), this.prose(member.remarks));
    lines.push(...(member.example ?? []).map((example) => this.renderExample(example)));
    lines.push(...this.renderSignatureDetails(member.syntax, depth));
    return lines.filter(Boolean);
  }

  private renderSignatureDetails(syntax: DocfxSyntax | undefined, depth: number): string[] {
    if (!syntax) return [];
    const lines: string[] = [];
    const heading = '#'.repeat(depth);
    if (syntax.typeParameters?.length) {
      lines.push(`${heading} Type Parameters`);
      for (const param of syntax.typeParameters) {
        lines.push(this.responseField(param.id ?? '', '', false, this.prose(param.description)));
      }
    }
    if (syntax.parameters?.length) {
      lines.push(`${heading} Parameters`);
      for (const param of syntax.parameters) {
        lines.push(
          this.responseField(
            param.id ?? '',
            this.typeName(param.type),
            isOptionalParameter(param.id, syntax.content),
            this.prose(param.description)
          )
        );
      }
    }
    const returnType = this.typeName(syntax.return?.type);
    if (returnType && returnType.toLowerCase() !== 'void') {
      lines.push(`${heading} Returns`);
      const description = this.prose(syntax.return?.description);
      lines.push(`\`${escapeInlineCode(returnType)}\`${description ? `\n\n${description}` : ''}`);
    }
    return lines;
  }

  private memberField(member: DocfxItem): string {
    const body = [
      this.prose(member.summary),
      this.prose(member.remarks),
      ...(member.example ?? []).map((example) => this.renderExample(example)),
    ]
      .filter(Boolean)
      .join('\n\n');
    return this.responseField(
      member.name ?? member.uid,
      this.typeName(member.syntax?.return?.type),
      isNullable(member.syntax?.content),
      body
    );
  }

  private responseField(name: string, type: string, optional: boolean, body?: string): string {
    const typeAttr = type ? ` type=${this.jsxString(truncate(type, 80))}` : '';
    const requiredAttr = optional ? '' : ' required';
    return `<ResponseField name=${this.jsxString(name)}${typeAttr}${requiredAttr}>\n${indent(body || '')}\n</ResponseField>`;
  }

  private jsxString(value: string): string {
    return `{${JSON.stringify(value)}}`;
  }

  private codeBlock(code: string, lang = 'csharp'): string {
    return `\`\`\`${lang}\n${code}\n\`\`\``;
  }

  private renderExample(example: string): string {
    if (/<[a-z][^>]*>/i.test(example)) return this.prose(example);
    return this.codeBlock(decodeEntities(example));
  }

  private prose(html?: string): string {
    if (!html) return '';
    const resolved = this.inlineCodeSpans(this.resolveXrefs(html));
    return resolved
      .split(/(<pre[^>]*>[\s\S]*?<\/pre>)/g)
      .map((segment, index) =>
        index % 2 === 1 ? this.preToCodeBlock(segment) : htmlToMdx(segment)
      )
      .filter(Boolean)
      .join('\n\n');
  }

  private preToCodeBlock(segment: string): string {
    const lang = /class="lang(?:uage)?-([\w-]+)"/.exec(segment)?.[1] ?? 'csharp';
    const code = decodeEntities(segment.replace(/<[^>]+>/g, '')).replace(/^\n+|\n+$/g, '');
    return this.codeBlock(code, lang);
  }

  private resolveXrefs(html: string): string {
    return html.replace(
      /<xref\s[^>]*?(?:href|uid)="([^"]+)"[^>]*>([\s\S]*?)<\/xref>/g,
      (_, href: string, text: string) => {
        const uid = decodeUid(href);
        const label = text.trim() || escapeHtml(this.shortName(uid));
        const slug = this.slugForUid(uid);
        return slug ? `<a href="/${slug}">${label}</a>` : `<code>${label}</code>`;
      }
    );
  }

  private inlineCodeSpans(html: string): string {
    return html
      .split(/(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>)/g)
      .map((segment, index) =>
        index % 2 === 1
          ? segment
          : segment.replace(/`([^`\n]+)`/g, (_, code: string) => `<code>${escapeHtml(code)}</code>`)
      )
      .join('');
  }

  private slugForUid(uid: string): string | undefined {
    const direct = this.slugByUid.get(uid);
    if (direct) return direct;
    const parent =
      this.itemsByUid.get(uid)?.parent ??
      uid
        .replace(/\(.*\)$/, '')
        .replace(/\*$/, '')
        .replace(/\.[^.]*$/, '');
    return parent ? this.slugByUid.get(parent) : undefined;
  }

  private shortName(uid: string): string {
    return this.namesByUid.get(uid) ?? shortNameFromUid(uid);
  }

  private typeName(uid?: string): string {
    return uid ? this.shortName(uid) : '';
  }

  private firstSentence(summary?: string): string | undefined {
    if (!summary) return undefined;
    const text = decodeEntities(summary.replace(/<[^>]*>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) return undefined;
    const sentence = text.split(/(?<=\.)\s/)[0] ?? text;
    return truncate(sentence, 160);
  }
}

function byName(left: DocfxItem, right: DocfxItem): number {
  return (left.name ?? '').localeCompare(right.name ?? '');
}

function baseName(name: string): string {
  return name.split(/[(<]/)[0]?.trim() || name;
}

function shortNameFromUid(uid: string): string {
  return uid
    .replace(/`+\d+/g, '')
    .replace(/\{/g, '<')
    .replace(/\}/g, '>')
    .replace(/[A-Za-z_][A-Za-z0-9_.]*/g, (dotted) => dotted.split('.').at(-1) ?? dotted);
}

function decodeUid(href: string): string {
  try {
    return decodeEntities(decodeURIComponent(href));
  } catch {
    return decodeEntities(href);
  }
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isNullable(content?: string): boolean {
  return content !== undefined && /\?\s+\w+\s*[{;=]/.test(content);
}

function isOptionalParameter(id?: string, content?: string): boolean {
  if (!id || !content) return false;
  return new RegExp(`\\b${escapeRegExp(id)}\\s*=`).test(content);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
