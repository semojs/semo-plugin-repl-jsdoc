import got from 'got'
import cheerio from 'cheerio'
import he from 'he'
import TurndownService from 'turndown'
import { tables } from 'turndown-plugin-gfm'
import marked from 'marked'
import TerminalRenderer from 'marked-terminal'

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

  const parsed = $('#wikiArticle').html()
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

const getUrl = (keyword, opts, Utils) => {

  keyword = keyword.toLowerCase()

  let lang = opts.lang || Utils.config('$plugin.repl-doc.lang') || Utils.yargs.locale() || 'en-US'
  lang = lang.replace('_', '-')

  const lang_map = {
    pt: 'pt-PT',
    br: 'pt-BR',
    en: 'en-US',
    cn: 'zh-CN',
    tw: 'zh-TW',
  }

  lang = lang_map[lang] ? lang_map[lang] : lang

  const topic = keyword.replace('.', '/').replace(' ', '_')

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
    'this', 'yield', 'yeild*', 'await',
    'new', 'new.target', 'super',
    'delte', 'void', 'typeof',
    'in', 'instanceof',
    ''
  ]

  const functions = [
    'arguments',
    'rest_parameters', 'rest parameters',
    'default_parameters', 'default parameters',
    'arrow_functions', 'arrow functions'
  ]

  let url
  if (categories.includes(keyword)) {
    url = `https://developer.mozilla.org/${lang}/docs/Web/JavaScript/Reference/${topic}`
  } else if (functions.includes(keyword)) {
    url = `https://developer.mozilla.org/${lang}/docs/Web/JavaScript/Reference/Functions/${topic}`
  } else if (statements.includes(keyword)) {
    url = `https://developer.mozilla.org/${lang}/docs/Web/JavaScript/Reference/Statements/${topic}`
  } else if (operators.includes(keyword)) {
    url = `https://developer.mozilla.org/${lang}/docs/Web/JavaScript/Reference/Operators/${topic}`
  } else {
    url = `https://developer.mozilla.org/${lang}/docs/Web/JavaScript/Reference/Global_Objects/${topic}`
  }


  Utils.debug('semo-plugin-repl-doc')(url)
  return url
}

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


export = (Utils) => {
  return {
    hook_repl_command: new Utils.Hook('semo', () => {
      return {
        doc: {
          help: 'Get Javascript docs by keyword.',
          async action(keyword) {
            if (!keyword) {
              Utils.warn('keyword is required')
            } else {
              // TODO: Add cache for repeat query
              
              // @ts-ignore
              this.clearBufferedCommand();
              console.log() // add blank line

              let parseKeyworld = Utils.yParser(keyword)
              keyword = parseKeyworld._.join(' ')


              if (parseKeyworld.help || parseKeyworld.h || keyword === 'help') {
                Utils.info('.doc help: This help')
                Utils.info('.doc string.trim: Get info about Javascript object and method')
                Utils.info('.doc string.trim --lang=en_US: Set prefered lang')

                // @ts-ignore
                this.displayPrompt();
                return 
              }

              const url = getUrl(keyword, parseKeyworld, Utils)
              const html = await getHtml(url)
              if (html) {
                let parsed = await parseHtml(html)

                marked.setOptions({
                  renderer: new TerminalRenderer()
                })

                console.log(marked(parsed))
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