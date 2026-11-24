(() => {
  const launcher = document.querySelector('#chat-launcher')
  const panel = document.querySelector('#chat-panel')
  const close = document.querySelector('#chat-close')
  const messages = document.querySelector('#chat-messages')
  const form = document.querySelector('#chat-form')
  const input = document.querySelector('#chat-input')
  const send = document.querySelector('#chat-send')
  const suggestions = [...document.querySelectorAll('[data-chat-question]')]
  if (!launcher || !panel || !close || !messages || !form || !input || !send) return

  const configuredUrl = document.querySelector('meta[name="resume-agent-api"]')?.content.trim() || ''
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname)
  const apiBase = (configuredUrl || (isLocal ? 'http://127.0.0.1:8000' : '')).replace(/\/$/, '')
  if (!apiBase) {
    launcher.hidden = true
    return
  }
  const previousQuestions = []
  let pending = false

  function addMessage(text, variant = 'assistant') {
    const message = document.createElement('p')
    message.className = `chat-message chat-message--${variant}`
    message.textContent = text
    messages.append(message)
    messages.scrollTop = messages.scrollHeight
    return message
  }

  function addSources(sources) {
    const valid = sources.filter(source => {
      try { return new URL(source.url).origin === 'https://yanxxyy.github.io' }
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
    if (!apiBase) {
      addMessage('咨询服务正在接入服务器，暂时无法提问。', 'error')
      return
    }
    const history = previousQuestions.slice(-3)
    previousQuestions.push(question)
    input.value = ''
    addMessage(question, 'user')
    const reply = addMessage('正在检索简历并组织回答…')
    pending = true
    send.disabled = true
    suggestions.forEach(button => { button.disabled = true })
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 40000)
    try {
      const response = await fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history }),
        signal: controller.signal,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || '咨询服务暂时不可用，请稍后再试')
      reply.textContent = data.answer
      addSources(Array.isArray(data.sources) ? data.sources : [])
    } catch (error) {
      previousQuestions.pop()
      reply.classList.add('chat-message--error')
      reply.textContent = error.name === 'AbortError' ? '响应超时，请稍后重试。' : (error.message || '咨询服务暂时不可用，请稍后再试。')
    } finally {
      clearTimeout(timeout)
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
