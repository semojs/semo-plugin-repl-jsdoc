import got from 'got'
import cheerio from 'cheerio'
import he from 'he'
import TurndownService from 'turndown'
import { tables } from 'turndown-plugin-gfm'
import marked from 'marked'
import TerminalRenderer from 'marked-terminal'
marked.setOptions({
  renderer: new TerminalRenderer()
})

/**
 * Parse input to keyword and opts
 * @param input 
 * @param Utils 
 */
const getKeywordAndOpts = (input, Utils) => {
  let parseKeyworld = Utils.yParser(input)
  let keyword = parseKeyworld._.join(' ')
  keyword = keyword.replace(/\(.*?\)/, '').toLowerCase().trim()

  let lang = parseKeyworld.lang || Utils.config('$plugin.repl-doc.lang') || Utils.yargs.locale() || 'en-US'
  lang = lang.replace('_', '-')

  const lang_map = {
    pt: 'pt-PT',
    br: 'pt-BR',
    en: 'en-US',
    cn: 'zh-CN',
    tw: 'zh-TW',
  }

  lang = lang_map[lang] ? lang_map[lang] : lang

  let type = parseKeyworld.type || null
  let force = parseKeyworld.force || false
  let help = Boolean(parseKeyworld.help) || Boolean(parseKeyworld.h) || keyword === 'help' || false

  return {
    keyword,
    opts: {
      type,
      lang,
      help,
      force
    }
  }
}

/**
 * Parse html to markdown
 * @param html 
 */
const parseHtml = async (html) => {
  const $ = cheerio.load(html)

  // For zh-CN
  $('#wikiArticle h2#浏览器兼容性').remove()
  $('#wikiArticle h2#规范').remove()

  // For en-US & ru
  $('#wikiArticle h2#Browser_compatibility').remove()
  $('#wikiArticle h2#Specifications').remove()

  // For fr
  $('#wikiArticle h2#Spécifications').remove()
  $('#wikiArticle h2#Compatibilité_des_navigateurs').remove()

  // For pt and br
  $('#wikiArticle h2#Especificações').remove()
  $('#wikiArticle h2#Compatibilidade_de_navegadores').remove()
  $('#wikiArticle h2#Compatibilidade_de_Navegador').remove()
  
  // For ca
  $('#wikiArticle h2#Especificacions').remove()
  $('#wikiArticle h2#Compatibilitat_amb_navegadors').remove()

  // For de
  $('#wikiArticle h2#Spezifikationen').remove()
  $('#wikiArticle h2#Browserkompatibilität').remove()

  // For uk
  $('#wikiArticle h2#Специфікації').remove()
  $('#wikiArticle h2#Сумісність_з_веб-переглядачами').remove()

  // For es
  $('#wikiArticle h2#Especificaciones').remove()
  $('#wikiArticle h2#Compatibilidad_en_Navegadores').remove()

  // For ko
  $('#wikiArticle h2#명세').remove()
  $('#wikiArticle h2#브라우저_호환성').remove()
  
  $('#wikiArticle .blockIndicator').remove()
  $('#wikiArticle .htab').remove()
  $('#wikiArticle #compat-desktop').remove()
  $('#wikiArticle #compat-mobile').remove()
  $('#wikiArticle .bc-data').remove()
  $('#wikiArticle .standard-table').remove()
  $('#wikiArticle iframe').remove()
  $('#wikiArticle .hidden').remove()
  $('#wikiArticle table').remove()

  let parsed = $('#wikiArticle').html()

  if (!parsed) {
    parsed = $('.search-results .result a.result-title')
    parsed = '<ul>' + `${parsed}`.replace(/(<a.*?>.*?<\/a>)/g, '<li>$1</li>\n') + '</ul>'
  }

  // const parsed = $('#wikiArticle p').first().html()
  let decoded = he.decode(parsed)

  const turndownService = new TurndownService()
  turndownService.use(tables)
  let converted = turndownService.turndown(decoded)

  if (converted) {
    converted = converted.replace(/\]\(\//g, '](https://developer.mozilla.org/')
  }

  return converted
}

/**
 * Get url to parse
 * @param keyword 
 * @param opts 
 * @param Utils 
 */
const getUrl = async (keyword, opts: any = {}, Utils) => {
  let lang = opts.lang

  if (lang === 'zh-CN') {
    const cnOperatorMappings = {
      '比较操作符': 'comparison_operators',
      '逗号操作符': 'comma_operator',
      '赋值运算符': 'assignment_operators',
      '条件运算符': 'conditional_operator',
      '逻辑运算符': 'logical_operators',
      '按位操作符': 'bitwise_operators',
      '算术运算符': 'arithmetic_operators',
      '展开语法': 'spread_syntax',
      '属性访问器': 'property_accessors',
      '对象初始化': 'object_initializer',
      '圆括号运算符': 'grouping',
      '解构赋值': 'destructuring_assignment',
    }

    const matched = Object.keys(cnOperatorMappings).filter((key) => {
      return key.indexOf(keyword) > -1
    })

    if (matched.length > 0) {
      opts.type = 'operator'

      if (matched.length > 1) {
        const answers: any = await Utils.inquirer.prompt([
          {
            type: 'list',
            name: 'selected',
            message: `Please choose a matched keyword:`,
            choices: matched.map((key) => {
              return {
                key: cnOperatorMappings[key],
                value: key
              }
            })
          }
        ])
  
        keyword = cnOperatorMappings[answers.selected]
      } else {
        keyword = cnOperatorMappings[matched[0]]
      }
    }
  }

  const topic = keyword.replace('.', '/').replace(' ', '_')
  const topic_prefix = topic.split('/')[0]

  const categories = [
    'global_objects', 'global objects',
    'operators', 
    'statements',
    'data_structures', 'data structures',
    'strict_mode', 'strict mode',
    'lexical_grammar', 'lexical grammar'
  ]

  const statements = [
    'block', 'break', 'continue', 'empty', 'if...else', 'switch', 'throw', 'try...catch',
    'var', 'let', 'const',
    'function', 'function*', 'async function', 'return', 'class',
    'do...while', 'for', 'for each...in', 'for...in', 'for...of', 'for await...of', 'while',
    'debugger', 'import', 'label', 'with'
  ]

  const operators = [
    'this', 'function', 'function*', 'class', 'yield', 'yeild*', 'async function', 'await',
    'new', 'new.target', 'super',
    'delete', 'void', 'typeof',
    'in', 'instanceof',
    ''
  ]

  const functions = [
    'arguments',
    'rest_parameters', 'rest parameters',
    'default_parameters', 'default parameters',
    'arrow_functions', 'arrow functions'
  ]


  const global_objects = [
    'infinity', 'nan', 'undefined', 'globalthis',
    'eval', 'isfinite', 'isnan', 'parsefloat', 'parseint', 'decodeuri', 'decodeuricomponent', 'encodeuri', 'encodeuricomponent',
    'object', 'function', 'boolean', 'symbol',
    'error', 'aggregateerror', 'evalerror', 'internalerror', 'rangeerror', 'referenceerror', 'syntaxerror', 'typeerror', 'urierror', 
    'number', 'bigint', 'math', 'date', 
    'string', 'regexp',
    'array', 'int8array', 'uint8array', 'uint8clampedarray', 'int16array', 'uint16array', 'int32array', 'uint32array', 'float32array', 'float64array', 'bigint64array', 'biguint64array', 
    'map', 'set', 'weakmap', 'weakset',
    'arraybuffer', 'sharedarraybuffer', 'atomics', 'dataview', 'json', 
    'promise', 'generator', 'generatorfunction', 'asyncfunction',
    'reflect', 'proxy',
    'intl', 
    'webassembly',
  ]
  
  let url
  if (opts.type) {
    switch (opts.type) {
      case 'category':
        url = `https://developer.mozilla.org/${lang}/docs/Web/JavaScript/Reference/${topic}`
        break
      case 'function':
        url = `https://developer.mozilla.org/${lang}/docs/Web/JavaScript/Reference/Functions/${topic}`
        break
      case 'statement':
        url = `https://developer.mozilla.org/${lang}/docs/Web/JavaScript/Reference/Statements/${topic}`
        break
      case 'operator':
        url = `https://developer.mozilla.org/${lang}/docs/Web/JavaScript/Reference/Operators/${topic}`
        break
      case 'global_object':
        url = `https://developer.mozilla.org/${lang}/docs/Web/JavaScript/Reference/Global_Objects/${topic}`
        break
      case 'search':
        url = `https://developer.mozilla.org/${lang}/search?q=${keyword}`
        break
    }
  } else {
    if (categories.includes(keyword)) {
      url = `https://developer.mozilla.org/${lang}/docs/Web/JavaScript/Reference/${topic}`
    } else if (functions.includes(keyword)) {
      url = `https://developer.mozilla.org/${lang}/docs/Web/JavaScript/Reference/Functions/${topic}`
    } else if (statements.includes(keyword)) {
      url = `https://developer.mozilla.org/${lang}/docs/Web/JavaScript/Reference/Statements/${topic}`
    } else if (operators.includes(keyword)) {
      url = `https://developer.mozilla.org/${lang}/docs/Web/JavaScript/Reference/Operators/${topic}`
    } else if (global_objects.includes(topic_prefix)) {
      url = `https://developer.mozilla.org/${lang}/docs/Web/JavaScript/Reference/Global_Objects/${topic}`
    } else {
      url = `https://developer.mozilla.org/${lang}/search?q=${keyword}`
    }
  }

  Utils.debug('semo-plugin-repl-doc')(url)
  return url
}

/**
 * Get html by sending get request
 * @param url 
 */
const getHtml = async (url) => {
  try {
    const response = await got.get(url)
    let html = response.body

    return html
  } catch (e) {
    console.log(e.message)
    return null
  }
}

/**
 * Implement Semo hooks
 */
// @ts-ignore
export = (Utils) => {
  return {
    hook_repl_command: new Utils.Hook('semo', () => {
      return {
        jsdoc: {
          help: 'Get Javascript docs by keyword.',
          async action(input) {
            if (!input) {
              Utils.warn('keyword is required')
            } else {
              // @ts-ignore
              this.clearBufferedCommand();
              console.log() // add blank line

              
              let { keyword, opts } = getKeywordAndOpts(input, Utils)
              const cacheKey = keyword + ':' + Utils.md5(JSON.stringify(opts))
              const cache = Utils.getCache('repl-cache')
              
              let cached = cache.get(cacheKey)
              if (!opts.force && cached) {
                Utils.consoleReader(marked(cached), {
                  plugin: 'semo-plugin-repl-doc',
                  identifier: input
                })
                Utils.debug('semo-plugin-repl-doc')('Cache hits')
                // @ts-ignore
                this.displayPrompt();
                return
              }


              if (opts.help) {
                const helpInfo = `## Examples
    .doc string.trim
    .doc string.trim --lang=en_US   
    .doc string.trim --type=global_object
    .doc string.trim --force      

## Tips

* Supported type: statement, category, function, operator, global_object, search.
* Supported lang: standard language codes, e.g. en_US, zh_CN...
* If --lang exists but no translation, it will fallover to en_US.
* If --type exists, it will get info from that type, if not, it will try to guess your purpose.
* If --force exists, it will ignore cache in memory.
* For getting this help, you can use --help, -h, or just input .doc help.
`
                console.log(marked(helpInfo))

                // @ts-ignore
                this.displayPrompt();
                return 
              }

              const url = await getUrl(keyword, opts, Utils)
              const html = await getHtml(url)
              if (html) {
                let parsed = await parseHtml(html)
                cache.set(cacheKey, parsed, 3600)
                Utils.consoleReader(marked(parsed), {
                  plugin: 'semo-plugin-repl-doc',
                  identifier: input
                })
              }
            }
            
            // @ts-ignore
            this.displayPrompt();
          }
        }
      }
    })
  }
}