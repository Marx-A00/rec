// src/lib/graphql/resolvers/scalars.ts
// Custom scalar type resolvers

import { GraphQLScalarType, GraphQLError } from 'graphql';
import { Kind } from 'graphql/language';

// DateTime scalar - handles Date objects and ISO strings
const DateTimeType = new GraphQLScalarType({
  name: 'DateTime',
  description: 'Date and time as ISO string or Date object',
  serialize(value: any) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    throw new GraphQLError(`Invalid DateTime value: ${value}`);
  },
  parseValue(value: any) {
    if (typeof value === 'string') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    throw new GraphQLError(`Invalid DateTime value: ${value}`);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      const date = new Date(ast.value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    throw new GraphQLError(`Invalid DateTime literal: ${ast}`);
  },
});

// UUID scalar - validates UUID format
const UUIDType = new GraphQLScalarType({
  name: 'UUID',
  description: 'UUID string in standard format',
  serialize(value: any) {
    if (typeof value === 'string' && isValidUUID(value)) {
      return value;
    }
    throw new GraphQLError(`Invalid UUID value: ${value}`);
  },
  parseValue(value: any) {
    if (typeof value === 'string' && isValidUUID(value)) {
      return value;
    }
    throw new GraphQLError(`Invalid UUID value: ${value}`);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING && isValidUUID(ast.value)) {
      return ast.value;
    }
    throw new GraphQLError(`Invalid UUID literal: ${ast}`);
  },
});

// JSON scalar - handles any JSON-serializable value
const JSONType: GraphQLScalarType = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON value (object, array, string, number, boolean, or null)',
  serialize(value: any) {
    return value;
  },
  parseValue(value: any) {
    return value;
  },
  parseLiteral(ast): any {
    switch (ast.kind) {
      case Kind.STRING:
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.INT:
      case Kind.FLOAT:
        return parseFloat(ast.value);
      case Kind.OBJECT: {
        const value = Object.create(null);
        ast.fields.forEach(field => {
          value[field.name.value] = JSONType.parseLiteral(field.value, {});
        });
        return value;
      }
      case Kind.LIST:
        return ast.values.map(node => JSONType.parseLiteral(node, {}));
      case Kind.NULL:
        return null;
      default:
        throw new GraphQLError(`Invalid JSON literal: ${ast}`);
    }
  },
});

// UUID validation regex
function isValidUUID(value: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export const scalarResolvers = {
  DateTime: DateTimeType,
  UUID: UUIDType,
  JSON: JSONType,
};
