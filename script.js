/**
 * Groovy Music - نسخه کامل متصل به Cloudflare Workers
 */

document.addEventListener('DOMContentLoaded', async () => {
    // آدرس دقیق Worker شما
    const API_URL = 'https://groovy-backend.alibagherpour-sadafi.workers.dev'; 

    let musicDatabase = [];
    let artistDatabase = [];
    let currentPlaylist = [];
    let currentSongIndex = 0;
    let isPlaying = false;

    // المان‌های DOM
    const audio = document.getElementById('audio-player');
    const topChartsList = document.getElementById('top-charts-list');
    const topArtistsContainer = document.getElementById('top-artists-container');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const chartsSubtitle = document.getElementById('charts-subtitle');
    
    // المان‌های پلیر
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    const playerTitle = document.getElementById('player-title');
    const playerArtist = document.getElementById('player-artist');
    const playerCoverArt = document.getElementById('player-cover-art');
    const progressBar = document.getElementById('progress-bar');
    const currentTimeEl = document.getElementById('current-time');
    const totalDurationEl = document.getElementById('total-duration');

    // کلیدهای LocalStorage
    const RECENTS_KEY = 'groovyRecentSongs';
    const FAVOURITES_KEY = 'groovyFavouriteSongs';

    // =================================================================
    // بخش ۱: دریافت داده‌ها از API
    // =================================================================
    async function fetchData() {
        try {
            console.log("در حال اتصال به سرور...");
            const response = await fetch(`${API_URL}/all`);
            if (!response.ok) throw new Error('پاسخ سرور مناسب نبود');
            
            const data = await response.json();
            musicDatabase = data.songs || [];
            artistDatabase = data.artists || [];
            
            console.log("داده‌ها دریافت شد:", musicDatabase.length, "آهنگ");
            initializeUI();
        } catch (error) {
            console.error("خطا در اتصال به بک‌اند:", error);
            if(topChartsList) topChartsList.innerHTML = `<li class="text-red-500 p-4 text-center">خطا در اتصال به سرور. لطفاً وضعیت Worker را چک کنید.</li>`;
        }
    }

    // =================================================================
    // بخش ۲: مدیریت پخش و رندرینگ
    // =================================================================

    function renderTopCharts(songs) {
        if (!topChartsList) return;
        topChartsList.innerHTML = '';
        currentPlaylist = [...songs];

        if (songs.length === 0) {
            topChartsList.innerHTML = `<li class="text-gray-500 p-4 text-center">هیچ آهنگی یافت نشد.</li>`;
            return;
        }

        songs.forEach((song, index) => {
            const li = document.createElement('li');
            li.className = "flex items-center gap-4 p-2 rounded-lg hover:bg-gray-800 cursor-pointer song-item transition-all";
            li.setAttribute('data-index', index);
            
            li.innerHTML = `
                <span class="text-gray-500 font-medium w-4">${index + 1}</span>
                <img src="${song.cover}" class="w-10 h-10 rounded object-cover">
                <div class="flex-1 overflow-hidden">
                    <h4 class="font-semibold text-white text-sm truncate">${song.title}</h4>
                    <p class="text-xs text-gray-400 truncate">${song.artist}</p>
                </div>
                <button class="text-gray-500 hover:text-blue-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </button>
            `;

            li.addEventListener('click', (e) => {
                if(!e.target.closest('button')) {
                    currentSongIndex = index;
                    loadSong(index);
                    playSong();
                }
            });
            topChartsList.appendChild(li);
        });
    }

    function loadSong(index) {
        const song = currentPlaylist[index];
        if (!song) return;

        audio.src = song.src;
        if(playerTitle) playerTitle.textContent = song.title;
        if(playerArtist) playerArtist.textContent = song.artist;
        if(playerCoverArt) playerCoverArt.src = song.cover;
        
        // ریست کردن نوار پیشرفت
        if(progressBar) progressBar.style.width = '0%';
        if(currentTimeEl) currentTimeEl.textContent = '0:00';
    }

    function playSong() {
        isPlaying = true;
        audio.play().catch(e => console.error("خطا در پخش فایل صوتی:", e));
        if(playIcon) playIcon.classList.add('hidden');
        if(pauseIcon) pauseIcon.classList.remove('hidden');
        addSongToRecents(currentPlaylist[currentSongIndex]);
    }

    function togglePlayPause() {
        if (isPlaying) {
            isPlaying = false;
            audio.pause();
            if(playIcon) playIcon.classList.remove('hidden');
            if(pauseIcon) pauseIcon.classList.add('hidden');
        } else {
            playSong();
        }
    }

    function addSongToRecents(song) {
        let recents = JSON.parse(localStorage.getItem(RECENTS_KEY)) || [];
        recents = recents.filter(s => s.src !== song.src);
        recents.unshift(song);
        localStorage.setItem(RECENTS_KEY, JSON.stringify(recents.slice(0, 20)));
    }

    // =================================================================
    // بخش ۳: جست‌وجوی زنده
    // =================================================================
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query === '') {
                if(searchResults) searchResults.classList.add('hidden');
                return;
            }

            searchTimeout = setTimeout(async () => {
                try {
                    const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`);
                    const data = await res.json();
                    renderSearchResults(data.songs || []);
                } catch (e) { console.error("خطا در جست‌وجو:", e); }
            }, 300);
        });
    }

    function renderSearchResults(songs) {
        if (!searchResults) return;
        searchResults.innerHTML = '';
        if (songs.length === 0) {
            searchResults.innerHTML = '<div class="p-4 text-sm text-gray-400">موردی یافت نشد.</div>';
        } else {
            songs.forEach(song => {
                const div = document.createElement('div');
                div.className = "flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-700 transition-colors border-b border-gray-700/50";
                div.innerHTML = `
                    <img src="${song.cover}" class="w-8 h-8 rounded object-cover">
                    <div>
                        <div class="text-white text-sm font-bold">${song.title}</div>
                        <div class="text-xs text-gray-400">${song.artist}</div>
                    </div>
                `;
                div.addEventListener('click', () => {
                    currentPlaylist = [song];
                    currentSongIndex = 0;
                    loadSong(0);
                    playSong();
                    searchResults.classList.add('hidden');
                    searchInput.value = '';
                });
                searchResults.appendChild(div);
            });
        }
        searchResults.classList.remove('hidden');
    }

    // =================================================================
    // نهایی‌سازی و ایونت‌ها
    // =================================================================
    function initializeUI() {
        renderTopCharts(musicDatabase);
        
        // اگر در صفحه خاصی هستیم (مثلاً Recently Played)
        const pageTitle = document.title;
        if (pageTitle.includes('Recently Played')) {
            const recents = JSON.parse(localStorage.getItem(RECENTS_KEY)) || [];
            renderTopCharts(recents);
        }

        if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlayPause);
        
        // مدیریت نوار پیشرفت
        audio.addEventListener('timeupdate', () => {
            const { duration, currentTime } = audio;
            if (duration) {
                const percent = (currentTime / duration) * 100;
                if(progressBar) progressBar.style.width = `${percent}%`;
                if(currentTimeEl) currentTimeEl.textContent = formatTime(currentTime);
                if(totalDurationEl) totalDurationEl.textContent = formatTime(duration);
            }
        });

        document.addEventListener('click', (e) => {
            if (searchResults && !e.target.closest('#search-container')) {
                searchResults.classList.add('hidden');
            }
        });
    }

    function formatTime(secs) {
        const min = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${min}:${s < 10 ? '0' : ''}${s}`;
    }

    fetchData();
});