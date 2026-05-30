
  // Бургер-меню
  const burger = document.querySelector('.burger');
  const mobileMenu = document.querySelector('.mobile-menu');
  
  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      const isActive = burger.classList.toggle('active');
      mobileMenu.classList.toggle('active');
      
      // Обновляем aria-атрибуты для доступности
      burger.setAttribute('aria-expanded', isActive);
      mobileMenu.setAttribute('aria-hidden', !isActive);
    });
    
    // Закрытие меню при клике на ссылку
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        burger.classList.remove('active');
        mobileMenu.classList.remove('active');
        burger.setAttribute('aria-expanded', false);
        mobileMenu.setAttribute('aria-hidden', true);
      });
    });
  }
