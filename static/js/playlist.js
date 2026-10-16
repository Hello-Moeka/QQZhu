/**
 * QQZhu 歌单页交互逻辑
 */
(function () {
    const cardsRoot = document.getElementById('cards-root');
    const songsDataEl = document.getElementById('songs-json');
    const languagesDataEl = document.getElementById('languages-json');
    if (!cardsRoot || !songsDataEl) return;

    let allSongs = [];
    let languageOrder = [];
    const LAYOUT_STORAGE_KEY = 'qqzhu-playlist-layout';

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function buildCardElement(song) {
        const card = document.createElement('div');
        card.className = 'glass-card song-card';
        card.dataset.songName = song.name;
        card.dataset.artist = song.artist;
        card.dataset.language = song.language;
        card.dataset.genre = song.genre;

        const playLink = song.url && song.url !== '-'
            ? `<a href="${escapeHtml(song.url)}" target="_blank" rel="noopener"><i class="fas fa-external-link-alt"></i> 播放</a>`
            : '';

        card.innerHTML = `
            <h4>${escapeHtml(song.name)}</h4>
            <p class="song-card__meta">${escapeHtml(song.artist)} · ${escapeHtml(song.genre)}</p>
            <div class="song-actions">
                <button type="button" class="glass-btn glass-btn-ghost glass-btn-preview" data-name="${escapeHtml(song.name)}" data-artist="${escapeHtml(song.artist)}"><i class="fas fa-headphones"></i> 试听</button>
                ${playLink}
            </div>`;
        return card;
    }

    function getCategorySection(language) {
        let section = cardsRoot.querySelector(`.glass-category[data-lang="${CSS.escape(language)}"]`);
        if (section) return section;

        section = document.createElement('section');
        section.className = 'glass-category';
        section.dataset.lang = language;
        section.innerHTML = `<div class="glass-category__head"><span class="glass-category__label">${escapeHtml(language)}</span><span class="glass-category__count"></span></div><div class="glass-grid"></div>`;
        cardsRoot.appendChild(section);
        return section;
    }

    function renderAllCards(songs) {
        cardsRoot.innerHTML = '';
        if (!songs.length) return 0;

        const grouped = new Map();
        for (const song of songs) {
            if (!grouped.has(song.language)) grouped.set(song.language, []);
            grouped.get(song.language).push(song);
        }

        const order = languageOrder.length ? languageOrder : [...grouped.keys()];
        const seen = new Set();

        for (const lang of order) {
            const list = grouped.get(lang);
            if (!list || !list.length) continue;
            seen.add(lang);
            const section = getCategorySection(lang);
            const grid = section.querySelector('.glass-grid');
            section.querySelector('.glass-category__count').textContent = `${list.length} 首`;
            const fragment = document.createDocumentFragment();
            for (const song of list) fragment.appendChild(buildCardElement(song));
            grid.appendChild(fragment);
        }

        for (const [lang, list] of grouped.entries()) {
            if (seen.has(lang) || !list.length) continue;
            const section = getCategorySection(lang);
            const grid = section.querySelector('.glass-grid');
            section.querySelector('.glass-category__count').textContent = `${list.length} 首`;
            const fragment = document.createDocumentFragment();
            for (const song of list) fragment.appendChild(buildCardElement(song));
            grid.appendChild(fragment);
        }

        return songs.length;
    }

    function getFilterValues() {
        return {
            nameFilter: document.getElementById('filter-name').value.toLowerCase(),
            artistFilter: document.getElementById('filter-artist').value.toLowerCase(),
            languageFilter: document.getElementById('filter-language').value.toLowerCase(),
            genreFilter: document.getElementById('filter-genre').value.toLowerCase(),
        };
    }

    function hasActiveFilters(filters) {
        return !!(filters.nameFilter || filters.artistFilter || filters.languageFilter || filters.genreFilter);
    }

    function songMatchesFilters(song, nameFilter, artistFilter, languageFilter, genreFilter) {
        const songName = (song.name || '').toLowerCase();
        const artist = (song.artist || '').toLowerCase();
        const language = (song.language || '').toLowerCase();
        const genre = (song.genre || '').toLowerCase();
        return songName.includes(nameFilter)
            && artist.includes(artistFilter)
            && (!languageFilter || language.includes(languageFilter))
            && (!genreFilter || genre.includes(genreFilter));
    }

    function songMatchesRow(row, nameFilter, artistFilter, languageFilter, genreFilter) {
        const songName = (row.dataset.songName || '').toLowerCase();
        const artist = (row.dataset.artist || '').toLowerCase();
        const language = (row.dataset.language || '').toLowerCase();
        const genre = (row.dataset.genre || '').toLowerCase();
        return songName.includes(nameFilter)
            && artist.includes(artistFilter)
            && (!languageFilter || language.includes(languageFilter))
            && (!genreFilter || genre.includes(genreFilter));
    }

    try {
        allSongs = JSON.parse(songsDataEl.textContent || '[]');
    } catch (e) {
        allSongs = [];
    }
    try {
        languageOrder = JSON.parse(languagesDataEl?.textContent || '[]');
    } catch (e) {
        languageOrder = [];
    }

    const songListContainer = document.querySelector('.glass-playlist');
    const songListTableHost = document.getElementById('song-list-table-host');
    const toggleLayoutBtn = document.getElementById('toggle-layout');
    const emptyStateEl = document.getElementById('filter-empty');
    let listLayoutMounted = false;

    function updateEmptyState(visibleCount, hasFilter) {
        if (!emptyStateEl) return;
        emptyStateEl.classList.toggle('hidden', !(hasFilter && visibleCount === 0));
    }

    function updateLayoutButton(mode) {
        if (!toggleLayoutBtn) return;
        if (mode === 'list') {
            toggleLayoutBtn.innerHTML = '<i class="fas fa-th-large"></i><span class="glass-btn-layout__text"> 切换为卡片布局</span>';
            toggleLayoutBtn.title = '切换为卡片布局';
        } else {
            toggleLayoutBtn.innerHTML = '<i class="fas fa-list"></i><span class="glass-btn-layout__text"> 切换为列表布局</span>';
            toggleLayoutBtn.title = '切换为列表布局';
        }
    }

    function saveLayoutPreference(mode) {
        try {
            localStorage.setItem(LAYOUT_STORAGE_KEY, mode);
        } catch (e) {
            /* ignore */
        }
    }

    function readLayoutPreference() {
        try {
            return localStorage.getItem(LAYOUT_STORAGE_KEY) === 'list' ? 'list' : 'cards';
        } catch (e) {
            return 'cards';
        }
    }

    function setLayoutMode(mode) {
        if (!songListContainer) return;
        if (mode === 'list') {
            ensureListLayoutMounted();
            songListContainer.classList.remove('hide-table');
            songListContainer.classList.add('hide-cards');
        } else {
            songListContainer.classList.remove('hide-cards');
            songListContainer.classList.add('hide-table');
        }
        updateLayoutButton(mode);
        saveLayoutPreference(mode);
    }

    function ensureListLayoutMounted() {
        if (listLayoutMounted) return;
        const template = document.getElementById('song-list-template');
        if (!template || !template.content.firstElementChild) return;
        songListTableHost.appendChild(template.content.firstElementChild.cloneNode(true));
        listLayoutMounted = true;
    }

    function copySongName(element) {
        const songName = element.dataset.songName;
        if (!songName) return;
        const text = '点歌 ' + songName;
        const done = () => window.GlassUI?.showToast(`已复制「${text}」，快去弹幕点歌吧~`);
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(done).catch(() => window.GlassUI?.showToast('复制失败，请手动复制。'));
        } else {
            const input = document.createElement('input');
            input.value = text;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            done();
        }
    }

    async function playPreview(btn) {
        const songName = btn.dataset.name;
        const songArtist = btn.dataset.artist || '';
        if (!songName) return;

        const originalHtml = btn.innerHTML;
        btn.classList.add('loading');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 搜索中';

        try {
            const res = await fetch(`/api/netease-preview?name=${encodeURIComponent(songName)}&artist=${encodeURIComponent(songArtist)}`);
            const data = await res.json();
            btn.classList.remove('loading');
            btn.innerHTML = originalHtml;

            if (data.ok) {
                playerTitle.textContent = data.name;
                playerArtist.textContent = data.artist;
                playerCover.src = data.picUrl || '/static/singer.jpg';
                playStartOffset = 0;
                audioElement.src = data.audio_url;
                audioPlayerBar.classList.remove('hidden');
                audioElement.play().catch(() => window.GlassUI?.showToast('该歌曲在网易云暂无试听资源或受版权保护。'));
            } else {
                window.GlassUI?.showToast(data.message || '未找到匹配的试听音频');
            }
        } catch (e) {
            btn.classList.remove('loading');
            btn.innerHTML = originalHtml;
            window.GlassUI?.showToast('网络异常，获取试听失败');
        }
    }

    songListContainer?.addEventListener('click', (event) => {
        const previewBtn = event.target.closest('.glass-btn-preview');
        if (previewBtn) {
            event.stopPropagation();
            playPreview(previewBtn);
            return;
        }
        const card = event.target.closest('.song-card');
        if (card) {
            copySongName(card);
            return;
        }
        const row = event.target.closest('.glass-table tbody tr');
        if (row) copySongName(row);
    });

    toggleLayoutBtn?.addEventListener('click', () => {
        const nextMode = songListContainer.classList.contains('hide-table') ? 'list' : 'cards';
        setLayoutMode(nextMode);
        filterSongs();
    });

    let filterTicking = false;
    function filterSongs() {
        if (filterTicking) return;
        filterTicking = true;
        requestAnimationFrame(() => {
            filterTicking = false;
            const filters = getFilterValues();
            const hasFilter = hasActiveFilters(filters);

            if (songListContainer.classList.contains('hide-cards')) {
                let visibleCount = 0;
                document.querySelectorAll('.glass-table tbody tr').forEach((row) => {
                    const visible = songMatchesRow(
                        row,
                        filters.nameFilter,
                        filters.artistFilter,
                        filters.languageFilter,
                        filters.genreFilter
                    );
                    row.style.display = visible ? 'table-row' : 'none';
                    if (visible) visibleCount += 1;
                });
                updateEmptyState(visibleCount, hasFilter);
                return;
            }

            const songsToShow = hasFilter
                ? allSongs.filter((s) => songMatchesFilters(
                    s,
                    filters.nameFilter,
                    filters.artistFilter,
                    filters.languageFilter,
                    filters.genreFilter
                ))
                : allSongs;
            const visibleCount = renderAllCards(songsToShow);
            updateEmptyState(visibleCount, hasFilter);
        });
    }

    setLayoutMode(readLayoutPreference());
    filterSongs();

    ['filter-name', 'filter-artist'].forEach((id) => {
        document.getElementById(id)?.addEventListener('input', filterSongs);
    });
    ['filter-language', 'filter-genre'].forEach((id) => {
        document.getElementById(id)?.addEventListener('change', filterSongs);
    });

    const audioPlayerBar = document.getElementById('audio-player-bar');
    const audioElement = document.getElementById('audio-element');
    const playerCoverWrap = document.getElementById('player-cover-wrap');
    const playerCover = document.getElementById('player-cover');
    const playerTitle = document.getElementById('player-title');
    const playerArtist = document.getElementById('player-artist');
    const playerBtnPlay = document.getElementById('player-btn-play');
    const playerProgressBar = document.getElementById('player-progress-bar');
    const playerTimeCurrent = document.getElementById('player-time-current');
    const playerTimeDuration = document.getElementById('player-time-duration');
    const playerVolumeBar = document.getElementById('player-volume-bar');
    const playerBtnClose = document.getElementById('player-btn-close');

    let playStartOffset = 0;
    const MAX_PREVIEW = 30;

    function formatTime(sec) {
        if (isNaN(sec) || sec < 0) return '00:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }

    playerBtnPlay?.addEventListener('click', () => {
        if (audioElement.paused) audioElement.play();
        else audioElement.pause();
    });

    audioElement?.addEventListener('play', () => {
        playerBtnPlay.innerHTML = '<i class="fas fa-pause"></i>';
        playerCoverWrap.classList.add('playing');
    });

    audioElement?.addEventListener('pause', () => {
        playerBtnPlay.innerHTML = '<i class="fas fa-play"></i>';
        playerCoverWrap.classList.remove('playing');
    });

    audioElement?.addEventListener('timeupdate', () => {
        if (!audioElement.duration) return;
        const played = audioElement.currentTime - playStartOffset;
        const limit = Math.min(audioElement.duration, MAX_PREVIEW);
        if (played >= MAX_PREVIEW || audioElement.currentTime >= playStartOffset + MAX_PREVIEW) {
            audioElement.pause();
            audioElement.currentTime = playStartOffset;
            playerProgressBar.value = 100;
            playerTimeCurrent.textContent = formatTime(limit);
            window.GlassUI?.showToast('30秒试听已结束，快去直播间点歌吧~');
            return;
        }
        const rel = Math.max(0, Math.min(played, limit));
        playerProgressBar.value = (rel / limit) * 100;
        playerTimeCurrent.textContent = formatTime(rel);
        playerTimeDuration.textContent = formatTime(limit);
    });

    audioElement?.addEventListener('error', () => {
        window.GlassUI?.showToast('试听音频播放失败，可能因网易云版权保护或下架限制。');
    });

    playerProgressBar?.addEventListener('input', function () {
        if (!audioElement.duration) return;
        const limit = Math.min(audioElement.duration, MAX_PREVIEW);
        audioElement.currentTime = (this.value / 100) * limit;
        playStartOffset = 0;
    });

    playerVolumeBar?.addEventListener('input', function () {
        audioElement.volume = this.value / 100;
    });

    playerBtnClose?.addEventListener('click', () => {
        audioElement.pause();
        audioPlayerBar.classList.add('hidden');
    });
})();
