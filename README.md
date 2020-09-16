# semo-plugin-repl-jsdoc

A Semo plugin to provide ability to get js doc in REPL

## Installation & Usage

```
npm i -g @semo/cli semo-plugin-repl-jsdoc
semo r
>>> .jsdoc help
>>> .jsdoc string.trim
>>> .jsdoc string.trim --lang=en_US
>>> .jsdoc string.trim --lang=zh_CN
>>> .jsdoc string.trim --type=global_object
>>> .jsdoc 运算符
```

## Tips

* Support standard language code, and have some short style, like en stands for en_US, cn stands for zh_CN.
* Support global_objects, functions, statements, operators from https://developer.mozilla.org

## Bugs

Mostly this plugin is built on parsing the structure of MDN, so it's very likely i missed something or MDN changed later, if it has issues, please let me know.

## Licence

MIT
