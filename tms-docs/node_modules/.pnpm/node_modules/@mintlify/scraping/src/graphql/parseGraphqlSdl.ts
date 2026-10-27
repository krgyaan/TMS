import type {
  GraphqlField,
  GraphqlInputValue,
  GraphqlReference,
  GraphqlType,
  GraphqlTypeRef,
} from '@mintlify/models';
import {
  buildSchema,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
  isScalarType,
  isSpecifiedScalarType,
  isUnionType,
  print,
  validateSchema,
  valueFromASTUntyped,
  type GraphQLArgument,
  type GraphQLField,
  type GraphQLInputField,
  type GraphQLType,
} from 'graphql';

const isVisibleName = (name: string) => !name.startsWith('__');

const withDescription = (description: string | undefined | null) =>
  description === undefined || description === null ? {} : { description };

const withDeprecation = (deprecationReason: string | undefined | null) =>
  deprecationReason === undefined || deprecationReason === null ? {} : { deprecationReason };

function normalizeGraphqlTypeRef(type: GraphQLType): GraphqlTypeRef {
  if (isNonNullType(type)) {
    return { kind: 'nonNull', ofType: normalizeGraphqlTypeRef(type.ofType) };
  }
  if (isListType(type)) {
    return { kind: 'list', ofType: normalizeGraphqlTypeRef(type.ofType) };
  }
  return { kind: 'named', name: type.name };
}

function normalizeInputValue(field: GraphQLArgument | GraphQLInputField): GraphqlInputValue {
  const defaultValue = field.astNode?.defaultValue;
  return {
    name: field.name,
    type: normalizeGraphqlTypeRef(field.type),
    ...withDescription(field.description),
    ...(defaultValue === undefined
      ? {}
      : {
          defaultValue: valueFromASTUntyped(defaultValue),
          defaultValueLiteral: print(defaultValue),
        }),
    ...withDeprecation(field.deprecationReason),
  };
}

function normalizeField(field: GraphQLField<unknown, unknown>): GraphqlField {
  return {
    name: field.name,
    type: normalizeGraphqlTypeRef(field.type),
    ...withDescription(field.description),
    arguments: field.args.filter(({ name }) => isVisibleName(name)).map(normalizeInputValue),
    ...withDeprecation(field.deprecationReason),
  };
}

export function parseGraphqlSdl(sdl: string): GraphqlReference {
  const schema = buildSchema(sdl);
  const validationErrors = validateSchema(schema);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.map(({ message }) => message).join('\n'));
  }

  const types: GraphqlType[] = [];
  for (const type of Object.values(schema.getTypeMap())) {
    if (!isVisibleName(type.name) || (isScalarType(type) && isSpecifiedScalarType(type))) {
      continue;
    }

    const named = { name: type.name, ...withDescription(type.description) };
    if (isObjectType(type)) {
      types.push({
        kind: 'object',
        ...named,
        fields: Object.values(type.getFields())
          .filter(({ name }) => isVisibleName(name))
          .map(normalizeField),
        interfaces: type.getInterfaces().map(({ name }) => name),
      });
    } else if (isInputObjectType(type)) {
      types.push({
        kind: 'input',
        ...named,
        fields: Object.values(type.getFields())
          .filter(({ name }) => isVisibleName(name))
          .map(normalizeInputValue),
      });
    } else if (isEnumType(type)) {
      types.push({
        kind: 'enum',
        ...named,
        values: type
          .getValues()
          .filter(({ name }) => isVisibleName(name))
          .map((value) => ({
            name: value.name,
            ...withDescription(value.description),
            ...withDeprecation(value.deprecationReason),
          })),
      });
    } else if (isInterfaceType(type)) {
      types.push({
        kind: 'interface',
        ...named,
        fields: Object.values(type.getFields())
          .filter(({ name }) => isVisibleName(name))
          .map(normalizeField),
        interfaces: type.getInterfaces().map(({ name }) => name),
        possibleTypes: schema.getPossibleTypes(type).map(({ name }) => name),
      });
    } else if (isUnionType(type)) {
      types.push({
        kind: 'union',
        ...named,
        possibleTypes: type.getTypes().map(({ name }) => name),
      });
    } else if (isScalarType(type)) {
      types.push({ kind: 'scalar', ...named });
    }
  }

  const queryType = schema.getQueryType();
  const mutationType = schema.getMutationType();
  const subscriptionType = schema.getSubscriptionType();
  return {
    ...(queryType == null ? {} : { queryType: queryType.name }),
    ...(mutationType == null ? {} : { mutationType: mutationType.name }),
    ...(subscriptionType == null ? {} : { subscriptionType: subscriptionType.name }),
    types,
  };
}
