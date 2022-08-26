import { NodeTypes } from "./ast";

export function baseParse(content: string) {
  const context = createParseContext(content);
  return createRoot(parseChildren(context));
}

function parseChildren(context) {
  const nodes: any = [];
  let node;
  if (context.source.startsWith("{{")) {
    node = parseInterpolation(context);
  }
  nodes.push(node);
  return nodes;
}

function parseInterpolation(context) {
  // {{message}}
  const openDelimiter = "{{";
  const closeDelimiter = "}}";
  const closeIndex = context.source.indexOf("}}", openDelimiter.length);
  // 此处用作推进
  advanceBy(context, openDelimiter.length);
  const rawContentLength = closeIndex - openDelimiter.length;
  const rawContent = context.source.slice(0, rawContentLength);
  //处理边缘case
  const content = rawContent.trim();
  // 此处用作推进
  advanceBy(context, rawContentLength + closeDelimiter.length);
  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
    },
  };
}

function advanceBy(context, length) {
  context.source = context.source.slice(length);
}
function createRoot(children) {
  return {
    children,
  };
}

function createParseContext(content) {
  return {
    source: content,
  };
}
