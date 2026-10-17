// Which of a route's declared outputs a request will create.
//
// An output declaration in `routes.output_assets` may carry
// `when: {field: value | [values]}` naming top-level JSON request-body fields.
// Every field must match (AND); a list matches any of its values. A field the
// caller leaves out is read from the request schema's `default`, and with no
// default the output is off. `optional` only means "may be absent depending on
// the run's results". `embedded_in` names the output this one goes into while
// that output is on; otherwise it comes back on its own.
//
// Shared by the backend (spec validation, post-run checks) and the frontend
// (the run form's "Saves" list). ouro-py's `ouro.utils.route_outputs` ports
// the same rules; keep them in step.

export type RouteOutputWhenValue = string | number | boolean;
export type RouteOutputWhenSpec = Record<
  string,
  RouteOutputWhenValue | RouteOutputWhenValue[]
>;

export type ResolvedRouteOutput = {
  name: string;
  asset_type: string | null;
  primary: boolean;
  /** May be absent depending on results, even when active. */
  optional: boolean;
  when: RouteOutputWhenSpec | null;
  embedded_in: string | null;
  /** The request switches this output on (always true without `when`). */
  active: boolean;
  /** Active and going into its active `embedded_in` parent. */
  embedded: boolean;
};

type JsonSchema = Record<string, any>;

function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isScalar(value: unknown): value is RouteOutputWhenValue {
  return (
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

/**
 * The application/json schema of an OpenAPI requestBody, preferring an
 * object variant when the body is wrapped in anyOf/oneOf/allOf. Null when
 * there is nothing to inspect.
 */
export function getRequestBodyJsonSchema(
  requestBody: unknown
): JsonSchema | null {
  if (!isPlainObject(requestBody)) return null;
  const content = requestBody.content;
  if (!isPlainObject(content)) return null;
  const media = content["application/json"];
  if (!isPlainObject(media)) return null;
  let schema: any = media.schema;
  if (!isPlainObject(schema)) return null;

  const composed = schema.anyOf || schema.oneOf || schema.allOf;
  if (Array.isArray(composed) && !isPlainObject(schema.properties)) {
    schema =
      composed.find(
        (item: unknown) => isPlainObject(item) && isPlainObject(item.properties)
      ) || composed[0];
  }
  return isPlainObject(schema) ? schema : null;
}

/** One top-level property schema of a JSON request body, or null. */
export function getRequestBodyProperty(
  requestBody: unknown,
  name: string
): JsonSchema | null {
  const schema = getRequestBodyJsonSchema(requestBody);
  if (!isPlainObject(schema?.properties)) return null;
  const property = schema.properties[name];
  return isPlainObject(property) ? property : null;
}

/** The property itself plus every anyOf/oneOf/allOf variant, flattened. */
function propertyVariants(property: JsonSchema): JsonSchema[] {
  const composed = [
    ...(Array.isArray(property.anyOf) ? property.anyOf : []),
    ...(Array.isArray(property.oneOf) ? property.oneOf : []),
    ...(Array.isArray(property.allOf) ? property.allOf : []),
  ].filter(isPlainObject);
  if (composed.length === 0) return [property];
  return composed.flatMap(propertyVariants);
}

function variantAccepts(variant: JsonSchema, value: RouteOutputWhenValue) {
  if (Array.isArray(variant.enum)) return variant.enum.includes(value);
  if ("const" in variant) return variant.const === value;
  const types = Array.isArray(variant.type)
    ? variant.type
    : typeof variant.type === "string"
      ? [variant.type]
      : null;
  // An untyped variant ({} or an unresolved $ref) can't be checked.
  if (!types) return true;
  return types.some((type: string) => {
    if (type === "boolean") return typeof value === "boolean";
    if (type === "string") return typeof value === "string";
    if (type === "number") return typeof value === "number";
    if (type === "integer") return Number.isInteger(value);
    return false;
  });
}

function describeAllowed(property: JsonSchema): string {
  const parts = propertyVariants(property).flatMap((variant) => {
    if (Array.isArray(variant.enum)) {
      return variant.enum
        .filter((v: unknown) => v !== null)
        .map((v: unknown) => JSON.stringify(v));
    }
    if ("const" in variant) return [JSON.stringify(variant.const)];
    const types = Array.isArray(variant.type) ? variant.type : [variant.type];
    return types.filter((t: unknown) => typeof t === "string" && t !== "null");
  });
  return Array.from(new Set(parts)).join(" | ") || "any";
}

function whenValues(
  expected: RouteOutputWhenValue | RouteOutputWhenValue[]
): RouteOutputWhenValue[] {
  return Array.isArray(expected) ? expected : [expected];
}

/**
 * Problems with the `when` conditions of a route's output declarations,
 * checked against its request body schema. Empty when everything is valid.
 */
export function validateRouteOutputWhen(
  outputAssets: unknown,
  requestBody: unknown
): string[] {
  if (!isPlainObject(outputAssets)) return [];
  const errors: string[] = [];
  const schema = getRequestBodyJsonSchema(requestBody);
  const properties = isPlainObject(schema?.properties)
    ? (schema!.properties as Record<string, unknown>)
    : null;

  for (const [name, declaration] of Object.entries(outputAssets)) {
    if (!isPlainObject(declaration)) continue;
    const when = declaration.when;
    if (when == null) continue;
    const label = `output "${name}"`;

    if (!isPlainObject(when) || Object.keys(when).length === 0) {
      errors.push(`${label}: when must be an object of request fields`);
      continue;
    }
    if (!properties) {
      errors.push(
        `${label}: when needs a JSON request body with properties to check`
      );
      continue;
    }

    for (const [field, expected] of Object.entries(when)) {
      const property = properties[field];
      if (!isPlainObject(property)) {
        const available = Object.keys(properties).join(", ") || "(none)";
        errors.push(
          `${label}: when field "${field}" is not a request body property (available: ${available})`
        );
        continue;
      }
      const values = Array.isArray(expected) ? expected : [expected];
      if (values.length === 0 || !values.every(isScalar)) {
        errors.push(
          `${label}: when "${field}" must be a string, number or boolean, or a non-empty list of them`
        );
        continue;
      }
      const variants = propertyVariants(property);
      const bad = values.filter(
        (value) => !variants.some((variant) => variantAccepts(variant, value))
      );
      if (bad.length > 0) {
        errors.push(
          `${label}: when "${field}" value ${bad
            .map((value) => JSON.stringify(value))
            .join(", ")} does not fit the property (allowed: ${describeAllowed(property)})`
        );
      }
    }
  }
  return errors;
}

function sameValue(actual: unknown, expected: RouteOutputWhenValue): boolean {
  if (actual === expected) return true;
  // Form inputs can hand numbers over as strings.
  if (
    typeof expected === "number" &&
    typeof actual === "string" &&
    actual.trim() !== ""
  ) {
    return Number(actual) === expected;
  }
  return false;
}

/**
 * Whether a request body switches on an output with this `when`. A missing
 * or empty `when` always matches.
 */
export function routeOutputWhenMatches(
  when: unknown,
  body: unknown,
  requestBody?: unknown
): boolean {
  if (!isPlainObject(when)) return true;
  const values = isPlainObject(body) ? body : {};
  return Object.entries(when).every(([field, expected]) => {
    let actual = values[field];
    if (actual === undefined) {
      actual = getRequestBodyProperty(requestBody, field)?.default;
    }
    if (actual === undefined || actual === null) return false;
    return whenValues(expected as any).some((value) => sameValue(actual, value));
  });
}

/** Short human-readable condition, e.g. `include_dataset is true`. */
export function describeRouteOutputWhen(when: unknown): string | null {
  if (!isPlainObject(when)) return null;
  const parts = Object.entries(when).map(([field, expected]) => {
    const values = whenValues(expected as any).map((value) => String(value));
    return values.length === 1
      ? `${field} is ${values[0]}`
      : `${field} is ${values.slice(0, -1).join(", ")} or ${values[values.length - 1]}`;
  });
  return parts.length > 0 ? parts.join(" and ") : null;
}

/**
 * Every declared output with whether this request body switches it on.
 * Pass `body` as undefined to describe the route without a request (every
 * conditional output then follows its schema defaults).
 */
export function resolveRouteOutputs(
  outputAssets: unknown,
  requestBody: unknown,
  body: unknown
): ResolvedRouteOutput[] {
  if (!isPlainObject(outputAssets)) return [];
  const entries = Object.entries(outputAssets).filter(([, declaration]) =>
    isPlainObject(declaration)
  ) as [string, Record<string, any>][];

  const active = new Map<string, boolean>();
  for (const [name, declaration] of entries) {
    active.set(
      name,
      routeOutputWhenMatches(declaration.when, body, requestBody)
    );
  }

  return entries.map(([name, declaration]) => {
    const parent =
      typeof declaration.embedded_in === "string" && declaration.embedded_in
        ? declaration.embedded_in
        : null;
    const isActive = active.get(name) ?? true;
    return {
      name,
      asset_type:
        typeof declaration.asset_type === "string"
          ? declaration.asset_type
          : null,
      primary: declaration.primary === true,
      optional: declaration.optional === true,
      when: isPlainObject(declaration.when)
        ? (declaration.when as RouteOutputWhenSpec)
        : null,
      embedded_in: parent,
      active: isActive,
      embedded: isActive && parent != null && active.get(parent) === true,
    };
  });
}
