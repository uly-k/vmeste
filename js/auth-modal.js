// ============================================================
// АВТОРИЗАЦИЯ - ДЕМО-ВЕРСИЯ (без бэкенда)
// ============================================================

// ========== ДЕМО-РЕЖИМ: РАБОТА С LOCALSTORAGE ==========
const STORAGE_KEY = 'vmeste_demo_user';

function saveUserToStorage(userData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
}

function getUserFromStorage() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
}

function clearUserFromStorage() {
    localStorage.removeItem(STORAGE_KEY);
}

function isLoggedIn() {
    return getUserFromStorage() !== null;
}

// ========== ФУНКЦИИ МОДАЛКИ ==========
window.openAuthModal = function(formType = 'login') {
    const modal = document.getElementById('auth-modal');
    if (!modal) {
        console.warn('Модальное окно не найдено в DOM');
        return;
    }
    
    const loginForm = document.getElementById('modal-login');
    const registerForm = document.getElementById('modal-register');
    const resetForm = document.getElementById('modal-reset');
    
    if (loginForm) loginForm.classList.remove('active');
    if (registerForm) registerForm.classList.remove('active');
    if (resetForm) resetForm.classList.remove('active');
    
    if (formType === 'login' && loginForm) loginForm.classList.add('active');
    else if (formType === 'register' && registerForm) registerForm.classList.add('active');
    else if (formType === 'reset' && resetForm) resetForm.classList.add('active');
    
    document.querySelectorAll('.modal__input').forEach(input => {
        if (input) input.value = '';
    });
    
    const regCodeGroup = document.getElementById('reg-code-group');
    const resetCodeGroup = document.getElementById('reset-code-group');
    const newPasswordGroup = document.getElementById('new-password-group');
    const registerBtn = document.getElementById('register-btn-action');
    const resetSendBtn = document.getElementById('reset-send-code-btn');
    
    if (regCodeGroup) regCodeGroup.style.display = 'none';
    if (resetCodeGroup) resetCodeGroup.style.display = 'none';
    if (newPasswordGroup) newPasswordGroup.style.display = 'none';
    if (registerBtn) registerBtn.textContent = 'Зарегистрироваться';
    if (resetSendBtn) resetSendBtn.style.display = 'block';
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    const modalMessage = document.getElementById('modal-message');
    if (modalMessage) modalMessage.style.display = 'none';
};

window.closeAuthModal = function() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
};

function showModalMessage(text, isError = true) {
    const modalMessage = document.getElementById('modal-message');
    if (!modalMessage) return;
    modalMessage.textContent = text;
    modalMessage.className = `modal__message ${isError ? 'modal__message--error' : 'modal__message--success'}`;
    modalMessage.style.display = 'block';
    setTimeout(() => {
        if (modalMessage) modalMessage.style.display = 'none';
    }, 4000);
}

function clearModalMessage() {
    const modalMessage = document.getElementById('modal-message');
    if (modalMessage) modalMessage.style.display = 'none';
}

// ========== ЗАКРЫТИЕ МОДАЛКИ ПО КЛИКУ ==========
function initModalCloseHandlers() {
    const overlay = document.querySelector('.modal__overlay');
    const closeBtn = document.querySelector('.modal__close');
    
    if (overlay) {
        const newOverlay = overlay.cloneNode(true);
        overlay.parentNode.replaceChild(newOverlay, overlay);
        newOverlay.addEventListener('click', closeAuthModal);
    }
    
    if (closeBtn) {
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        newCloseBtn.addEventListener('click', closeAuthModal);
    }
}

// ========== ПЕРЕКЛЮЧЕНИЕ ФОРМ ==========
function initFormSwitchers() {
    const toRegister = document.getElementById('to-register-link');
    const toLogin = document.getElementById('to-login-link');
    const forgotLink = document.getElementById('forgot-link');
    const backToLogin = document.getElementById('back-to-login-link');
    
    if (toRegister) {
        const newBtn = toRegister.cloneNode(true);
        toRegister.parentNode.replaceChild(newBtn, toRegister);
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openAuthModal('register');
            clearModalMessage();
        });
    }
    
    if (toLogin) {
        const newBtn = toLogin.cloneNode(true);
        toLogin.parentNode.replaceChild(newBtn, toLogin);
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openAuthModal('login');
            clearModalMessage();
        });
    }
    
    if (forgotLink) {
        const newBtn = forgotLink.cloneNode(true);
        forgotLink.parentNode.replaceChild(newBtn, forgotLink);
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openAuthModal('reset');
            clearModalMessage();
        });
    }
    
    if (backToLogin) {
        const newBtn = backToLogin.cloneNode(true);
        backToLogin.parentNode.replaceChild(newBtn, backToLogin);
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openAuthModal('login');
            clearModalMessage();
        });
    }
}

// ========== РЕГИСТРАЦИЯ (ДЕМО) ==========
let pendingEmail = null;
let pendingFullName = null;
let pendingPassword = null;

function initRegistration() {
    const registerBtn = document.getElementById('register-btn-action');
    if (!registerBtn) return;
    
    const newBtn = registerBtn.cloneNode(true);
    registerBtn.parentNode.replaceChild(newBtn, registerBtn);
    
    newBtn.addEventListener('click', async () => {
        const name = document.getElementById('reg-name')?.value.trim();
        const surname = document.getElementById('reg-surname')?.value.trim();
        const fullName = `${name} ${surname}`;
        const email = document.getElementById('reg-email')?.value.trim();
        const password = document.getElementById('reg-password')?.value;
        const codeGroup = document.getElementById('reg-code-group');
        const registerBtnEl = document.getElementById('register-btn-action');

        if (!name || !surname || !email || !password) {
            showModalMessage('Заполните все поля');
            return;
        }

        if (codeGroup && codeGroup.style.display === 'none') {
            pendingEmail = email;
            pendingFullName = fullName;
            pendingPassword = password;

            codeGroup.style.display = 'flex';
            if (registerBtnEl) registerBtnEl.textContent = 'Подтвердить регистрацию';
            showModalMessage(`Демо-режим: используйте любой код (например, 123456)`, false);
        } else {
            const code = document.getElementById('reg-confirm-code')?.value;
            
            if (!code) {
                showModalMessage('Введите код подтверждения');
                return;
            }

            const userData = {
                id: 'demo_' + Date.now(),
                email: pendingEmail,
                full_name: pendingFullName,
                created_at: new Date().toISOString()
            };
            
            saveUserToStorage(userData);
            
            showModalMessage('Регистрация успешна!', false);
            
            setTimeout(() => {
                openAuthModal('login');
                const loginEmail = document.getElementById('login-email');
                const loginPassword = document.getElementById('login-password');
                if (loginEmail) loginEmail.value = pendingEmail;
                if (loginPassword) loginPassword.value = pendingPassword;
                
                if (codeGroup) codeGroup.style.display = 'none';
                if (registerBtnEl) registerBtnEl.textContent = 'Зарегистрироваться';
                const confirmCodeInput = document.getElementById('reg-confirm-code');
                if (confirmCodeInput) confirmCodeInput.value = '';
                
                pendingEmail = null;
                pendingFullName = null;
                pendingPassword = null;
            }, 2000);
        }
    });
}

// ========== ВХОД (ДЕМО) ==========
function initLogin() {
    const loginBtn = document.getElementById('login-btn-action');
    if (!loginBtn) return;
    
    const newBtn = loginBtn.cloneNode(true);
    loginBtn.parentNode.replaceChild(newBtn, loginBtn);
    
    newBtn.addEventListener('click', async () => {
        const email = document.getElementById('login-email')?.value.trim();
        const password = document.getElementById('login-password')?.value;
        
        if (!email || !password) {
            showModalMessage('Заполните все поля');
            return;
        }
        
        const userData = getUserFromStorage();
        
        if (userData && userData.email === email) {
            showModalMessage('Вход выполнен успешно!', false);
            setTimeout(() => {
                closeAuthModal();
                loadUserProfile();
                renderPurchases();
            }, 1500);
        } else {
            showModalMessage('Неверная почта или пароль. Зарегистрируйтесь сначала.');
        }
    });
}

// ========== ВОССТАНОВЛЕНИЕ ПАРОЛЯ (ДЕМО) ==========
let resetEmail = null;

function initPasswordReset() {
    const resetSendBtn = document.getElementById('reset-send-code-btn');
    const resetVerifyBtn = document.getElementById('reset-verify-code-btn');
    const setNewPasswordBtn = document.getElementById('set-new-password-btn');
    
    if (resetSendBtn) {
        const newBtn = resetSendBtn.cloneNode(true);
        resetSendBtn.parentNode.replaceChild(newBtn, resetSendBtn);
        
        newBtn.addEventListener('click', async () => {
            const email = document.getElementById('reset-email')?.value.trim();
            
            if (!email) {
                showModalMessage('Введите email');
                return;
            }
            
            resetEmail = email;
            
            document.getElementById('reset-code-group').style.display = 'flex';
            newBtn.style.display = 'none';
            showModalMessage(`Демо-режим: код отправлен на ${email} (используйте любой код)`, false);
        });
    }
    
    if (resetVerifyBtn) {
        const newBtn = resetVerifyBtn.cloneNode(true);
        resetVerifyBtn.parentNode.replaceChild(newBtn, resetVerifyBtn);
        
        newBtn.addEventListener('click', async () => {
            const code = document.getElementById('reset-confirm-code')?.value;
            
            if (!code) {
                showModalMessage('Введите код подтверждения');
                return;
            }
            
            showModalMessage('Код подтверждён! Придумайте новый пароль', false);
            document.getElementById('reset-code-group').style.display = 'none';
            document.getElementById('new-password-group').style.display = 'flex';
        });
    }
    
    if (setNewPasswordBtn) {
        const newBtn = setNewPasswordBtn.cloneNode(true);
        setNewPasswordBtn.parentNode.replaceChild(newBtn, setNewPasswordBtn);
        
        newBtn.addEventListener('click', async () => {
            const newPassword = document.getElementById('new-password')?.value;
            const confirmPassword = document.getElementById('confirm-password')?.value;
            
            if (!newPassword || !confirmPassword) {
                showModalMessage('Заполните все поля');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                showModalMessage('Пароли не совпадают');
                return;
            }
            
            showModalMessage('Пароль успешно изменён!', false);
            setTimeout(() => {
                openAuthModal('login');
                const resetEmailInput = document.getElementById('reset-email');
                const resetCodeInput = document.getElementById('reset-confirm-code');
                const newPasswordInput = document.getElementById('new-password');
                const confirmPasswordInput = document.getElementById('confirm-password');
                if (resetEmailInput) resetEmailInput.value = '';
                if (resetCodeInput) resetCodeInput.value = '';
                if (newPasswordInput) newPasswordInput.value = '';
                if (confirmPasswordInput) confirmPasswordInput.value = '';
            }, 2000);
        });
    }
}

// ========== ЗАГРУЗКА ПРОФИЛЯ И КОНТРОЛЬ АВТОРИЗАЦИИ ==========
function loadUserProfile() {
    const userData = getUserFromStorage();
    const isLkPage = window.location.pathname.includes('lk.html');
    
    if (userData) {
        console.log('✅ Загружен пользователь:', userData.email);
        
        const fullName = userData.full_name || '';
        const nameParts = fullName.split(' ');
        
        const nameEl = document.getElementById('profile-name');
        const surnameEl = document.getElementById('profile-surname');
        
        if (nameEl) nameEl.textContent = nameParts[0] || 'Гость';
        if (surnameEl) surnameEl.textContent = nameParts[1] || '';
        
        return true;
    } else {
        console.log('❌ Пользователь не авторизован');
        
        const nameEl = document.getElementById('profile-name');
        const surnameEl = document.getElementById('profile-surname');
        
        if (nameEl) nameEl.textContent = 'Не авторизован';
        if (surnameEl) surnameEl.textContent = '';
        
        if (isLkPage) {
            setTimeout(() => {
                openAuthModal('login');
            }, 100);
        }
        
        return false;
    }
}

// ========== ВЫХОД ==========
window.logout = function() {
    clearUserFromStorage();
    showModalMessage('Вы вышли из аккаунта', false);
    setTimeout(() => {
        window.location.reload();
    }, 1000);
};

// ========== ГЕНЕРАЦИЯ КАРТОЧЕК ПОКУПОК ==========
const DEMO_PURCHASES = [
    {
        id: 1,
        image: "media/майка.png",
        name: "майка равный круг",
        status: "Статус: Можно забирать",
        isPast: false
    },
    {
        id: 2,
        image: "media/сумка.png",
        name: "сумка-шоппер",
        status: "Статус: В пути",
        isPast: false
    },
    {
        id: 3,
        image: "media/Rectaввв3.png",
        name: "брелок",
        status: "Статус: Доставлен",
        isPast: true
    }
];

let currentFilter = 'all';

function renderPurchases() {
    const container = document.getElementById('cardsContainer');
    if (!container) return;
    
    const userData = getUserFromStorage();
    
    // Если пользователь не авторизован — показываем кнопку входа
    if (!userData) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 60px; grid-column: 6 / -1;">
                <p style="font-family: var(--font-primary); font-size: 18px; color: var(--black); margin-bottom: 24px;">
                    Войдите в аккаунт, чтобы увидеть покупки
                </p>
                <button class="btn btn--primary" id="open-auth-from-empty" style="background: var(--blue);">
                    Войти в аккаунт
                </button>
            </div>
        `;
        
        const openAuthBtn = document.getElementById('open-auth-from-empty');
        if (openAuthBtn) {
            openAuthBtn.addEventListener('click', () => {
                openAuthModal('login');
            });
        }
        return;
    }
    
    const filtered = currentFilter === 'all' 
        ? DEMO_PURCHASES 
        : DEMO_PURCHASES.filter(p => p.isPast);
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state" style="text-align: center; padding: 60px; color: var(--black);">Нет покупок</div>';
        return;
    }
    
    const cardsToShow = filtered.slice(0, 2);
    
    container.innerHTML = cardsToShow.map(purchase => `
        <div class="pokupka_card" data-id="${purchase.id}">
            <img class="pokupka__img" src="${purchase.image}" alt="${purchase.name}">
            <div class="product_name"><h3>${purchase.name}</h3></div>
            <div class="status">${purchase.status}</div>
            <div class="knopki">
                <button class="btn btn--secondary">открыть qr-код</button>
                <button class="btn btn--linkzak">отменить заказ</button>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.btn--secondary').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.pokupka_card');
            const id = card?.dataset.id;
            alert(`QR-код для заказа #${id} (демо-режим)`);
        });
    });
    
    document.querySelectorAll('.btn--linkzak').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.pokupka_card');
            const id = card?.dataset.id;
            if (confirm(`Отменить заказ #${id}?`)) {
                card?.remove();
            }
        });
    });
}

function initFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderPurchases();
        });
    });
}

// ========== ИНИЦИАЛИЗАЦИЯ ВСЕГО ==========
function init() {
    console.log('🚀 Инициализация auth-modal.js');
    
    initModalCloseHandlers();
    initFormSwitchers();
    initRegistration();
    initLogin();
    initPasswordReset();
    initFilters();
    
    loadUserProfile();
    renderPurchases();
    
    console.log('✅ Демо-версия auth-modal.js загружена');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.isLoggedIn = isLoggedIn;
window.getUserFromStorage = getUserFromStorage;