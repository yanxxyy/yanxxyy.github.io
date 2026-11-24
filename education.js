(() => {
  const gallery = document.querySelector('#education-gallery')
  const cards = [...(gallery?.querySelectorAll('.education-card') || [])]
  const previous = document.querySelector('#education-prev')
  const next = document.querySelector('#education-next')
  const status = document.querySelector('#education-status')
  if (!gallery || !previous || !next || !status || !cards.length) return

  const narrow = window.matchMedia('(max-width: 700px)')
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let current = 0

  function updateStatus() {
    status.textContent = `${String(current + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`
  }

  function show(index) {
    if (!narrow.matches) return
    current = (index + cards.length) % cards.length
    const gap = parseFloat(getComputedStyle(gallery).columnGap) || 0
    gallery.scrollTo({ left: current * (cards[0].getBoundingClientRect().width + gap), behavior: reducedMotion.matches ? 'auto' : 'smooth' })
    updateStatus()
  }

  previous.addEventListener('click', () => show(current - 1))
  next.addEventListener('click', () => show(current + 1))
  gallery.addEventListener('keydown', event => {
    if (!narrow.matches || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
    event.preventDefault()
    show(current + (event.key === 'ArrowRight' ? 1 : -1))
  })
  gallery.addEventListener('scroll', () => {
    if (!narrow.matches) return
    const gap = parseFloat(getComputedStyle(gallery).columnGap) || 0
    current = Math.max(0, Math.min(cards.length - 1, Math.round(gallery.scrollLeft / (cards[0].getBoundingClientRect().width + gap))))
    updateStatus()
  }, { passive: true })
  updateStatus()
})()
