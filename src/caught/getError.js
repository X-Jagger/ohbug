import {
  UNCAUGHT_ERROR,
  RESOURCE_ERROR,
  GRAMMAR_ERROR,
  PROMISE_ERROR,
  CAUGHT_ERROR,
  REPORT_ERROR,
} from '../constant';
import handleError from '../handle/handleError';

/**
 * getError
 * uncaughtError
 *
 * @param   {String}    type    错误类型 分为一般错误和未catch的promise错误
 * @param   {Object}    e       错误对象
 * @returns {boolean}
 * @private
 */
function getError({ type, e }) {
  try {
    if (type === 'default') {
      const {
        message: msg, filename, lineno: row, colno: col, error,
      } = e;
      if (msg) {
        if (error) {
          // 在 react 内 一般会捕获到语法错误导致的 react-dom 渲染错误
          const message = {
            type: UNCAUGHT_ERROR,
            desc: {
              message: msg,
              filename,
              row,
              col,
              error: (error.stack || error),
            },
          };
          handleError(message);
        }
      } else {
        const immutableTarget = e.target || e.srcElement;
        let target = e.target || e.srcElement;
        if (immutableTarget) {
          // resourceError
          const { outerHTML } = immutableTarget;
          const selector = (function () {
            // 获取出错元素在同级元素的 index
            // 储存错误元素前元素
            const elements = [];
            for (
              let i = 0;
              target
              && target.nodeType === Node.ELEMENT_NODE
              && target.nodeType !== Node.DOCUMENT_TYPE_NODE;
              target = target.previousSibling
            ) {
              i && elements.push(target);
              i += 1;
            }
            return e && e.path.reverse()
              .map(node => (node.localName || '')
                + (node.id ? `#${node.id}` : '')
                + (node.className ? `.${node.className}` : '')
                + (node.outerHTML === outerHTML ? `:nth-child(${elements.length})` : ''))
              .filter(v => v)
              .join(' > ');
          }());
          const message = {
            type: RESOURCE_ERROR,
            desc: {
              outerHTML,
              src: immutableTarget && immutableTarget.src,
              tagName: immutableTarget && immutableTarget.tagName,
              id: immutableTarget && immutableTarget.id,
              className: immutableTarget && immutableTarget.className,
              name: immutableTarget && immutableTarget.name,
              type: immutableTarget && immutableTarget.type,
              selector,
              timeStamp: e.timeStamp,
            },
          };
          handleError(message);
        } else if (typeof e === 'string') {
          const message = {
            type: GRAMMAR_ERROR,
            desc: e,
          };
          handleError(message);
        }
      }
    } else if (type === 'promise') {
      // 捕获没有 catch 的 Promise 错误
      const message = {
        type: PROMISE_ERROR,
        desc: {
          message: e.reason.message || e.reason,
          error: e.reason.stack || e.reason,
        },
      };
      handleError(message);
    }
    return false;
  } catch (err) {
    handleError(err);
  }
}

// 使用装饰器 用于单独捕获错误
const caughtError = (target, name, descriptor) => {
  if (window.$OhbugAuth) {
    if (typeof descriptor.value === 'function') {
      /**
       * 捕获 `class` 内方法错误
       * class Math {
       *    @log  // Decorator
       *    plus(a, b) {
       *      return a + b;
       *    }
       *  }
       */
      return {
        ...descriptor,
        value() {
          try {
            return descriptor.value && descriptor.value.apply(this, arguments);
          } catch (e) {
            // 此处可捕获到方法内的错误 上报错误
            const message = {
              type: CAUGHT_ERROR,
              desc: {
                method: name,
                params: arguments,
                error: e.stack || e,
              },
            };
            handleError(message);
            throw e;
          }
        },
      };
    }
    if (typeof descriptor.initializer === 'function') {
      /**
       * 捕获 `class` 内 `arrow function method` 错误
       * class Math {
       *    @log  // Decorator
       *    plus = (a, b) => {
       *      return a + b;
       *    }
       *  }
       */
      return {
        enumerable: true,
        configurable: true,
        get() {
          // `arrow function method` 由于是箭头函数没有 `arguments` 所以获取不到参数
          // 捕获不到异常 只能靠全局捕获 建议不要使用 `arrow function method`
          return descriptor.initializer && descriptor.initializer.apply(this);
        },
      };
    }
  } else {
    console.error('检测到未执行 Ohbug.init()');
  }
};

// 用于上报自定义错误
const reportError = (error) => {
  if (window.$OhbugAuth) {
    const message = {
      type: REPORT_ERROR,
      desc: error,
    };
    handleError(message);
  } else {
    console.error('检测到未执行 Ohbug.init()');
  }
};

export {
  getError,
  caughtError,
  reportError,
};
