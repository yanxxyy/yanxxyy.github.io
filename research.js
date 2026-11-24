const researchCard = document.querySelector('.research-card');

if (researchCard) {
  let animationTimer;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function playJournalAnimation() {
    if (reducedMotion.matches) return;

    researchCard.classList.remove('is-activated');
    void researchCard.offsetWidth;
    researchCard.classList.add('is-activated');

    window.clearTimeout(animationTimer);
    animationTimer = window.setTimeout(() => {
      researchCard.classList.remove('is-activated');
    }, 780);
  }

  researchCard.addEventListener('click', playJournalAnimation);
  researchCard.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    playJournalAnimation();
  });
}
