import { NodeTypes } from "./ast";
const enum TagType {
  Start,
  End,
}
export function baseParse(content: string) {
  const context = createParseContext(content);
  return createRoot(parseChildren(context));
}

function parseChildren(context) {
  const nodes: any = [];
  let node;
  const s = context.source;
  if (s.startsWith("{{")) {
    node = parseInterpolation(context);
  } else if (s[0] === "<") {
    if (/[a-z]/i.test(s[1])) {
      node = parseElement(context);
    }
  } else {
    node = parseText(context);
  }
  nodes.push(node);
  return nodes;
}

function parseText(context: any) {
  const content = parseTextData(context, context.source.length);
  console.log(context);

  return {
    type: NodeTypes.TEXT,
    content,
  };
}

function parseTextData(context: any, length) {
  const content = context.source.slice(0, length);
  //推进
  advanceBy(context, content.length);
  return content;
}
function parseElement(context) {
  const element = parseTag(context, TagType.Start);
  parseTag(context, TagType.End);
  console.log(context);

  return element;
}

function parseTag(context, type: TagType) {
  // 1,解析div
  const match: any = /^<\/?([a-z]*)/i.exec(context.source);
  const tag = match[1];
  // 2.推进删除
  advanceBy(context, match[0].length);
  advanceBy(context, 1);
  // ?? 类型是结束标签 return
  if (type === TagType.End) return;
  return {
    type: NodeTypes.ELEMENT,
    tag,
  };
}

function parseInterpolation(context) {
  // {{message}}
  const openDelimiter = "{{";
  const closeDelimiter = "}}";

  const closeIndex = context.source.indexOf("}}", openDelimiter.length);
  // 此处用作推进
  advanceBy(context, openDelimiter.length);
  const rawContentLength = closeIndex - openDelimiter.length;
  const rawContent = parseTextData(context, rawContentLength);
  //处理边缘case
  const content = rawContent.trim();
  // 此处用作推进
  advanceBy(context, closeDelimiter.length);
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
