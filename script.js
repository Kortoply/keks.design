document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    initTypewriter();
    fetchTelegramPosts();
    initModal();
});

/* =========================================
   ГЛОБАЛЬНЫЙ ЗАПРЕТ ЗУМА СТРАНИЦЫ (iOS / Android)
========================================= */
document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) {
        const inModalTrack = e.target.closest('#modal-slider-track');
        const inLightboxTrack = e.target.closest('#lightbox-track');
        if (!inModalTrack && !inLightboxTrack) {
            e.preventDefault();
        }
    }
}, { passive: false });


/* =========================================
   Анимация скролла и шапки
========================================= */
function initScrollAnimations() {
    const reveals = document.querySelectorAll('.reveal');
    const navbarPill = document.getElementById('navbar');
    const appWrapper = document.getElementById('app-wrapper');

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    reveals.forEach(el => observer.observe(el));

    setTimeout(() => {
        document.querySelectorAll('#hero .reveal, header.reveal').forEach(el => el.classList.add('active'));
    }, 50);

    let ticking = false;

    (appWrapper || window).addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrollTop = appWrapper ? appWrapper.scrollTop : window.scrollY;
                if (scrollTop > 50) navbarPill.classList.add('scrolled');
                else navbarPill.classList.remove('scrolled');
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}

/* =========================================
   Эффект Печатной Машинки
========================================= */
function initTypewriter() {
    const words = ["премиальный UI.", "Web3-системы.", "чистый фронтенд.", "сложные дашборды."];
    let i = 0;
    let isDeleting = false;
    let text = '';
    const typeWriterElement = document.getElementById('typewriter');

    function type() {
        const currentWord = words[i];

        if (isDeleting) {
            text = currentWord.substring(0, text.length - 1);
        } else {
            text = currentWord.substring(0, text.length + 1);
        }

        typeWriterElement.innerText = text;

        let typeSpeed = isDeleting ? 40 : 100;

        if (!isDeleting && text === currentWord) {
            typeSpeed = 2500;
            isDeleting = true;
        } else if (isDeleting && text === '') {
            isDeleting = false;
            i = (i + 1) % words.length;
            typeSpeed = 500;
        }

        setTimeout(type, typeSpeed);
    }

    type();
}

/* =========================================
   Загрузка Постов
========================================= */
let allPosts = [];
let displayedCount = 0;
const POSTS_PER_PAGE = 6;

async function fetchTelegramPosts() {
    const feedContainer = document.getElementById('tg-feed');
    const statusContainer = document.getElementById('tg-status-container');
    const statusText = document.getElementById('tg-status-text');
    const spinner = document.querySelector('.loader-spinner');

    try {
        const response = await fetch(`/posts.json?t=${new Date().getTime()}`);
        if (!response.ok) throw new Error('Ошибка загрузки JSON');

        allPosts = await response.json();

        if (allPosts && allPosts.length > 0) {
            statusContainer.style.display = 'none';
            feedContainer.style.display = 'grid';
            feedContainer.innerHTML = '';
            renderNextBatch();
        } else {
            throw new Error('Кейсов пока нет');
        }
    } catch (error) {
        console.error("Не удалось загрузить посты:", error);
        if (spinner) spinner.style.display = 'none';
        statusText.innerHTML = 'Кейсы временно недоступны.<br>Посмотрите их в нашем <a href="https://t.me/casebykeks" target="_blank" style="color: var(--text-main); text-decoration: underline;">Telegram-канале ↗</a>.';
    }
}

function renderNextBatch() {
    const feedContainer = document.getElementById('tg-feed');
    const loadMoreBtn = document.getElementById('load-more-container');
    const nextBatch = allPosts.slice(displayedCount, displayedCount + POSTS_PER_PAGE);

    nextBatch.forEach((post, index) => {
        const card = document.createElement('a');
        card.href = "#";
        card.className = `solid-card case-card reveal ${post.img ? '' : 'no-image'}`;

        const dateOptions = { day: 'numeric', month: 'short', year: 'numeric' };
        const formattedDate = new Date(post.date).toLocaleDateString('ru-RU', dateOptions);

        const tagsHTML = post.tags && post.tags.length > 0
            ? `<div class="case-tags">${post.tags.map(t => `<span class="case-tag">${t}</span>`).join('')}</div>`
            : '';

        card.innerHTML = `
            ${post.img ? `
            <div class="case-img-container">
                <div class="skeleton-loader"></div>
                <img class="case-img" alt="Case Image">
            </div>` : ''}
            <div class="card-content">
                <div class="case-text"></div>
                ${tagsHTML}
                <div class="case-date">${formattedDate}</div>
            </div>
        `;

        card.querySelector('.case-text').innerText = post.text || 'Без описания';

        card.addEventListener('click', (e) => {
            e.preventDefault();
            openModal(post);
        });

        feedContainer.appendChild(card);

        if (post.img) {
            const imgElement = card.querySelector('.case-img');
            const skeleton = card.querySelector('.skeleton-loader');
            const imgContainer = card.querySelector('.case-img-container');

            const tempImg = new Image();
            tempImg.src = post.img;

            tempImg.onload = () => {
                imgElement.src = tempImg.src;
                imgElement.classList.add('loaded');
                setTimeout(() => { if(skeleton) skeleton.remove(); }, 600);
            };

            tempImg.onerror = () => {
                if(imgContainer) imgContainer.remove();
                card.classList.add('no-image');
            };
        }

        setTimeout(() => card.classList.add('active'), 100 * index);
    });

    displayedCount += nextBatch.length;
    loadMoreBtn.style.display = displayedCount >= allPosts.length ? 'none' : 'flex';
}

if(document.getElementById('load-more-btn')) {
    document.getElementById('load-more-btn').addEventListener('click', renderNextBatch);
}

/* =========================================
   Логика Модального Окна и Слайдера
========================================= */
let currentSlide = 0;
let slideImages = [];

function initModal() {
    const modal = document.getElementById('case-modal');
    const closeBtn = document.getElementById('modal-close');
    const lightbox = document.getElementById('lightbox-overlay');
    const lightboxCloseBtn = document.getElementById('lightbox-close');

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    lightboxCloseBtn.addEventListener('click', closeLightbox);

    lightbox.addEventListener('click', (e) => {
        // Закрываем, только если кликнули по самой подложке (мимо фото и мимо дока)
        if (e.target === lightbox || e.target.classList.contains('lightbox-track')) {
            closeLightbox();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (lightbox.classList.contains('active')) {
                closeLightbox();
            } else if (modal.classList.contains('active')) {
                closeModal();
            }
        }
    });

    document.getElementById('slider-prev').addEventListener('click', () => changeSlide(-1));
    document.getElementById('slider-next').addEventListener('click', () => changeSlide(1));
}

function openModal(post) {
    const modal = document.getElementById('case-modal');
    const modalContent = document.querySelector('.premium-split-modal');
    const sliderContainer = document.getElementById('modal-slider-container');
    const modalBodyContainer = document.getElementById('modal-body-container');
    const track = document.getElementById('modal-slider-track');
    const dotsContainer = document.getElementById('slider-dots');
    const prevBtn = document.getElementById('slider-prev');
    const nextBtn = document.getElementById('slider-next');

    document.getElementById('modal-text').innerText = post.text || 'Без описания';

    const modalTags = document.getElementById('modal-tags');
    if (post.tags && post.tags.length > 0) {
        modalTags.innerHTML = post.tags.map(t => `<span class="case-tag">${t}</span>`).join('');
        modalTags.style.display = 'flex';
    } else {
        modalTags.style.display = 'none';
    }

    const dateOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    document.getElementById('modal-date').innerText = new Date(post.date).toLocaleDateString('ru-RU', dateOptions);

    track.innerHTML = '';
    dotsContainer.innerHTML = '';
    currentSlide = 0;
    track.style.transform = `translateX(0%)`;

    slideImages = post.images && post.images.length > 0 ? post.images : (post.img ? [post.img] : []);

    if (slideImages.length === 0) {
        modalContent.classList.add('no-media');
        sliderContainer.style.display = 'none';
        modalBodyContainer.classList.add('no-image');
    } else {
        modalContent.classList.remove('no-media');

        slideImages.forEach((imgSrc, index) => {
            const img = document.createElement('img');
            img.src = imgSrc;
            // Установка атрибута для надежности во всех браузерах
            img.setAttribute('draggable', 'false');
            img.ondragstart = () => false;

            track.appendChild(img);

            if (slideImages.length > 1) {
                const dot = document.createElement('div');
                dot.className = `dot ${index === 0 ? 'active' : ''}`;
                dot.addEventListener('click', () => goToSlide(index));
                dotsContainer.appendChild(dot);
            }
        });

        if (slideImages.length > 1) {
            prevBtn.classList.remove('hidden');
            nextBtn.classList.remove('hidden');
        } else {
            prevBtn.classList.add('hidden');
            nextBtn.classList.add('hidden');
        }

        sliderContainer.style.display = 'flex';
        document.getElementById('canvas-controls').style.display = 'flex';
        resetCanvas();
        modalBodyContainer.classList.remove('no-image');
    }

    const scrollableArea = document.querySelector('.modal-scrollable');
    if (scrollableArea) scrollableArea.scrollTop = 0;

    modal.classList.add('active');

    const appWrapper = document.getElementById('app-wrapper');
    if(appWrapper) appWrapper.classList.add('no-scroll');
}

function closeModal() {
    const modal = document.getElementById('case-modal');
    modal.classList.remove('active');

    const appWrapper = document.getElementById('app-wrapper');
    if(appWrapper) appWrapper.classList.remove('no-scroll');
}

function openLightbox(src) {
    const lightbox = document.getElementById('lightbox-overlay');
    const lightboxImg = document.getElementById('lightbox-img');

    lightboxImg.src = src;
    resetLbCanvas();
    lightbox.classList.add('active');
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox-overlay');
    lightbox.classList.remove('active');
}

function changeSlide(direction) {
    let newIndex = currentSlide + direction;
    if (newIndex < 0) newIndex = slideImages.length - 1;
    if (newIndex >= slideImages.length) newIndex = 0;
    goToSlide(newIndex);
}

function goToSlide(index) {
    resetCanvas();
    currentSlide = index;
    const track = document.getElementById('modal-slider-track');
    track.style.transform = `translateX(-${currentSlide * 100}%)`;

    const dots = document.querySelectorAll('.slider-dots .dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlide);
    });
}


/* =========================================
   КАНВАС: Зум и Панорамирование (МОДАЛКА)
========================================= */
let currentScale = 1;
let currentPanX = 0;
let currentPanY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let initialPinchDistance = null;
let initialPinchScale = 1;

function resetCanvas() {
    currentScale = 1;
    currentPanX = 0;
    currentPanY = 0;
    initialPinchDistance = null;
    const zoomSlider = document.getElementById('zoom-slider');
    if (zoomSlider) zoomSlider.value = 1;
    applyTransformToActiveImage(true);
}

function applyTransformToActiveImage(smooth = false) {
    const track = document.getElementById('modal-slider-track');
    if (!track) return;
    const images = track.querySelectorAll('img');
    const activeImg = images[currentSlide];

    if (activeImg) {
        activeImg.style.transition = smooth ? 'transform 0.2s ease-out' : 'none';
        activeImg.style.transform = `translate(${currentPanX}px, ${currentPanY}px) scale(${currentScale})`;
    }

    images.forEach((img, idx) => {
        if (idx !== currentSlide) {
            img.style.transform = 'translate(0px, 0px) scale(1)';
        }
    });
}

function updateZoom(newScale) {
    currentScale = Math.max(0.5, Math.min(newScale, 4));
    const zoomSlider = document.getElementById('zoom-slider');
    if (zoomSlider) zoomSlider.value = currentScale;
    applyTransformToActiveImage(false);
}

/* =========================================
   КАНВАС: Зум и Панорамирование (ЛАЙТБОКС)
========================================= */
let lbScale = 1;
let lbPanX = 0;
let lbPanY = 0;
let lbIsDragging = false;
let lbDragStartX = 0;
let lbDragStartY = 0;
let lbInitialPinchDistance = null;
let lbInitialPinchScale = 1;

function resetLbCanvas() {
    lbScale = 1;
    lbPanX = 0;
    lbPanY = 0;
    lbInitialPinchDistance = null;
    const slider = document.getElementById('lb-zoom-slider');
    if (slider) slider.value = 1;
    applyLbTransform(true);
}

function applyLbTransform(smooth = false) {
    const img = document.getElementById('lightbox-img');
    if (!img) return;
    img.style.transition = smooth ? 'transform 0.2s ease-out' : 'none';
    img.style.transform = `translate(${lbPanX}px, ${lbPanY}px) scale(${lbScale})`;
}

function updateLbZoom(newScale) {
    lbScale = Math.max(0.5, Math.min(newScale, 5));
    const slider = document.getElementById('lb-zoom-slider');
    if (slider) slider.value = lbScale;
    applyLbTransform(false);
}

function getPinchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

/* =========================================
   ИНИЦИАЛИЗАЦИЯ ИВЕНТОВ КАНВАСА
========================================= */
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. ПРИВЯЗКИ ДЛЯ МОДАЛКИ ---
    const track = document.getElementById('modal-slider-track');
    const zoomSlider = document.getElementById('zoom-slider');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const resetBtn = document.getElementById('reset-btn');

    if (track) {
        if (zoomSlider) {
            zoomSlider.addEventListener('input', (e) => {
                currentScale = parseFloat(e.target.value);
                applyTransformToActiveImage(true);
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation(); resetCanvas();
            });
        }

        track.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.1 : -0.1;
            updateZoom(currentScale + delta);
        });

        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                const activeImgSrc = slideImages[currentSlide];
                if (activeImgSrc) openLightbox(activeImgSrc);
            });
        }

        // Мышь
        track.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'IMG') {
                e.preventDefault(); // КРИТИЧНО ДЛЯ FIREFOX (отключает системный drag)
                isDragging = true;
                dragStartX = e.clientX - currentPanX;
                dragStartY = e.clientY - currentPanY;
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            currentPanX = e.clientX - dragStartX;
            currentPanY = e.clientY - dragStartY;
            applyTransformToActiveImage(false);
        });

        window.addEventListener('mouseup', () => isDragging = false);

        // Тач (Мобилка)
        track.addEventListener('touchstart', (e) => {
            if (e.target.tagName === 'IMG') {
                if (e.touches.length === 1) {
                    isDragging = true;
                    dragStartX = e.touches[0].clientX - currentPanX;
                    dragStartY = e.touches[0].clientY - currentPanY;
                } else if (e.touches.length === 2) {
                    isDragging = false;
                    initialPinchDistance = getPinchDistance(e.touches);
                    initialPinchScale = currentScale;
                }
            }
        }, { passive: false });

        track.addEventListener('touchmove', (e) => {
            if (e.target.tagName !== 'IMG') return;

            if (isDragging && e.touches.length === 1) {
                e.preventDefault();
                currentPanX = e.touches[0].clientX - dragStartX;
                currentPanY = e.touches[0].clientY - dragStartY;
                applyTransformToActiveImage(false);
            } else if (e.touches.length === 2) {
                e.preventDefault();
                if (initialPinchDistance) {
                    const currentDistance = getPinchDistance(e.touches);
                    const scaleChange = currentDistance / initialPinchDistance;
                    updateZoom(initialPinchScale * scaleChange);
                }
            }
        }, { passive: false });

        track.addEventListener('touchend', (e) => {
            if (e.touches.length < 2) initialPinchDistance = null;
            if (e.touches.length === 0) {
                isDragging = false;
            } else if (e.touches.length === 1) {
                isDragging = true;
                dragStartX = e.touches[0].clientX - currentPanX;
                dragStartY = e.touches[0].clientY - currentPanY;
            }
        });
    }

    // --- 2. ПРИВЯЗКИ ДЛЯ ЛАЙТБОКСА (Полноэкранный режим) ---
    const lbTrack = document.getElementById('lightbox-track');
    const lbZoomSlider = document.getElementById('lb-zoom-slider');
    const lbResetBtn = document.getElementById('lb-reset-btn');

    if (lbTrack) {
        if (lbZoomSlider) {
            lbZoomSlider.addEventListener('input', (e) => {
                lbScale = parseFloat(e.target.value);
                applyLbTransform(true);
            });
        }

        if (lbResetBtn) {
            lbResetBtn.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation(); resetLbCanvas();
            });
        }

        lbTrack.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.1 : -0.1;
            updateLbZoom(lbScale + delta);
        });

        // Мышь (Лайтбокс)
        lbTrack.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'IMG') {
                e.preventDefault(); // КРИТИЧНО ДЛЯ FIREFOX (отключает системный drag)
                lbIsDragging = true;
                lbDragStartX = e.clientX - lbPanX;
                lbDragStartY = e.clientY - lbPanY;
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!lbIsDragging) return;
            lbPanX = e.clientX - lbDragStartX;
            lbPanY = e.clientY - lbDragStartY;
            applyLbTransform(false);
        });

        window.addEventListener('mouseup', () => lbIsDragging = false);

        // Тач (Мобилка Лайтбокс)
        lbTrack.addEventListener('touchstart', (e) => {
            if (e.target.tagName === 'IMG') {
                if (e.touches.length === 1) {
                    lbIsDragging = true;
                    lbDragStartX = e.touches[0].clientX - lbPanX;
                    lbDragStartY = e.touches[0].clientY - lbPanY;
                } else if (e.touches.length === 2) {
                    lbIsDragging = false;
                    lbInitialPinchDistance = getPinchDistance(e.touches);
                    lbInitialPinchScale = lbScale;
                }
            }
        }, { passive: false });

        lbTrack.addEventListener('touchmove', (e) => {
            if (e.target.tagName !== 'IMG') return;

            if (lbIsDragging && e.touches.length === 1) {
                e.preventDefault();
                lbPanX = e.touches[0].clientX - lbDragStartX;
                lbPanY = e.touches[0].clientY - lbDragStartY;
                applyLbTransform(false);
            } else if (e.touches.length === 2) {
                e.preventDefault();
                if (lbInitialPinchDistance) {
                    const currentDistance = getPinchDistance(e.touches);
                    const scaleChange = currentDistance / lbInitialPinchDistance;
                    updateLbZoom(lbInitialPinchScale * scaleChange);
                }
            }
        }, { passive: false });

        lbTrack.addEventListener('touchend', (e) => {
            if (e.touches.length < 2) lbInitialPinchDistance = null;
            if (e.touches.length === 0) {
                lbIsDragging = false;
            } else if (e.touches.length === 1) {
                lbIsDragging = true;
                lbDragStartX = e.touches[0].clientX - lbPanX;
                lbDragStartY = e.touches[0].clientY - lbPanY;
            }
        });
    }
});