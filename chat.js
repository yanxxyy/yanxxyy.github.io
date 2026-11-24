(() => {
  const launcher = document.querySelector('#chat-launcher')
  const panel = document.querySelector('#chat-panel')
  const close = document.querySelector('#chat-close')
  const messages = document.querySelector('#chat-messages')
  const form = document.querySelector('#chat-form')
  const input = document.querySelector('#chat-input')
  const send = document.querySelector('#chat-send')
  const mode = document.querySelector('#chat-mode')
  const suggestions = [...document.querySelectorAll('[data-chat-question]')]
  if (!launcher || !panel || !close || !messages || !form || !input || !send) return

  const configuredUrl = document.querySelector('meta[name="resume-agent-api"]')?.content.trim() || ''
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname)
  const apiBase = (configuredUrl || (isLocal ? 'http://127.0.0.1:8000' : '')).replace(/\/$/, '')
  if (mode) mode.textContent = apiBase ? 'DeepSeek · 简历知识检索' : '简历检索预览 · DeepSeek 待接入'
  const previousQuestions = []
  let pending = false
  const localDocuments = buildLocalDocuments()

  function plainText(element) {
    return (element?.textContent || '').replace(/\s+/g, ' ').trim()
  }

  function buildLocalDocuments() {
    const documents = []
    const add = (title, searchText, answerText, section, anchor, sectionId) => {
      if (answerText) documents.push({ title, searchText, answerText, section, sectionId, url: `${location.origin}${location.pathname}${anchor}` })
    }
    add('个人简介', plainText(document.querySelector('.hero-main')), plainText(document.querySelector('.hero-main')), '首页', '', 'home')
    add('联系方式', plainText(document.querySelector('.contact-card')), plainText(document.querySelector('.contact-card')), '首页', '', 'home')
    for (const id of ['experience', 'projects', 'research', 'figures', 'education', 'skills']) {
      const section = document.querySelector(`#${id}`)
      const sectionName = plainText(section?.querySelector('h2'))
      if (!section) continue
      if (id === 'experience' || id === 'projects') {
        for (const article of section.querySelectorAll('article')) {
          const title = plainText(article.querySelector('.project-intro h4')) || plainText(article.querySelector('h3'))
          const context = [plainText(article.querySelector('.entry-top')), plainText(article.querySelector('.project-intro h4')), plainText(article.querySelector('.project-intro p')), plainText(article.querySelector('.stack'))].join(' ')
          add(`${title} · 项目与技术`, context, context, sectionName, `#${id}`, id)
          for (const detail of article.querySelectorAll('.detail-list > div')) {
            const label = plainText(detail.querySelector('dt'))
            const body = plainText(detail.querySelector('dd'))
            add(`${title} · ${label}`, `${context} ${label} ${body}`, body, sectionName, `#${id}`, id)
          }
          const metrics = plainText(article.querySelector('.metric-row'))
          if (metrics) add(`${title} · 效果评估`, `${context} ${metrics}`, metrics, sectionName, `#${id}`, id)
        }
      } else if (id === 'research') {
        for (const article of section.querySelectorAll('article')) {
          const title = plainText(article.querySelector('h3'))
          const joined = selector => [...article.querySelectorAll(selector)].map(plainText).join(' · ')
          const method = [title, plainText(article.querySelector('.research-summary')), joined('.research-focus span')].join(' · ')
          const publication = [title, plainText(article.querySelector('.paper-title')), joined('.research-badges span'), joined('.research-venue > *'), joined('.research-rank span')].join(' · ')
          add(`${title} · 研究方法`, method, method, sectionName, `#${id}`, id)
          add(`${title} · 发表信息`, publication, publication, sectionName, `#${id}`, id)
        }
      } else if (id === 'figures') {
        for (const figure of section.querySelectorAll('.paper-figure')) {
          const caption = figure.querySelector('figcaption')
          add(plainText(caption?.querySelector('h4')), plainText(caption), plainText(caption), sectionName, `#${id}`, id)
        }
      } else {
        for (const article of section.querySelectorAll('article')) {
          add(plainText(article.querySelector('h3')) || sectionName, plainText(article), plainText(article), sectionName, `#${id}`, id)
        }
      }
    }
    return documents
  }

  function searchTerms(value) {
    const terms = []
    for (const word of value.toLowerCase().match(/[\u4e00-\u9fff]+|[a-z0-9]+/g) || []) {
      if (/^[\u4e00-\u9fff]/.test(word)) {
        if (word.length <= 6) terms.push(word)
        for (let index = 0; index < word.length - 1; index++) terms.push(word.slice(index, index + 2))
        for (let index = 0; index < word.length - 2; index++) terms.push(word.slice(index, index + 3))
      } else terms.push(word)
    }
    return terms
  }

  function answerFromResume(question, history) {
    const hints = { 国奖: '国家奖学金', 研究生: '硕士 华北理工大学', 本科: '重庆财经学院', 你是谁: '闫星阳 Agent 算法 研发 工程师', 自我介绍: '闫星阳 Agent 算法 研发 工程师', 联系: '电话 邮箱 联系方式' }
    const isFollowUp = /^(这个|那个|它|上述|刚才|还有|具体)/.test(question)
    const query = isFollowUp ? `${history.slice(-1).join(' ')} ${question}` : question
    const expanded = `${query} ${Object.entries(hints).filter(([trigger]) => query.includes(trigger)).map(([, hint]) => hint).join(' ')}`
    const stop = new Set(['什么', '哪些', '怎么', '如何', '一下', '介绍', '这个', '那个', '可以', '是否'])
    const terms = [...new Set(searchTerms(expanded).filter(term => !stop.has(term)))]
    const sectionId = /lumi|实习|工作流|素材生成/i.test(query) ? 'experience'
      : /论文|期刊|发表|低照度|pattern recognition|kl.divergence/i.test(query) ? 'research'
      : /论文图|网络结构|效果对比|频域约束/i.test(query) ? 'figures'
      : /教育|学校|硕士|本科|大学|gpa|奖学金|国奖/i.test(query) ? 'education'
      : /技能|掌握|熟悉|rag|上下文工程|后端开发/i.test(query) ? 'skills'
      : /湖仓|物流|快递|etl|客服|grpo|证据/i.test(query) ? 'projects'
      : /联系|电话|邮箱|你是谁|自我介绍/i.test(query) ? 'home' : ''
    const candidates = sectionId ? localDocuments.filter(document => document.sectionId === sectionId) : localDocuments
    const indexed = candidates.map(document => new Set(searchTerms(`${document.title} ${document.searchText}`)))
    const frequency = new Map()
    for (const tokens of indexed) for (const term of tokens) frequency.set(term, (frequency.get(term) || 0) + 1)
    const results = candidates.map((document, index) => {
      let score = terms.reduce((sum, term) => sum + (indexed[index].has(term) ? Math.log(1 + (candidates.length + 1) / (frequency.get(term) || 1)) : 0), 0)
      if (/负责|做了什么|工作内容/.test(query) && sectionId === 'experience') {
        if (document.title.includes('业务背景')) score += 3
        if (document.title.includes('编排与状态')) score += 2
      }
      if (/技术栈|用了什么技术/.test(query) && document.title.includes('项目与技术')) score += 3
      if (sectionId === 'research') {
        if (/核心|内容|方法|研究/.test(query) && document.title.includes('研究方法')) score += 3
        if (/发表|期刊|哪里|一作/.test(query) && document.title.includes('发表信息')) score += 3
      }
      return { document, score }
    }).filter(item => item.score > 0).sort((left, right) => right.score - left.score).slice(0, 2)
    if (!results.length) return { answer: '简历中没有提供这项信息。你可以问我实习、项目、论文、教育或专业技能。', sources: [] }
    const answer = `我从公开简历中找到这些相关内容：\n\n${results.map(({ document }) => `${document.title}：${document.answerText.slice(0, 300)}${document.answerText.length > 300 ? '…' : ''}`).join('\n\n')}`
    const sources = [...new Map(results.map(({ document }) => [document.url, { title: document.section, url: document.url }])).values()]
    return { answer, sources }
  }

  function addMessage(text, variant = 'assistant') {
    const row = document.createElement('div')
    row.className = `chat-message-row chat-message-row--${variant === 'user' ? 'user' : 'assistant'}`
    if (variant !== 'user') {
      const avatar = document.createElement('span')
      avatar.className = 'chat-avatar chat-avatar--message'
      avatar.setAttribute('aria-hidden', 'true')
      const image = document.createElement('img')
      image.src = './assets/milk-frog.png'
      image.alt = ''
      image.width = 32
      image.height = 32
      avatar.append(image)
      row.append(avatar)
    }
    const message = document.createElement('p')
    message.className = `chat-message chat-message--${variant}`
    message.textContent = text
    row.append(message)
    messages.append(row)
    messages.scrollTop = messages.scrollHeight
    return message
  }

  function addSources(sources) {
    const valid = sources.filter(source => {
      try { return [location.origin, 'https://yanxxyy.github.io'].includes(new URL(source.url).origin) }
      catch { return false }
    })
    if (!valid.length) return
    const row = document.createElement('div')
    row.className = 'chat-sources'
    for (const source of valid) {
      const link = document.createElement('a')
      link.href = source.url
      link.textContent = `查看${source.title}`
      link.addEventListener('click', () => hidePanel())
      row.append(link)
    }
    messages.append(row)
    messages.scrollTop = messages.scrollHeight
  }

  function hidePanel() {
    panel.hidden = true
    launcher.setAttribute('aria-expanded', 'false')
    launcher.focus()
  }

  function showPanel() {
    panel.hidden = false
    launcher.setAttribute('aria-expanded', 'true')
    input.focus()
  }

  async function sendQuestion(value) {
    const question = value.trim()
    if (!question || pending) return
    const history = previousQuestions.slice(-3)
    previousQuestions.push(question)
    input.value = ''
    addMessage(question, 'user')
    const reply = addMessage('正在查找简历内容…')
    pending = true
    send.disabled = true
    suggestions.forEach(button => { button.disabled = true })
    const controller = apiBase ? new AbortController() : null
    const timeout = controller ? setTimeout(() => controller.abort(), 40000) : null
    try {
      let data
      if (apiBase) {
        const response = await fetch(`${apiBase}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, history }),
          signal: controller.signal,
        })
        data = await response.json()
        if (!response.ok) throw new Error(data.message || '咨询服务暂时不可用，请稍后再试')
      } else data = answerFromResume(question, history)
      reply.textContent = data.answer
      addSources(Array.isArray(data.sources) ? data.sources : [])
    } catch (error) {
      const preview = answerFromResume(question, history)
      reply.textContent = `${error.name === 'AbortError' ? 'DeepSeek 响应超时' : 'DeepSeek 暂时不可用'}，先展示简历检索结果：\n\n${preview.answer}`
      addSources(preview.sources)
      if (mode) mode.textContent = '简历检索预览 · DeepSeek 暂不可用'
    } finally {
      if (timeout) clearTimeout(timeout)
      pending = false
      send.disabled = false
      suggestions.forEach(button => { button.disabled = false })
      messages.scrollTop = messages.scrollHeight
      input.focus()
    }
  }

  launcher.addEventListener('click', () => panel.hidden ? showPanel() : hidePanel())
  close.addEventListener('click', hidePanel)
  panel.addEventListener('keydown', event => { if (event.key === 'Escape') hidePanel() })
  form.addEventListener('submit', event => { event.preventDefault(); sendQuestion(input.value) })
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendQuestion(input.value)
    }
  })
  suggestions.forEach(button => button.addEventListener('click', () => sendQuestion(button.dataset.chatQuestion || '')))
})()
