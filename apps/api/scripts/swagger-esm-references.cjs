const ts = require('typescript');

// Swagger 11 constructs inferred DTO references as synthetic identifiers containing
// "(await import(...)).Type". Swagger metadata callbacks need synchronous constructors.
const generatedReference = /^(\[*)\(await import\("([^"]+)"\)\)\.([\w$]+)(\]*)$/u;

exports.after = () => (context) => (sourceFile) => {
  const { factory } = context;
  const imports = new Map();

  const visit = (node) => {
    if (!ts.isIdentifier(node) || node.pos !== -1) {
      return ts.visitEachChild(node, visit, context);
    }
    const match = generatedReference.exec(node.text);
    if (!match) return node;

    const [, arrays, specifier, type, closingArrays] = match;
    if (arrays.length !== closingArrays.length) return node;

    let namespace = imports.get(specifier);
    if (!namespace) {
      namespace = factory.createUniqueName('swaggerDto');
      imports.set(specifier, namespace);
    }

    let reference = factory.createPropertyAccessExpression(namespace, type);
    for (let index = 0; index < arrays.length; index++) {
      reference = factory.createArrayLiteralExpression([reference]);
    }
    return reference;
  };

  const transformed = ts.visitEachChild(sourceFile, visit, context);
  if (!imports.size) return transformed;

  const declarations = [...imports].map(([specifier, namespace]) =>
    factory.createImportDeclaration(
      undefined,
      factory.createImportClause(false, undefined, factory.createNamespaceImport(namespace)),
      factory.createStringLiteral(specifier),
    ),
  );
  return factory.updateSourceFile(transformed, [...declarations, ...transformed.statements]);
};
