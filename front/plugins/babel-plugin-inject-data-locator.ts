import type {NodePath} from "@babel/traverse";
import type * as BabelTypes from "@babel/types";
import type {RawSourceMap} from "source-map-js";

import {SourceMapConsumer} from "source-map-js";

interface BabelFile {
  opts: {
    filename?: string;
    [key: string]: unknown;
  };
}

interface BabelState {
  file: BabelFile;
  [key: string]: unknown;
}

type ErrorWithMessage = Error & {
  message: string;
};

interface CustomPluginOptions {
  inputSourceMap?: RawSourceMap | string;
  types: typeof BabelTypes;
}

const createPluginLogic = (babel: {types: typeof BabelTypes}, options: CustomPluginOptions) => {
  const t = babel.types;
  const consumerHolder: {consumer?: SourceMapConsumer} = {};

  return {
    name: "inject-data-locator-original-source",
    post() {
      consumerHolder.consumer = undefined;
    },
    pre(file: BabelFile) {
      if (options.inputSourceMap) {
        try {
          let rawMap: RawSourceMap;

          if (typeof options.inputSourceMap === "string") {
            rawMap = JSON.parse(options.inputSourceMap) as RawSourceMap;
          } else {
            rawMap = options.inputSourceMap;
          }
          consumerHolder.consumer = new SourceMapConsumer(rawMap);
        } catch (errCaught: unknown) {
          const error = errCaught as ErrorWithMessage;

          console.warn(
            `[inject-data-locator-original-source] Failed to initialize SourceMapConsumer for ${file.opts.filename}:`,
            error.message,
          );
          consumerHolder.consumer = undefined;
        }
      } else {
        consumerHolder.consumer = undefined;
      }
    },
    visitor: {
      JSXElement(path: NodePath<BabelTypes.JSXElement>, state: BabelState) {
        const currentConsumer = consumerHolder.consumer;
        const openingElement = path.node.openingElement;
        const attributes = openingElement.attributes;
        const filename = state.file.opts.filename || "unknown";

        let filePath = filename;
        const srcIndex = filename.lastIndexOf("/src/");

        if (srcIndex !== -1) {
          filePath = filename.substring(srcIndex + 1);
        } else {
          filePath = filename.split("/").pop() || filename;
        }

        if (t.isJSXIdentifier(openingElement.name) && openingElement.name.name === "Fragment") {
          return;
        }

        const hasDataLocator = attributes.some(
          (attr) => t.isJSXAttribute(attr) && attr.name.name === "data-locator",
        );

        if (!hasDataLocator && path.node.loc) {
          let elementName = "Unknown";

          if (t.isJSXIdentifier(openingElement.name)) {
            elementName = openingElement.name.name;
          } else if (t.isJSXMemberExpression(openingElement.name)) {
            elementName = openingElement.name.property.name;
          }

          const {start} = path.node.loc;
          let finalLine = start.line;
          let finalColumn = start.column;
          let mapped = false;

          if (currentConsumer) {
            try {
              const originalPosition = currentConsumer.originalPositionFor({
                column: start.column,
                line: start.line,
              });

              if (
                originalPosition &&
                originalPosition.line != null &&
                originalPosition.column != null
              ) {
                finalLine = originalPosition.line;
                finalColumn = originalPosition.column;
                mapped = true;
              }
            } catch (errCaught: unknown) {
              const error = errCaught as ErrorWithMessage;

              console.warn(
                `[inject-data-locator-original-source] Error during source map lookup for ${elementName} in ${filename}:L${start.line}:C${start.column}`,
                error.message,
              );
            }
          }

          const locatorValue = `${filePath}:${elementName}:${finalLine}:${finalColumn}`;
          const dataLocatorAttr = t.jsxAttribute(
            t.jsxIdentifier("data-locator"),
            t.stringLiteral(locatorValue),
          );

          openingElement.attributes.push(dataLocatorAttr);

          console.log(
            `[inject-data-locator-original-source] Added data-locator (${mapped ? "original" : "generated"}): ${locatorValue} to ${elementName} in ${filename}${mapped ? ` (gen L${start.line}:C${start.column})` : `(L${start.line}:C${start.column})`}`,
          );
        }
      },
    },
  };
};

export default function (
  babelAPI: {types: typeof BabelTypes; assertVersion: (version: number) => void},
  options: CustomPluginOptions,
) {
  babelAPI.assertVersion(7);

  return createPluginLogic(babelAPI, options);
}
