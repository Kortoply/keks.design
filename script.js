document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    initSpotlightEffect();
    fetchTelegramPosts();
});

/* =========================================
   1. Плавное появление элементов
========================================= */
function initScrollAnimations() {
    const reveals = document.querySelectorAll('.reveal');
    const navbar = document.querySelector('.navbar');

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    reveals.forEach(el => observer.observe(el));
    setTimeout(() => document.querySelectorAll('#hero .reveal, nav.reveal').forEach(el => el.classList.add('active')), 50);

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
    });
}

/* =========================================
   2. Эффект Spotlight (Слежение мыши на карточках)
========================================= */
function initSpotlightEffect() {
    const handleMouseMove = (e) => {
        const cards = document.querySelectorAll('.glass-card');

        for (const card of cards) {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        }
    };

    document.getElementById('cards-container').addEventListener('mousemove', handleMouseMove);
    document.getElementById('portfolio').addEventListener('mousemove', handleMouseMove);
}

/* =========================================
   3. Загрузка данных из posts.json (Jamstack)
========================================= */
async function fetchTelegramPosts() {
    const feedContainer = document.getElementById('tg-feed');

    try {
        // Добавляем timestamp, чтобы обойти кэширование GitHub Pages
        const response = await fetch(`./posts.json?t=${new Date().getTime()}`);

        if (!response.ok) {
            throw new Error(`Data not synced yet (Status: ${response.status})`);
        }

        const posts = await response.json();

        if (!Array.isArray(posts) || posts.length === 0) {
            throw new Error('Posts array is empty');
        }

        feedContainer.innerHTML = '';

        posts.forEach((post, index) => {
            const postDate = new Date(post.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
            const card = document.createElement('a');

            card.href = post.link;
            card.target = "_blank";
            card.className = 'glass-card case-card reveal';
            card.style.transitionDelay = `${index * 0.1}s`;

            card.innerHTML = `
                ${post.img
                    ? `<img src="${post.img}" class="case-img" alt="Keks Design Portfolio">`
                    : `<div class="case-img" style="display:flex; align-items:center; justify-content:center; background: var(--glass-bg); color: var(--text-muted); font-size: 0.9rem;">UI/UX Case</div>`
                }
                <div class="card-content">
                    <div class="case-text">${post.text}</div>
                    <div class="case-date">${postDate}</div>
                </div>
            `;
            feedContainer.appendChild(card);

            requestAnimationFrame(() => {
                setTimeout(() => card.classList.add('active'), 50);
            });
        });

    } catch (error) {
        console.warn('Portfolio Sync:', error.message);

        feedContainer.innerHTML = `
            <div class="glass-card premium-card reveal active" style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem;">
                <div class="card-content">
                    <div class="badge-glass" style="margin: 0 auto 1.5rem;">
                        <span class="badge-dot" style="background-color: var(--text-muted); box-shadow: none;"></span> Синхронизация
                    </div>
                    <h3 class="bento-subtitle text-gradient" style="font-size: 1.5rem; margin-bottom: 1rem;">Свежие работы уже в пути</h3>
                    <p class="bento-text" style="margin-bottom: 2rem; max-width: 400px; margin-left: auto; margin-right: auto;">
                        Данные портфолио обновляются. Вы можете посмотреть мои последние кейсы напрямую в Telegram-канале.
                    </p>
                    <a href="https://t.me/casebykeks" target="_blank" class="btn-primary">Перейти в канал</a>
                </div>
            </div>
        `;
    }
}