(() => {
  const gallery = document.getElementById('paper-gallery')
  const previousButton = document.getElementById('paper-prev')
  const nextButton = document.getElementById('paper-next')
  const status = document.getElementById('paper-scroll-status')
  if (!gallery || !previousButton || !nextButton || !status) return

  const figures = [...gallery.querySelectorAll('.paper-figure')]
  if (figures.length < 2) return
  let current = 0

  figures.forEach(figure => {
    const image = figure.querySelector('img')
    if (image) image.loading = 'eager'
  })

  function show(index) {
    current = (index + figures.length) % figures.length
    const previous = (current - 1 + figures.length) % figures.length
    const next = (current + 1) % figures.length

    figures.forEach((figure, position) => {
      figure.classList.remove('is-active', 'is-prev', 'is-next', 'is-hidden')
      const state = position === current ? 'is-active'
        : position === previous ? 'is-prev'
        : position === next ? 'is-next'
        : 'is-hidden'
      figure.classList.add(state)
      figure.setAttribute('aria-hidden', String(position !== current))
      const imageLink = figure.querySelector('.paper-image-link')
      if (imageLink) imageLink.tabIndex = position === current ? 0 : -1
    })

    status.textContent = `${String(current + 1).padStart(2, '0')} / ${String(figures.length).padStart(2, '0')}`
  }

  previousButton.addEventListener('click', () => show(current - 1))
  nextButton.addEventListener('click', () => show(current + 1))
  gallery.parentElement.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(current - 1) }
    if (event.key === 'ArrowRight') { event.preventDefault(); show(current + 1) }
  })
  show(0)
})()
