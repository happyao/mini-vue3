import { NodeTypes } from "./ast";
const enum TagType {
  Start,
  End,
}
export function baseParse(content: string) {
  const context = createParseContext(content);
  return createRoot(parseChildren(context, []));
}

function parseChildren(context, ancestors) {
  const nodes: any = [];
  //Important !! 循环
  while (!isEnd(context, ancestors)) {
    let node;
    const s = context.source;
    if (s.startsWith("{{")) {
      node = parseInterpolation(context);
    } else if (s[0] === "<") {
      if (/[a-z]/i.test(s[1])) {
        node = parseElement(context, ancestors);
      }
    } else {
      node = parseText(context);
    }
    nodes.push(node);
  }

  return nodes;
}

function isEnd(context, ancestors) {
  const s = context.source;
  // 2.遇到结束标签 </
  // 从栈顶开始循环 优化
  for (let i = ancestors.length - 1; i >= 0; i--) {
    let tag = ancestors[i].tag;
    //解决死循环
    if (startWithEndOpen(s, tag)) {
      return true;
    }
  }
  // 1.source有值
  return !s;
}

function parseText(context: any) {
  //遇到openDelimiter 应该停止
  // 遇到 </ 也应该停下
  let endIndex = context.source.length;
  let endTokens = ["{{", "<"];
  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i]);
    //离最近的终止位置停下来
    if (index !== -1 && endIndex > index) {
      endIndex = index;
    }
  }

  const content = parseTextData(context, endIndex);
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
function parseElement(context, ancestors) {
  const element: any = parseTag(context, TagType.Start);
  //Important!! 栈方法 判断结束while点位
  //收集
  ancestors.push(element);
  element.children = parseChildren(context, ancestors);
  //弹出
  ancestors.pop();
  // 匹配上再消费结束标签
  if (startWithEndOpen(context.source, element.tag)) {
    parseTag(context, TagType.End);
  } else {
    throw new Error(`缺少结束标签:${element.tag}`);
  }

  return element;
}

function startWithEndOpen(source, tag) {
  return (
    source.startsWith("</") &&
    source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase()
  );
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
    type:NodeTypes.ROOT
  };
}

function createParseContext(content) {
  return {
    source: content,
  };
}
