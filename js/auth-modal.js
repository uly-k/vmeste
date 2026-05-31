// ============================================================
// Авторизация через Supabase Auth
// ============================================================

const authClient = window.vmesteSupabase;
const DEFAULT_PROFILE_AVATAR = 'media/profile-placeholder.svg';
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const AVATAR_MAX_SIDE = 1200;

let selectedAvatarFile = null;
let removeAvatarRequested = false;

function withTimeout(promise, timeoutMs = 15000) {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error('timeout')), timeoutMs);
        }),
    ]);
}

function setSaveProfileStatus(text) {
    const saveButtonText = document.querySelector('#save-profile-settings .modal__btn-text');
    if (saveButtonText) saveButtonText.textContent = text;
}

function translateAuthError(error) {
    const message = error?.message || '';
    const normalized = message.toLowerCase();

    if (normalized.includes('only request this after')) {
        const seconds = message.match(/after\s+(\d+)\s+seconds?/i)?.[1];
        return seconds
            ? `Повторите попытку через ${seconds} сек.`
            : 'Повторите попытку немного позже.';
    }
    if (normalized.includes('user already registered')) {
        return 'Пользователь с такой почтой уже зарегистрирован.';
    }
    if (normalized.includes('invalid login credentials')) {
        return 'Неверная почта или пароль.';
    }
    if (normalized.includes('email not confirmed')) {
        return 'Сначала подтвердите почту по ссылке из письма.';
    }
    if (normalized.includes('password should be at least')) {
        return 'Пароль слишком короткий. Используйте не менее 6 символов.';
    }
    if (normalized.includes('unable to validate email address') || normalized.includes('invalid email')) {
        return 'Проверьте правильность адреса электронной почты.';
    }
    if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
        return 'Слишком много попыток. Повторите немного позже.';
    }

    return 'Не удалось выполнить действие. Попробуйте ещё раз.';
}

function showModalMessage(text, isError = true) {
    const message = document.getElementById('modal-message');
    if (!message) return;

    message.textContent = text;
    message.className = `modal__message ${isError ? 'modal__message--error' : 'modal__message--success'}`;
    message.style.display = 'block';
}

function clearModalMessage() {
    const message = document.getElementById('modal-message');
    if (message) message.style.display = 'none';
}

function setResetPasswordMode(enabled) {
    const sendButton = document.getElementById('reset-send-code-btn');
    const passwordGroup = document.getElementById('new-password-group');
    const codeGroup = document.getElementById('reset-code-group');

    if (sendButton) sendButton.style.display = enabled ? 'none' : 'block';
    if (passwordGroup) passwordGroup.style.display = enabled ? 'flex' : 'none';
    if (codeGroup) codeGroup.style.display = 'none';
}

window.openAuthModal = function(formType = 'login') {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;

    document.querySelectorAll('.modal__form').forEach(form => {
        form.classList.remove('active');
    });
    document.getElementById(`modal-${formType}`)?.classList.add('active');

    if (formType !== 'reset') setResetPasswordMode(false);
    clearModalMessage();
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

window.closeAuthModal = function() {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;

    modal.style.display = 'none';
    document.body.style.overflow = '';
    clearModalMessage();
};

function bindModalClose() {
    const modal = document.getElementById('auth-modal');
    modal?.querySelector('.modal__overlay')?.addEventListener('click', closeAuthModal);
    modal?.querySelector('.modal__close')?.addEventListener('click', closeAuthModal);
}

function bindFormSwitchers() {
    const links = [
        ['to-register-link', 'register'],
        ['to-login-link', 'login'],
        ['forgot-link', 'reset'],
        ['back-to-login-link', 'login'],
    ];

    links.forEach(([id, form]) => {
        document.getElementById(id)?.addEventListener('click', event => {
            event.preventDefault();
            openAuthModal(form);
        });
    });
}

function bindRegistration() {
    document.getElementById('register-btn-action')?.addEventListener('click', async () => {
        const name = document.getElementById('reg-name')?.value.trim();
        const surname = document.getElementById('reg-surname')?.value.trim();
        const email = document.getElementById('reg-email')?.value.trim();
        const password = document.getElementById('reg-password')?.value;

        if (!name || !surname || !email || !password) {
            showModalMessage('Заполните все поля');
            return;
        }

        const { data, error } = await authClient.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: `${name} ${surname}` },
                emailRedirectTo: new URL('lk.html', window.location.href).href,
            },
        });

        if (error) {
            showModalMessage(translateAuthError(error));
            return;
        }
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
            showModalMessage('Пользователь с такой почтой уже зарегистрирован.');
            return;
        }

        showModalMessage('Проверьте почту и подтвердите регистрацию.', false);
    });
}

function bindLogin() {
    document.getElementById('login-btn-action')?.addEventListener('click', async () => {
        const email = document.getElementById('login-email')?.value.trim();
        const password = document.getElementById('login-password')?.value;

        if (!email || !password) {
            showModalMessage('Заполните все поля');
            return;
        }

        const { error } = await authClient.auth.signInWithPassword({ email, password });
        if (error) {
            showModalMessage('Не удалось войти. Проверьте почту, пароль и подтверждение email.');
            return;
        }

        closeAuthModal();
        await loadUserProfile();
        await window.vmesteAccountOrdersLoad?.();
    });
}

function bindPasswordReset() {
    document.getElementById('reset-send-code-btn')?.addEventListener('click', async () => {
        const email = document.getElementById('reset-email')?.value.trim();
        if (!email) {
            showModalMessage('Введите email');
            return;
        }

        const { error } = await authClient.auth.resetPasswordForEmail(email, {
            redirectTo: new URL('lk.html', window.location.href).href,
        });

        if (error) {
            showModalMessage(translateAuthError(error));
            return;
        }

        showModalMessage('Ссылка для восстановления отправлена на почту.', false);
    });

    document.getElementById('set-new-password-btn')?.addEventListener('click', async () => {
        const password = document.getElementById('new-password')?.value;
        const confirmation = document.getElementById('confirm-password')?.value;

        if (!password || !confirmation) {
            showModalMessage('Заполните оба поля');
            return;
        }
        if (password !== confirmation) {
            showModalMessage('Пароли не совпадают');
            return;
        }

        const { error } = await authClient.auth.updateUser({ password });
        if (error) {
            showModalMessage(translateAuthError(error));
            return;
        }

        showModalMessage('Пароль изменён. Теперь можно войти.', false);
        setTimeout(() => openAuthModal('login'), 1200);
    });
}

async function getCurrentUser() {
    const { data, error } = await authClient.auth.getSession();
    if (error) return null;
    return data.session?.user || null;
}

function renderUserProfile(profile) {
    const nameElement = document.getElementById('profile-name');
    const surnameElement = document.getElementById('profile-surname');
    const avatarElement = document.querySelector('.user-card__img');
    const adminLink = document.getElementById('admin-panel-link');
    const [name = 'Гость', ...surnameParts] = (profile?.fullName || '').split(' ').filter(Boolean);

    if (nameElement && nameElement.textContent !== name) nameElement.textContent = name;
    if (surnameElement && surnameElement.textContent !== surnameParts.join(' ')) {
        surnameElement.textContent = surnameParts.join(' ');
    }
    if (avatarElement && avatarElement.getAttribute('src') !== (profile?.avatarUrl || DEFAULT_PROFILE_AVATAR)) {
        avatarElement.src = profile?.avatarUrl || DEFAULT_PROFILE_AVATAR;
    }
    if (adminLink) adminLink.hidden = !profile?.isAdmin;
}

function renderCachedUserProfile() {
    const userId = window.vmesteCache?.currentUserId();
    const cached = window.vmesteCache?.read(`profile:${userId}`);
    if (!userId || !cached) return false;
    renderUserProfile(cached);
    return true;
}

async function loadUserProfile() {
    renderCachedUserProfile();
    const user = await getCurrentUser();
    const nameElement = document.getElementById('profile-name');
    const surnameElement = document.getElementById('profile-surname');

    if (!user) {
        if (nameElement) nameElement.textContent = 'Не авторизован';
        if (surnameElement) surnameElement.textContent = '';
        return false;
    }

    let profile = null;
    try {
        const { data, error } = await authClient
            .from('profiles')
            .select('full_name, avatar_url, is_admin')
            .eq('id', user.id)
            .maybeSingle();
        if (error) throw error;
        profile = data;
    } catch (error) {
        console.error('[auth] profile:', error);
        if (renderCachedUserProfile()) return true;
    }

    const fullName = profile?.full_name || user.user_metadata?.full_name || '';
    const cachedProfile = {
        fullName,
        avatarUrl: profile?.avatar_url || DEFAULT_PROFILE_AVATAR,
        isAdmin: Boolean(profile?.is_admin),
    };
    if (window.vmesteCache?.write(`profile:${user.id}`, cachedProfile)) {
        renderUserProfile(cachedProfile);
    } else if (!renderCachedUserProfile()) {
        renderUserProfile(cachedProfile);
    }
    return true;
}

window.logout = async function() {
    const userId = window.vmesteCache?.currentUserId();
    window.vmesteCache?.remove(`profile:${userId}`);
    window.vmesteCache?.remove(`orders:${userId}`);
    await authClient.auth.signOut();
    window.location.reload();
};

function showSettingsMessage(text, isError = true) {
    const message = document.getElementById('profile-settings-message');
    if (!message) return;

    message.textContent = text;
    message.className = `modal__message ${isError ? 'modal__message--error' : 'modal__message--success'}`;
    message.style.display = 'block';
}

function clearSettingsMessage() {
    const message = document.getElementById('profile-settings-message');
    if (message) message.style.display = 'none';
}

function closeProfileSettings() {
    const modal = document.getElementById('profile-settings-modal');
    if (!modal) return;

    modal.style.display = 'none';
    document.body.style.overflow = '';
    clearSettingsMessage();
}

async function openProfileSettings() {
    const modal = document.getElementById('profile-settings-modal');
    const user = await getCurrentUser();
    if (!modal || !user) return;

    clearSettingsMessage();
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const cachedProfile = window.vmesteCache?.read(`profile:${user.id}`);
    if (cachedProfile) {
        const [cachedName = '', ...cachedSurnameParts] = (cachedProfile.fullName || '').split(' ').filter(Boolean);
        document.getElementById('settings-name').value = cachedName;
        document.getElementById('settings-surname').value = cachedSurnameParts.join(' ');
        document.getElementById('settings-email').value = user.email || '';
        const cachedPreview = document.getElementById('settings-avatar-preview');
        if (cachedPreview) cachedPreview.src = cachedProfile.avatarUrl || DEFAULT_PROFILE_AVATAR;
    }

    let profile = null;
    let error = null;
    try {
        ({ data: profile, error } = await authClient
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', user.id)
            .maybeSingle());
    } catch (requestError) {
        error = requestError;
    }

    if (error) {
        showSettingsMessage(cachedProfile
            ? 'Не удалось обновить настройки из Supabase. Показаны сохранённые данные.'
            : 'Не удалось загрузить настройки профиля.');
        return;
    }

    const [name = '', ...surnameParts] = (profile?.full_name || '').split(' ').filter(Boolean);
    document.getElementById('settings-name').value = name;
    document.getElementById('settings-surname').value = surnameParts.join(' ');
    document.getElementById('settings-email').value = user.email || '';
    const preview = document.getElementById('settings-avatar-preview');
    const fileInput = document.getElementById('settings-avatar-file');
    if (preview) preview.src = profile?.avatar_url || DEFAULT_PROFILE_AVATAR;
    if (fileInput) fileInput.value = '';
    window.vmesteCache?.write(`profile:${user.id}`, {
        ...(cachedProfile || {}),
        fullName: profile?.full_name || user.user_metadata?.full_name || '',
        avatarUrl: profile?.avatar_url || DEFAULT_PROFILE_AVATAR,
    });
    selectedAvatarFile = null;
    removeAvatarRequested = false;

}

function avatarFileExtension(file) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension && /^[a-z0-9]+$/.test(extension)) return extension;

    const extensions = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/avif': 'avif',
    };
    return extensions[file.type] || 'img';
}

function selectAvatarFile(file) {
    if (!file) return;
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
        showSettingsMessage('Выберите изображение в формате PNG, JPG, WEBP или AVIF.');
        return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
        showSettingsMessage('Размер изображения не должен превышать 5 МБ.');
        return;
    }

    selectedAvatarFile = file;
    removeAvatarRequested = false;
    clearSettingsMessage();

    const preview = document.getElementById('settings-avatar-preview');
    if (preview) preview.src = URL.createObjectURL(file);
}

async function uploadProfileAvatar(user) {
    if (!selectedAvatarFile) return null;

    setSaveProfileStatus('Подготавливаем фото...');
    const avatarFile = await prepareAvatarFile(selectedAvatarFile);
    const filePath = `${user.id}/avatar.${avatarFileExtension(avatarFile)}`;

    setSaveProfileStatus('Загружаем фото...');
    const { error } = await withTimeout(
        authClient.storage
            .from('avatars')
            .upload(filePath, avatarFile, {
                cacheControl: '3600',
                upsert: true,
            })
    );

    if (error) throw error;

    const { data } = authClient.storage.from('avatars').getPublicUrl(filePath);
    return `${data.publicUrl}?v=${Date.now()}`;
}

async function prepareAvatarFile(file) {
    const image = await createImageBitmap(file);
    const scale = Math.min(1, AVATAR_MAX_SIDE / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(image, 0, 0, width, height);
    image.close();

    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(result => {
            if (result) resolve(result);
            else reject(new Error('avatar-conversion-failed'));
        }, 'image/webp', 0.82);
    });

    return new File([blob], 'avatar.webp', { type: 'image/webp' });
}

async function saveProfileSettings() {
    const saveButton = document.getElementById('save-profile-settings');
    const saveButtonText = saveButton?.querySelector('.modal__btn-text');
    const user = await getCurrentUser();
    const name = document.getElementById('settings-name')?.value.trim();
    const surname = document.getElementById('settings-surname')?.value.trim();

    if (!user) return;
    if (!name || !surname) {
        showSettingsMessage('Укажите имя и фамилию.');
        return;
    }

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.classList.add('loading');
    }
    if (saveButtonText) saveButtonText.textContent = selectedAvatarFile
        ? 'Подготавливаем фото...'
        : 'Сохраняем профиль...';
    clearSettingsMessage();

    const fullName = `${name} ${surname}`;
    let avatarUrl;

    try {
        avatarUrl = removeAvatarRequested ? null : await uploadProfileAvatar(user);
    } catch {
        showSettingsMessage('Не удалось загрузить фотографию. Попробуйте ещё раз.');
        return resetSaveProfileButton();
    }

    const profilePatch = { full_name: fullName };
    if (removeAvatarRequested || avatarUrl) profilePatch.avatar_url = avatarUrl;

    setSaveProfileStatus('Сохраняем профиль...');
    let error;
    try {
        ({ error } = await withTimeout(
            authClient
                .from('profiles')
                .update(profilePatch)
                .eq('id', user.id)
        ));
    } catch {
        showSettingsMessage('Сохранение заняло слишком много времени. Попробуйте ещё раз.');
        return resetSaveProfileButton();
    }

    if (error) {
        showSettingsMessage('Не удалось сохранить изменения.');
        return resetSaveProfileButton();
    }

    const nameElement = document.getElementById('profile-name');
    const surnameElement = document.getElementById('profile-surname');
    const avatarElement = document.querySelector('.user-card__img');

    if (nameElement) nameElement.textContent = name;
    if (surnameElement) surnameElement.textContent = surname;
    if (avatarElement && (removeAvatarRequested || avatarUrl)) {
        avatarElement.src = avatarUrl || DEFAULT_PROFILE_AVATAR;
    }
    const existingProfile = window.vmesteCache?.read(`profile:${user.id}`, {});
    window.vmesteCache?.write(`profile:${user.id}`, {
        ...existingProfile,
        fullName,
        avatarUrl: removeAvatarRequested
            ? DEFAULT_PROFILE_AVATAR
            : avatarUrl || existingProfile.avatarUrl || DEFAULT_PROFILE_AVATAR,
    });

    selectedAvatarFile = null;
    removeAvatarRequested = false;
    showSettingsMessage('Изменения сохранены.', false);
    resetSaveProfileButton();
}

function resetSaveProfileButton() {
    const saveButton = document.getElementById('save-profile-settings');
    const saveButtonText = saveButton?.querySelector('.modal__btn-text');

    if (saveButton) {
        saveButton.disabled = false;
        saveButton.classList.remove('loading');
    }
    if (saveButtonText) saveButtonText.textContent = 'Сохранить изменения';
}

function bindProfileSettings() {
    const modal = document.getElementById('profile-settings-modal');
    const dropZone = document.getElementById('avatar-drop-zone');

    document.getElementById('profile-settings-btn')?.addEventListener('click', openProfileSettings);
    document.getElementById('save-profile-settings')?.addEventListener('click', saveProfileSettings);
    document.getElementById('settings-logout')?.addEventListener('click', window.logout);
    document.getElementById('settings-avatar-file')?.addEventListener('change', event => {
        selectAvatarFile(event.target.files?.[0]);
    });
    document.getElementById('remove-profile-avatar')?.addEventListener('click', () => {
        selectedAvatarFile = null;
        removeAvatarRequested = true;
        document.getElementById('settings-avatar-file').value = '';
        document.getElementById('settings-avatar-preview').src = DEFAULT_PROFILE_AVATAR;
        clearSettingsMessage();
    });
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone?.addEventListener(eventName, event => {
            event.preventDefault();
            dropZone.classList.add('dragging');
        });
    });
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone?.addEventListener(eventName, event => {
            event.preventDefault();
            dropZone.classList.remove('dragging');
        });
    });
    dropZone?.addEventListener('drop', event => {
        selectAvatarFile(event.dataTransfer?.files?.[0]);
    });
    modal?.querySelector('.modal__overlay')?.addEventListener('click', closeProfileSettings);
    modal?.querySelector('.modal__close')?.addEventListener('click', closeProfileSettings);
}

async function renderPurchases() {
    const container = document.getElementById('cardsContainer');
    if (!container) return;

    const user = await getCurrentUser();
    if (!user) {
        container.innerHTML = `
            <div class="empty-state" style="text-align:center;padding:60px;grid-column:6 / -1;">
                <p style="font-family:var(--font-primary);font-size:18px;color:var(--black);margin-bottom:24px;">
                    Войдите в аккаунт, чтобы увидеть покупки
                </p>
                <button class="btn btn--primary" id="open-auth-from-empty" style="background:var(--blue);">
                    Войти в аккаунт
                </button>
            </div>
        `;
        document.getElementById('open-auth-from-empty')?.addEventListener('click', () => {
            openAuthModal('login');
        });
        return;
    }

    await window.vmesteAccountOrdersLoad?.();
}

async function init() {
    if (!authClient) {
        console.error('[auth] Supabase client is not available');
        return;
    }

    bindModalClose();
    bindFormSwitchers();
    bindRegistration();
    bindLogin();
    bindPasswordReset();
    bindProfileSettings();

    authClient.auth.onAuthStateChange(event => {
        if (event === 'PASSWORD_RECOVERY') {
            openAuthModal('reset');
            setResetPasswordMode(true);
            showModalMessage('Введите новый пароль.', false);
        }
    });

    const loggedIn = await loadUserProfile();
    await renderPurchases();

    if (!loggedIn && window.location.pathname.includes('lk.html')) {
        setTimeout(() => openAuthModal('login'), 100);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.isLoggedIn = async function() {
    return Boolean(await getCurrentUser());
};
