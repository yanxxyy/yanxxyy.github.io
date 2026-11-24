(() => {
  const sections = [...document.querySelectorAll('.resume-section')]
  const slides = [...document.querySelectorAll('.hero, .resume-section')]
  const header = document.querySelector('.site-header')
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  if (!slides.length) return

  if (sections.length && 'IntersectionObserver' in window && !reducedMotion.matches) {
    document.documentElement.classList.add('section-reveal-ready')
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
    sections.forEach(section => observer.observe(section))
  }

  let activeIndex = 0
  let targetIndex = 0
  let targetY = 0
  let wheelDelta = 0
  let lastStepAt = 0
  let lastStepDirection = 0
  let frameId = 0
  let lastFrameAt = 0
  let isNavigating = false

  function headerHeight() {
    return header ? header.getBoundingClientRect().height : 0
  }

  function syncActiveIndex() {
    const targetTop = headerHeight()
    let nearestDistance = Infinity
    slides.forEach((slide, index) => {
      const distance = Math.abs(slide.getBoundingClientRect().top - targetTop)
      if (distance < nearestDistance) {
        nearestDistance = distance
        activeIndex = index
      }
    })
    targetIndex = activeIndex
  }

  function animate(time) {
    frameId = 0
    const elapsed = lastFrameAt ? Math.min(40, time - lastFrameAt) : 16
    lastFrameAt = time
    const distance = targetY - window.scrollY
    if (Math.abs(distance) <= 12) {
      window.scrollTo(0, targetY)
      isNavigating = false
      syncActiveIndex()
      return
    }

    const eased = Math.abs(distance) * (1 - Math.exp(-elapsed / 150))
    const step = Math.sign(distance) * Math.min(eased, elapsed * 2.4)
    window.scrollTo(0, window.scrollY + step)
    frameId = requestAnimationFrame(animate)
  }

  function goTo(index) {
    targetIndex = Math.max(0, Math.min(index, slides.length - 1))
    targetY = Math.round(slides[targetIndex].getBoundingClientRect().top + window.scrollY - headerHeight())
    if (reducedMotion.matches) {
      if (frameId) cancelAnimationFrame(frameId)
      frameId = 0
      window.scrollTo(0, targetY)
      syncActiveIndex()
      return
    }
    isNavigating = true
    if (!frameId) {
      lastFrameAt = 0
      frameId = requestAnimationFrame(animate)
    }
  }

  function goToHash() {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (!id || id === 'top' || id === 'main') {
      goTo(0)
      return
    }
    const index = slides.findIndex(slide => slide.id === id)
    if (index >= 0) goTo(index)
    else syncActiveIndex()
  }

  window.addEventListener('wheel', event => {
    if (event.ctrlKey || event.metaKey || event.deltaY === 0) return

    if (event.target instanceof Element && event.target.closest('.chat-panel')) return

    const inner = event.target instanceof Element ? event.target.closest('.section-body') : null
    if (event.altKey && inner) {
      event.preventDefault()
      inner.scrollTop += event.deltaY
      return
    }

    event.preventDefault()
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1
    const delta = event.deltaY * unit
    const direction = Math.sign(delta)
    if (wheelDelta && Math.sign(wheelDelta) !== direction) wheelDelta = 0
    wheelDelta += delta
    if (Math.abs(wheelDelta) < 80) return
    const now = performance.now()
    if (direction === lastStepDirection && now - lastStepAt < 160) return

    wheelDelta = 0
    lastStepAt = now
    lastStepDirection = direction
    goTo(targetIndex + direction)
  }, { passive: false })

  document.querySelectorAll('.section-body').forEach(body => {
    body.addEventListener('keydown', event => {
      if (event.target !== body) return
      const page = Math.max(100, body.clientHeight * 0.8)
      const movement = {
        ArrowDown: 48,
        ArrowUp: -48,
        PageDown: page,
        PageUp: -page,
        ' ': event.shiftKey ? -page : page,
        Home: -Infinity,
        End: Infinity
      }[event.key]
      if (movement === undefined) return
      event.preventDefault()
      body.scrollTop = movement === Infinity ? body.scrollHeight : movement === -Infinity ? 0 : body.scrollTop + movement
    })
  })

  window.addEventListener('scroll', () => {
    if (!isNavigating) syncActiveIndex()
  }, { passive: true })
  window.addEventListener('hashchange', goToHash)
  window.addEventListener('resize', syncActiveIndex)
  if (window.location.hash) requestAnimationFrame(goToHash)
  else syncActiveIndex()
})()
