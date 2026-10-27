import {
  optionallyAddLeadingSlash,
  camelToSentenceCase,
  prepareStringToBeValidFilename,
  generateUniqueFilenameWithoutExtension,
  DEFAULT_WEBSOCKETS_GROUP_NAME,
} from '@mintlify/common';
import { AsyncAPIChannel } from '@mintlify/common';
import { DecoratedNavigationPage, NavigationEntry } from '@mintlify/models';
import {
  DecoratedGroupsConfig,
  DecoratedPagesConfig,
  GroupsConfig,
  PagesConfig,
} from '@mintlify/validation';
import fse from 'fs-extra';
import { outputFile } from 'fs-extra';
import { join, resolve } from 'path';

type GenerateAsyncApiPagesOptions = {
  asyncApiFilePath?: string;
  version?: string;
  writeFiles?: boolean;
  outDir?: string;
  outDirBasePath?: string;
  overwrite?: boolean;
  writeFile?: (filename: string, content: string) => void | Promise<void>;
};

type ProcessAsyncApiChannelArgs = {
  channel: AsyncAPIChannel;
  nav: GroupsConfig;
  decoratedNav: DecoratedGroupsConfig;
  writePromises: Promise<void>[];
  pagesAcc: Record<string, DecoratedNavigationPage>;
  opts?: GenerateAsyncApiPagesOptions;
  findNavGroup: {
    (nav: GroupsConfig, groupName?: string): PagesConfig;
    (nav: DecoratedGroupsConfig, groupName?: string): DecoratedPagesConfig;
  };
};

export const processAsyncApiChannel = ({
  channel,
  nav,
  decoratedNav,
  writePromises,
  pagesAcc,
  opts,
  findNavGroup,
}: ProcessAsyncApiChannelArgs) => {
  const asyncApiFilePathFromRoot = opts?.asyncApiFilePath
    ? optionallyAddLeadingSlash(opts.asyncApiFilePath)
    : undefined;

  const tags = channel.tags().all();
  const groupName = tags[0]?.name() ?? DEFAULT_WEBSOCKETS_GROUP_NAME;
  const channelId = channel.id();
  const title = channel.title() ?? channelId;
  const filename = prepareStringToBeValidFilename(title) ?? '';
  const description = channel.description() ?? channel.summary() ?? '';

  const folder = prepareStringToBeValidFilename(groupName) ?? '';
  const base = join(opts?.outDir ?? '', folder, filename);

  const navGroup = findNavGroup(nav, groupName);
  const decoratedNavGroup = findNavGroup(decoratedNav, groupName);

  const filenameWithoutExtension = generateUniqueFilenameWithoutExtension(
    navGroup as NavigationEntry[],
    base
  );

  const asyncApiMetaTag = `${
    asyncApiFilePathFromRoot ? `${asyncApiFilePathFromRoot} ` : ''
  }${channelId}`;

  navGroup.push(filenameWithoutExtension);

  const page: DecoratedNavigationPage = {
    asyncapi: asyncApiMetaTag,
    href: resolve('/', filenameWithoutExtension),
    title: title === channelId ? camelToSentenceCase(title) : title,
    description,
    version: opts?.version,
  };
  decoratedNavGroup.push(page);
  pagesAcc[filenameWithoutExtension] = page;

  const targetPath = opts?.outDirBasePath
    ? join(opts.outDirBasePath, `${filenameWithoutExtension}.mdx`)
    : `${filenameWithoutExtension}.mdx`;
  if (opts?.writeFiles && (!fse.pathExistsSync(targetPath) || opts.overwrite)) {
    const content = createAsyncApiFrontmatterContent(asyncApiMetaTag, opts.version);
    writePromises.push(
      opts.writeFile
        ? Promise.resolve(opts.writeFile(targetPath, content))
        : outputFile(targetPath, content)
    );
  }
};

const createAsyncApiFrontmatterContent = (asyncApiMetaTag: string, version?: string) => `---
asyncapi: ${asyncApiMetaTag}${version ? `\nversion: ${version}` : ''}
---`;
