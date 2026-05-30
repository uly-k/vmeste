/**
 * Анимация текста по строкам для h2
 * Разбивает текст на логические строки и анимирует их появление
 */

function animateTextByLines() {
    const h2Element = document.getElementById('abz2');
    
    // Если элемента нет, выходим
    if (!h2Element) return;
    
    // Сохраняем оригинальный HTML (с &nbsp;)
    const originalHTML = h2Element.innerHTML;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = originalHTML;
    const originalText = tempDiv.textContent || tempDiv.innerText;
    
    // Разбиваем текст на логические строки (по запятым)
    let lines = [];
    
    // Если есть запятые — разбиваем по ним
    if (originalText.includes(',')) {
        lines = originalText.split(', ');
        // Добавляем запятые обратно (кроме последней)
        lines = lines.map((line, index) => {
            return line + (index < lines.length - 1 ? ',' : '');
        });
    } 
    // Если нет запятых, разбиваем на части по 4-5 слов
    else {
        const words = originalText.split(' ');
        const wordsPerLine = 4;
        
        for (let i = 0; i < words.length; i += wordsPerLine) {
            let line = words.slice(i, i + wordsPerLine).join(' ');
            lines.push(line);
        }
    }
    
    // Сохраняем оригинальные &nbsp; (неразрывные пробелы)
    // Обрабатываем каждую строку, заменяя пробелы на &nbsp; где нужно
    const originalWithNbsp = originalHTML;
    const hasNbsp = originalWithNbsp.includes('&nbsp;');
    
    // Очищаем h2
    h2Element.innerHTML = '';
    
    // Добавляем каждую строку с задержкой анимации
    lines.forEach((line, index) => {
        const span = document.createElement('span');
        span.className = 'text-line';
        
        // Задержка: 0.2 секунды между строками
        span.style.animationDelay = `${index * 0.2}s`;
        
        // Восстанавливаем &nbsp; если они были в оригинале
        let processedLine = line;
        if (hasNbsp) {
            // Сохраняем неразрывные пробелы в ключевых местах
            processedLine = line.replace(/ /g, ' ');
        }
        
        span.innerHTML = processedLine;
        h2Element.appendChild(span);
    });
    
    // Показываем h2 после добавления строк
    h2Element.style.opacity = '1';
}

// Альтернативный вариант: по 3 слова
function animateTextByThreeWords() {
    const h2Element = document.getElementById('abz2');
    
    if (!h2Element) return;
    
    const originalText = h2Element.innerText;
    
    // Разбиваем на слова
    const words = originalText.split(' ');
    const lines = [];
    
    // Группируем по 3 слова
    for (let i = 0; i < words.length; i += 3) {
        let line = words.slice(i, i + 3).join(' ');
        lines.push(line);
    }
    
    // Очищаем и заполняем
    h2Element.innerHTML = '';
    
    lines.forEach((line, index) => {
        const span = document.createElement('span');
        span.className = 'text-line';
        span.style.animationDelay = `${index * 0.15}s`;
        span.innerText = line;
        h2Element.appendChild(span);
    });
    
    h2Element.style.opacity = '1';
}

// Выбираем метод анимации:
// true = по строкам (логическое разбиение)
// false = по 3 слова
const USE_LINES_MODE = true; // поменяйте на false для анимации по 3 слова

// Запускаем анимацию при загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (USE_LINES_MODE) {
            animateTextByLines();
        } else {
            animateTextByThreeWords();
        }
    });
} else {
    if (USE_LINES_MODE) {
        animateTextByLines();
    } else {
        animateTextByThreeWords();
    }
}

// Опционально: перезапуск анимации при ресайзе (если текст переносится)
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        // Можно раскомментировать, если нужно перезапускать анимацию при изменении размера окна
        // if (USE_LINES_MODE) {
        //     animateTextByLines();
        // } else {
        //     animateTextByThreeWords();
        // }
    }, 250);
});