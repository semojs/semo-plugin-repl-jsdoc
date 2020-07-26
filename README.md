# semo-plugin-repl-doc

A Semo plugin to provide ability to get js doc in REPL

## Installation & Usage

```
npm i -g @semo/cli semo-plugin-repl-doc
semo r
>>> .doc help
>>> .doc string.trim
>>> .doc string.trim --lang=en_US
>>> .doc string.trim --lang=zh_CN
>>> .doc string.trim --type=global_object
>>> .doc 运算符
```

## Tips

* Support standard language code, and have some short style, like en stands for en_US, cn stands for zh_CN.
* Support global_objects, functions, statements, operators from https://developer.mozilla.org

## Bugs

Mostly this plugin is built on parsing the structure of MDN, so it's very likely i missed something or MDN changed later, if it has issues, please let me know.

## License

MIT
