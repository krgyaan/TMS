import { describe, expect, it } from 'vitest';

import { parseGraphqlSdl } from '../src/graphql/parseGraphqlSdl.js';

describe('parseGraphqlSdl', () => {
  it('normalizes a validated schema into serializable reference data', () => {
    const reference = parseGraphqlSdl(`
      schema {
        query: Root
        mutation: Commands
      }

      "An entity with an ID."
      interface Node {
        id: ID!
      }

      type User implements Node {
        id: ID!
        name: String! @deprecated(reason: "Use displayName")
        role: Role!
      }

      type Bot implements Node {
        id: ID!
      }

      union Actor = User | Bot
      scalar DateTime

      enum Role {
        ADMIN
        MEMBER @deprecated
      }

      input UserFilter {
        roles: [Role!]! = [MEMBER]
        active: Boolean = true @deprecated(reason: "Always active")
        label: String = "member"
        nested: Nested = { enabled: true, roles: [ADMIN] }
        optional: String = null
      }

      input Nested {
        enabled: Boolean
        roles: [Role!]
      }

      type Root {
        "Find users."
        users(filter: UserFilter = { active: true }): [User!]!
        actor: Actor
        createdAt: DateTime
      }

      type Commands {
        rename(id: ID!, name: String!): User
      }
    `);

    expect(reference.queryType).toBe('Root');
    expect(reference.mutationType).toBe('Commands');
    expect(reference.types.find(({ name }) => name === 'Node')).toMatchObject({
      kind: 'interface',
      description: 'An entity with an ID.',
      possibleTypes: ['User', 'Bot'],
    });
    expect(reference.types.find(({ name }) => name === 'Actor')).toEqual({
      kind: 'union',
      name: 'Actor',
      possibleTypes: ['User', 'Bot'],
    });
    expect(reference.types.find(({ name }) => name === 'DateTime')).toEqual({
      kind: 'scalar',
      name: 'DateTime',
    });

    const user = reference.types.find(({ name }) => name === 'User');
    expect(user).toMatchObject({
      kind: 'object',
      interfaces: ['Node'],
      fields: expect.arrayContaining([
        expect.objectContaining({ name: 'name', deprecationReason: 'Use displayName' }),
      ]),
    });

    const input = reference.types.find(({ name }) => name === 'UserFilter');
    expect(input).toMatchObject({
      kind: 'input',
      fields: [
        expect.objectContaining({
          name: 'roles',
          defaultValue: ['MEMBER'],
          defaultValueLiteral: '[MEMBER]',
        }),
        expect.objectContaining({
          name: 'active',
          defaultValue: true,
          defaultValueLiteral: 'true',
          deprecationReason: 'Always active',
        }),
        expect.objectContaining({
          name: 'label',
          defaultValue: 'member',
          defaultValueLiteral: '"member"',
        }),
        expect.objectContaining({
          name: 'nested',
          defaultValue: { enabled: true, roles: ['ADMIN'] },
          defaultValueLiteral: '{enabled: true, roles: [ADMIN]}',
        }),
        expect.objectContaining({
          name: 'optional',
          defaultValue: null,
          defaultValueLiteral: 'null',
        }),
      ],
    });

    expect(reference.types.some(({ name }) => name.startsWith('__'))).toBe(false);
    expect(reference.types.some(({ name }) => name === 'String')).toBe(false);
    expect(JSON.parse(JSON.stringify(reference))).toEqual(reference);
  });

  it('preserves empty deprecation reasons as deprecation presence', () => {
    const reference = parseGraphqlSdl(`
      type Query { old: String @deprecated(reason: "") }
    `);
    const query = reference.types.find(({ name }) => name === 'Query');

    expect(query).toMatchObject({
      kind: 'object',
      fields: [expect.objectContaining({ name: 'old', deprecationReason: '' })],
    });
  });

  it('preserves nested list and non-null type references', () => {
    const reference = parseGraphqlSdl('type Query { matrix: [[String!]!]! }');
    const query = reference.types.find(({ name }) => name === 'Query');
    if (query?.kind !== 'object') {
      throw new Error('Expected Query object');
    }

    const type = query.fields[0]?.type;
    expect(type).toBeDefined();
    expect(type).toEqual({
      kind: 'nonNull',
      ofType: {
        kind: 'list',
        ofType: {
          kind: 'nonNull',
          ofType: {
            kind: 'list',
            ofType: {
              kind: 'nonNull',
              ofType: { kind: 'named', name: 'String' },
            },
          },
        },
      },
    });
  });

  it('uses implicit root names and rejects invalid schemas', () => {
    expect(parseGraphqlSdl('type Query { ping: String }').queryType).toBe('Query');
    expect(() => parseGraphqlSdl('type Query { broken: Missing }')).toThrow('Unknown type');
    expect(() =>
      parseGraphqlSdl('type Query { value: String } type Unused { id: ID }')
    ).not.toThrow();
    expect(() => parseGraphqlSdl('type NotQuery { value: String }')).toThrow(
      'Query root type must be provided'
    );
  });
});
