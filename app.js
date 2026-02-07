/**
 * Radio Online - Progressive Web App
 * JavaScript Application Logic
 */

// ===== Translations =====
const translations = {
    es: {
        nav_live: 'En Vivo',
        nav_community: 'Chat',
        nav_social: 'Redes',
        settings: 'Configuración',
        language: 'Idioma',
        theme: 'Tema',
        transmission: 'TRANSMISIÓN',
        live: 'EN VIVO',
        play: 'Reproducir',
        pause: 'Pausar',
        send: 'Enviar',
        your_message: 'Tu mensaje...',
        anonymous: 'Anónimo',
        chat_as: 'Chatear como'
    },
    en: {
        nav_live: 'Live',
        nav_community: 'Chat',
        nav_social: 'Social',
        settings: 'Settings',
        language: 'Language',
        theme: 'Theme',
        transmission: 'BROADCAST',
        live: 'LIVE',
        play: 'Play',
        pause: 'Pause',
        send: 'Send',
        your_message: 'Your message...',
        anonymous: 'Anonymous',
        chat_as: 'Chat as'
    }
};

// ===== State =====
const state = {
    isPlaying: false,
    isLoading: false,
    volume: 80,
    nickname: localStorage.getItem('nickname') || 'Anónimo',
    messages: [],
    language: localStorage.getItem('language') || 'es',
    theme: localStorage.getItem('theme') || 'dark'
};

// ===== DOM Elements =====
const elements = {
    // Audio
    audioPlayer: document.getElementById('audio-player'),

    // Player controls
    btnPlay: document.getElementById('btn-play'),
    iconPlay: document.querySelector('.icon-play'),
    iconPause: document.querySelector('.icon-pause'),
    loadingSpinner: document.getElementById('loading-spinner'),

    // Player UI
    audioVisualizer: document.getElementById('audio-visualizer'),
    timeCurrent: document.getElementById('time-current'),
    timeTotal: document.getElementById('time-total'),
    progressFill: document.getElementById('progress-fill'),
    progressThumb: document.getElementById('progress-thumb'),
    backgroundImage: document.getElementById('background-image'),

    // Navigation
    navItems: document.querySelectorAll('.nav-item'),
    tabContents: document.querySelectorAll('.tab-content'),

    // Chat
    messagesContainer: document.getElementById('messages-container'),
    messageInput: document.getElementById('message-input'),
    btnSend: document.getElementById('btn-send'),
    currentUser: document.getElementById('current-user'),
    btnAuth: document.getElementById('btn-auth'),

    // Modal
    authModal: document.getElementById('auth-modal'),
    modalClose: document.getElementById('modal-close'),
    nicknameInput: document.getElementById('nickname-input'),
    btnSaveNickname: document.getElementById('btn-save-nickname'),

    // Social
    socialTabs: document.querySelectorAll('.social-tab'),
    socialIframe: document.getElementById('social-iframe'),
    socialPlaceholder: document.getElementById('social-placeholder')
};

// ===== Sample Messages =====
const sampleMessages = [
    { id: 1, nickname: 'RadioFan', content: '¡Buena música hoy! 🎵', time: '10:00', color: '#6366F1' },
    { id: 2, nickname: 'MusicLover', content: 'Me encanta esta canción, ¿alguien sabe el nombre?', time: '10:05', color: '#8B5CF6' },
    { id: 3, nickname: 'DJ_Night', content: 'Saludos desde España! 🇪🇸', time: '10:10', color: '#EC4899' },
    { id: 4, nickname: 'RadioFan', content: '¿Pueden poner algo de rock clásico?', time: '10:15', color: '#6366F1' },
    { id: 5, nickname: 'NightOwl', content: 'Primera vez escuchando esta radio, me gusta mucho!', time: '10:20', color: '#14B8A6' },
    { id: 6, nickname: 'Melody', content: 'La mejor radio online! 📻', time: '10:25', color: '#F59E0B' }
];

// ===== Avatar Colors =====
const avatarColors = ['#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B'];

function getAvatarColor(nickname) {
    const hash = nickname.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return avatarColors[hash % avatarColors.length];
}

// ===== Audio Player =====
function initAudioPlayer() {
    elements.audioPlayer.volume = state.volume / 100;

    elements.audioPlayer.addEventListener('playing', () => {
        state.isPlaying = true;
        state.isLoading = false;
        updatePlayerUI();
    });

    elements.audioPlayer.addEventListener('pause', () => {
        state.isPlaying = false;
        updatePlayerUI();
    });

    elements.audioPlayer.addEventListener('waiting', () => {
        state.isLoading = true;
        updatePlayerUI();
    });

    elements.audioPlayer.addEventListener('canplay', () => {
        state.isLoading = false;
        updatePlayerUI();
    });

    elements.audioPlayer.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        state.isPlaying = false;
        state.isLoading = false;
        elements.songArtist.textContent = 'Error de conexión';
        updatePlayerUI();
    });
}

function togglePlay() {
    if (state.isPlaying) {
        elements.audioPlayer.pause();
    } else {
        state.isLoading = true;
        updatePlayerUI();
        elements.audioPlayer.play().catch(err => {
            console.error('Play error:', err);
            state.isLoading = false;
            updatePlayerUI();
        });
    }
}

function stopPlayback() {
    elements.audioPlayer.pause();
    elements.audioPlayer.currentTime = 0;
    elements.audioPlayer.src = elements.audioPlayer.querySelector('source').src;
    state.isPlaying = false;
    updatePlayerUI();
}

function updatePlayerUI() {
    // Update button icons
    if (elements.iconPlay) elements.iconPlay.classList.toggle('hidden', state.isPlaying || state.isLoading);
    if (elements.iconPause) elements.iconPause.classList.toggle('hidden', !state.isPlaying || state.isLoading);
    if (elements.loadingSpinner) elements.loadingSpinner.classList.toggle('hidden', !state.isLoading);

    // Update play button state
    if (elements.btnPlay) elements.btnPlay.classList.toggle('playing', state.isPlaying);

    // Update audio visualizer
    if (elements.audioVisualizer) {
        elements.audioVisualizer.classList.toggle('active', state.isPlaying);
    }
}

function updateVolume(value) {
    state.volume = value;
    elements.audioPlayer.volume = value / 100;
}

// ===== Navigation =====
function switchTab(tabName) {
    elements.navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabName);
    });

    elements.tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
}

// ===== Chat =====
async function initChat() {
    elements.currentUser.textContent = state.nickname;

    // Try to load from Supabase first
    try {
        const messages = await supabase.getMessages();
        if (messages && messages.length > 0) {
            state.messages = messages.map(msg => ({
                id: msg.id,
                nickname: msg.nickname,
                content: msg.content,
                time: formatTime(msg.created_at),
                color: getAvatarColor(msg.nickname)
            }));
            console.log('✅ Messages loaded from Supabase');
        } else {
            // Fallback to sample messages
            state.messages = [...sampleMessages];
            console.log('📝 Using sample messages');
        }
    } catch (error) {
        console.error('Failed to load messages:', error);
        state.messages = [...sampleMessages];
    }

    renderMessages();

    // Subscribe to realtime updates
    supabase.subscribeToMessages((newMessage) => {
        const formattedMsg = {
            id: newMessage.id,
            nickname: newMessage.nickname,
            content: newMessage.content,
            time: formatTime(newMessage.created_at),
            color: getAvatarColor(newMessage.nickname)
        };
        state.messages.push(formattedMsg);
        renderMessages();
    });
}

function formatTime(isoString) {
    try {
        const date = new Date(isoString);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } catch {
        return '';
    }
}

function renderMessages() {
    elements.messagesContainer.innerHTML = state.messages.map(msg => `
        <div class="message">
            <div class="message-avatar" style="background: ${msg.color || getAvatarColor(msg.nickname)}">
                ${msg.nickname.charAt(0).toUpperCase()}
            </div>
            <div class="message-bubble">
                <div class="message-header">
                    <span class="message-nickname">${escapeHtml(msg.nickname)}</span>
                    <span class="message-time">${msg.time}</span>
                </div>
                <p class="message-content">${escapeHtml(msg.content)}</p>
            </div>
        </div>
    `).join('');

    // Scroll to bottom
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

async function sendMessage() {
    const content = elements.messageInput.value.trim();
    if (!content) return;

    elements.messageInput.value = '';
    elements.btnSend.disabled = true;

    // Try to send via Supabase
    try {
        const result = await supabase.sendMessage(state.nickname, content);
        if (result && result.length > 0) {
            console.log('✅ Message sent to Supabase');
            // Message will appear via realtime subscription
        } else {
            // Fallback: add locally
            addLocalMessage(content);
        }
    } catch (error) {
        console.error('Failed to send message:', error);
        addLocalMessage(content);
    }

    elements.btnSend.disabled = false;
}

function addLocalMessage(content) {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newMessage = {
        id: Date.now(),
        nickname: state.nickname,
        content: content,
        time: time,
        color: getAvatarColor(state.nickname)
    };

    state.messages.push(newMessage);
    renderMessages();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Auth Modal =====
function openAuthModal() {
    elements.nicknameInput.value = state.nickname;
    elements.authModal.classList.add('active');
}

function closeAuthModal() {
    elements.authModal.classList.remove('active');
}

function saveNickname() {
    const nickname = elements.nicknameInput.value.trim() || 'Anónimo';
    state.nickname = nickname;
    localStorage.setItem('nickname', nickname);
    elements.currentUser.textContent = nickname;
    closeAuthModal();
}

// ===== Social =====
function initSocial() {
    elements.socialPlaceholder.classList.add('hidden');
}

function switchSocialTab(url, button) {
    elements.socialTabs.forEach(tab => tab.classList.remove('active'));
    button.classList.add('active');
    elements.socialIframe.src = url;
    elements.socialPlaceholder.classList.add('hidden');
}

// ===== Event Listeners =====
function initEventListeners() {
    // Player controls
    if (elements.btnPlay) elements.btnPlay.addEventListener('click', togglePlay);
    if (elements.btnStop) elements.btnStop.addEventListener('click', stopPlayback);
    if (elements.volumeSlider) elements.volumeSlider.addEventListener('input', (e) => updateVolume(e.target.value));

    // Navigation
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => switchTab(item.dataset.tab));
    });

    // Chat
    if (elements.btnSend) elements.btnSend.addEventListener('click', sendMessage);
    if (elements.messageInput) elements.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    if (elements.btnAuth) elements.btnAuth.addEventListener('click', openAuthModal);

    // Modal
    if (elements.modalClose) elements.modalClose.addEventListener('click', closeAuthModal);
    if (elements.authModal) {
        const backdrop = elements.authModal.querySelector('.modal-backdrop');
        if (backdrop) backdrop.addEventListener('click', closeAuthModal);
    }
    if (elements.btnSaveNickname) elements.btnSaveNickname.addEventListener('click', saveNickname);
    if (elements.nicknameInput) elements.nicknameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveNickname();
    });

    // Social tabs
    if (elements.socialTabs) {
        elements.socialTabs.forEach(tab => {
            tab.addEventListener('click', () => switchSocialTab(tab.dataset.url, tab));
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            togglePlay();
        }
    });
}

// ===== Service Worker Registration =====
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('sw.js');
            console.log('Service Worker registered');
        } catch (error) {
            console.log('Service Worker registration failed:', error);
        }
    }
}

// ===== Sidebar Navigation =====
function initSidebar() {
    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const sidebarItems = document.querySelectorAll('.sidebar-item');

    if (!menuBtn || !sidebar || !overlay) return;

    // Open sidebar
    menuBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
        overlay.classList.add('active');
    });

    // Close sidebar on overlay click
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    });

    // Handle sidebar navigation
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;

            // Update active state in sidebar
            sidebarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Switch to tab
            switchTab(tab);

            // Close sidebar
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    });

    // Set initial active state based on current tab
    const currentTab = document.querySelector('.tab-content.active')?.id?.replace('tab-', '');
    if (currentTab) {
        sidebarItems.forEach(item => {
            if (item.dataset.tab === currentTab) {
                item.classList.add('active');
            }
        });
    }
}

// ===== Language / i18n =====
function applyTranslations() {
    const lang = state.language;
    const t = translations[lang];

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (t[key]) {
            el.textContent = t[key];
        }
    });

    // Update HTML lang attribute
    document.documentElement.lang = lang;

    // Update button active states
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
}

function initLanguageToggle() {
    const langBtns = document.querySelectorAll('.lang-btn');

    langBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const newLang = btn.dataset.lang;
            state.language = newLang;
            localStorage.setItem('language', newLang);
            applyTranslations();
        });
    });
}

// ===== Theme Toggle =====
function applyTheme() {
    const theme = state.theme;

    // Set data-theme attribute on html element
    document.documentElement.setAttribute('data-theme', theme);

    // Update button active states
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
}

function initThemeToggle() {
    const themeBtns = document.querySelectorAll('.theme-btn');

    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const newTheme = btn.dataset.theme;
            state.theme = newTheme;
            localStorage.setItem('theme', newTheme);
            applyTheme();
        });
    });
}

// ===== Initialize App =====
function init() {
    initAudioPlayer();
    initChat();
    initSocial();
    initEventListeners();
    initSidebar();
    initLanguageToggle();
    initThemeToggle();
    applyTranslations();
    applyTheme();
    registerServiceWorker();

    console.log('🎵 Radio Monarca App initialized');
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
