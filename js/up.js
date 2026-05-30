// Кнопка "наверх" в футере
const scrollToTopBtn = document.querySelector('.footer__buttonup');

if (scrollToTopBtn) {
  scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}