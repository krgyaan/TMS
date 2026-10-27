import { XMLParser } from 'fast-xml-parser';
import fse from 'fs-extra';
import path from 'node:path';
import { markdownToMdx } from '../convert.js';
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
];
export async function convertPhpdoc(sourcePath) {
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
    const parsed = parser.parse(xml);
    const entries = collectEntries(parsed.project?.file ?? []);
    if (entries.length === 0) {
        throw new Error(`No phpDocumentor elements found in ${file}`);
    }
    const slugByName = new Map(entries.map((entry) => [entry.fullName, entry.slug]));
    const renderer = new PhpdocRenderer(slugByName);
    const byGroup = new Map();
    for (const entry of entries) {
        const members = byGroup.get(entry.group) ?? [];
        members.push(entry);
        byGroup.set(entry.group, members);
    }
    const rootGroup = entries.find((entry) => entry.namespace.length === 0)?.group;
    const groupNames = [...byGroup.keys()].sort((left, right) => {
        if (left === rootGroup)
            return -1;
        if (right === rootGroup)
            return 1;
        return left.localeCompare(right);
    });
    const pages = [];
    const groups = [];
    for (const groupName of groupNames) {
        const members = (byGroup.get(groupName) ?? []).sort((left, right) => left.name.localeCompare(right.name));
        const groupPages = members.map((entry) => renderer.renderPage(entry));
        pages.push(...groupPages);
        groups.push({ group: groupName, pages: groupPages.map((page) => page.slug) });
    }
    return { pages, groups };
}
function collectEntries(files) {
    const raw = [];
    const namespaces = [];
    for (const file of files) {
        for (const kind of KINDS) {
            for (const element of file[kind.key] ?? []) {
                const name = element.name ?? '';
                if (!name)
                    continue;
                const fullName = (element.full_name ?? name).replace(/^\\/, '');
                raw.push({ element, keyword: kind.key, tag: kind.tag, name, fullName });
                namespaces.push(namespaceSegments(element, name, fullName));
            }
        }
    }
    const prefix = commonPrefix(namespaces);
    const taken = new Set();
    return raw.map((entry, index) => {
        const namespace = (namespaces[index] ?? []).slice(prefix.length);
        const group = namespace.length ? namespace.join('\\') : prefix.join('\\') || 'Reference';
        const base = [...namespace.map(slugify), slugify(entry.name)].join('/');
        let slug = base;
        let counter = 2;
        while (taken.has(slug))
            slug = `${base}-${counter++}`;
        taken.add(slug);
        return { ...entry, namespace, group, slug };
    });
}
function namespaceSegments(element, name, fullName) {
    const namespace = element['@_namespace']?.replace(/^\\/, '');
    if (namespace)
        return namespace.split('\\');
    const segments = fullName.split('\\');
    return segments.at(-1) === name ? segments.slice(0, -1) : segments;
}
function commonPrefix(lists) {
    let prefix = lists[0] ?? [];
    for (const list of lists.slice(1)) {
        let index = 0;
        while (index < prefix.length && prefix[index] === list[index])
            index++;
        prefix = prefix.slice(0, index);
    }
    return prefix;
}
function slugify(name) {
    return (name
        .toLowerCase()
        .replace(/[^a-z0-9-_.]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'item');
}
function tagsOf(docblock, name) {
    return docblock?.tag?.filter((tag) => tag['@_name'] === name) ?? [];
}
function publicOnly(members) {
    return members?.filter((member) => (member['@_visibility'] ?? 'public') === 'public') ?? [];
}
function isNullable(type) {
    return type.startsWith('?') || /(^|\|)null(\||$)/i.test(type);
}
class PhpdocRenderer {
    constructor(slugByName) {
        this.slugByName = slugByName;
    }
    renderPage(entry) {
        const { element } = entry;
        const lines = [];
        const summary = this.docblock(element.docblock);
        if (summary)
            lines.push(summary);
        lines.push(...this.renderHeritage(entry));
        const constants = publicOnly(element.constant).sort((left, right) => (left.name ?? '').localeCompare(right.name ?? ''));
        const properties = publicOnly(element.property).sort((left, right) => (left.name ?? '').localeCompare(right.name ?? ''));
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
                const description = this.docblock(property.docblock) ||
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
    renderHeritage(entry) {
        const { element } = entry;
        const heritage = [
            element.extends ? `extends ${element.extends}` : '',
            element.implements?.length ? `implements ${element.implements.join(', ')}` : '',
        ].filter(Boolean);
        if (!heritage.length)
            return [];
        const modifiers = [
            element['@_abstract'] === 'true' ? 'abstract' : '',
            element['@_final'] === 'true' ? 'final' : '',
        ].filter(Boolean);
        return [this.codeBlock([...modifiers, entry.keyword, entry.name, ...heritage].join(' '))];
    }
    renderMethodBody(method, depth) {
        const lines = [this.codeBlock(this.signature(method))];
        const comment = this.docblock(method.docblock);
        if (comment)
            lines.push(comment);
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
            lines.push(markdownToMdx(throwsTags
                .map((tag) => {
                const description = tag['@_description'] ? ` ${tag['@_description']}` : '';
                return `- \`${escapeInlineCode(tag['@_type'] ?? 'Exception')}\`${description}`;
            })
                .join('\n')));
        }
        return lines;
    }
    signature(method) {
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
    docblock(docblock) {
        if (!docblock)
            return '';
        const chunks = [];
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
        if (markdown)
            chunks.push(markdownToMdx(this.resolveInline(markdown)));
        const deprecated = tagsOf(docblock, 'deprecated')[0];
        if (deprecated) {
            const reason = deprecated['@_description']
                ? `: ${markdownToMdx(this.resolveInline(deprecated['@_description']))}`
                : '';
            chunks.push(`<Warning>Deprecated${reason}</Warning>`);
        }
        return chunks.filter(Boolean).join('\n\n');
    }
    seeLink(tag) {
        const target = tag['@_link'] || tag['@_description'] || '';
        if (!target)
            return '';
        if (/^https?:/.test(target))
            return `[${tag['@_description'] || target}](${target})`;
        const slug = this.resolve(target);
        if (slug)
            return `[${target.replace(/^\\/, '')}](/${slug})`;
        return `\`${target}\``;
    }
    resolveInline(text) {
        return text.replace(/\{@(?:see|link)\s+([^\s}]+)\s*([^}]*)\}/g, (_match, target, label) => {
            const name = label.trim() || target.replace(/^\\/, '');
            if (/^https?:/.test(target))
                return `[${name}](${target})`;
            const slug = this.resolve(target);
            return slug ? `[${name}](/${slug})` : `\`${target}\``;
        });
    }
    resolve(target) {
        const normalized = target.replace(/^\\/, '').split('::')[0] ?? '';
        return this.slugByName.get(normalized);
    }
    firstSentence(docblock) {
        const text = [docblock?.description ?? '', docblock?.['long-description'] ?? '']
            .join(' ')
            .replace(/\{@(?:see|link)\s+([^\s}]+)[^}]*\}/g, '$1')
            .replace(/\s+/g, ' ')
            .trim();
        if (!text)
            return undefined;
        const sentence = text.split(/(?<=\.)\s/)[0] ?? text;
        return truncate(sentence, 160);
    }
    responseField(name, type, optional, body) {
        const typeAttr = type ? ` type=${this.jsxString(truncate(type, 80))}` : '';
        const requiredAttr = optional ? '' : ' required';
        return `<ResponseField name=${this.jsxString(name)}${typeAttr}${requiredAttr}>\n${indent(body || '')}\n</ResponseField>`;
    }
    jsxString(value) {
        return `{${JSON.stringify(value)}}`;
    }
    codeBlock(code) {
        return `\`\`\`php\n${code}\n\`\`\``;
    }
}
function indent(text) {
    return text
        .split('\n')
        .map((line) => (line ? `  ${line}` : line))
        .join('\n');
}
function truncate(text, max) {
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
function escapeInlineCode(text) {
    return text.replace(/`/g, '');
}
//# sourceMappingURL=phpdoc.js.map