(function() {
    // значения для кнопок
    const values = [100, 300, 500, 700];
    let activeIndex = 1; // выбрано 300
    
    const trackFill = document.getElementById('trackFill');
    const btns = document.querySelectorAll('.track-btn');
    
    function updateSlider(index) {
        // обновляем заливку
        const percent = (index / (values.length - 1)) * 100;
        trackFill.style.width = percent + '%';
        
        // обновляем все кнопки
        for (let i = 0; i < btns.length; i++) {
            const btn = btns[i];
            // удаляем все классы
            btn.classList.remove('green', 'active');
            
            // кнопки слева и выбранная - зелёные
            if (i <= index) {
                btn.classList.add('green');
            }
            
            // выбранная кнопка - активная
            if (i === index) {
                btn.classList.add('active');
            }
        }
    }
    
    // вешаем обработчики
    for (let i = 0; i < btns.length; i++) {
        const btn = btns[i];
        const idx = i;
        
        btn.onclick = function(e) {
            e.stopPropagation();
            activeIndex = idx;
            updateSlider(activeIndex);
            console.log('Выбрано:', values[activeIndex]);
        };
    }
    
    // запускаем с выбранным 300
    updateSlider(activeIndex);
})();