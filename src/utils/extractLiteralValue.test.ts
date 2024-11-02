import ts, { factory } from 'typescript';
import { extractLiteralValue } from './extractLiteralValue';

describe('extractLiteralValue', () => {
  it('should extract string literal value', () => {
    const source = factory.createStringLiteral('hello');
    expect(extractLiteralValue(source)).toBe('hello');
  });

  it('should extract numeric literal value', () => {
    const source = factory.createNumericLiteral('42');
    expect(extractLiteralValue(source)).toBe('42');
  });

  it('should extract negative numeric literal value', () => {
    const source = factory.createPrefixUnaryExpression(
      ts.SyntaxKind.MinusToken,
      factory.createNumericLiteral('42')
    );
    expect(extractLiteralValue(source)).toBe('-42');
  });

  it('should extract true literal value', () => {
    const source = factory.createTrue();
    expect(extractLiteralValue(source)).toBe('true');
  });

  it('should extract false literal value', () => {
    const source = factory.createFalse();
    expect(extractLiteralValue(source)).toBe('false');
  });

  it('should return empty string for unknown literal value', () => {
    const source = factory.createNull();
    expect(extractLiteralValue(source)).toBe('');
  });
});
