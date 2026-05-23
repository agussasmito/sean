/* ========================================
   🌈 Dunia Sean - Landing Page Scripts
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    // --- Intersection Observer for scroll animations ---
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };

    const animateOnScroll = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                animateOnScroll.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe game cards
    document.querySelectorAll('.game-card').forEach(card => {
        animateOnScroll.observe(card);
    });

    // --- Tilt effect on cards (desktop only) ---
    if (window.matchMedia('(hover: hover)').matches) {
        document.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = ((y - centerY) / centerY) * -8;
                const rotateY = ((x - centerX) / centerX) * 8;

                card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-12px) scale(1.03)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    }

    // --- Interactive mascot click ---
    const mascot = document.getElementById('hero-mascot');
    const mascotEmojis = ['🧒', '😄', '🤩', '🥳', '😎', '🤗', '🫡', '🤪'];
    let mascotIndex = 0;

    if (mascot) {
        mascot.style.cursor = 'pointer';
        mascot.addEventListener('click', () => {
            mascotIndex = (mascotIndex + 1) % mascotEmojis.length;
            mascot.textContent = mascotEmojis[mascotIndex];

            // Pop animation
            mascot.style.animation = 'none';
            mascot.offsetHeight; // trigger reflow
            mascot.style.animation = '';

            // Create burst of confetti
            createConfetti(mascot);
        });
    }

    // --- Confetti burst effect ---
    function createConfetti(element) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const confettiEmojis = ['🎉', '🎊', '⭐', '✨', '💖', '🌟', '🎈', '🎀'];

        for (let i = 0; i < 10; i++) {
            const confetti = document.createElement('span');
            confetti.textContent = confettiEmojis[Math.floor(Math.random() * confettiEmojis.length)];
            confetti.style.cssText = `
                position: fixed;
                top: ${centerY}px;
                left: ${centerX}px;
                font-size: ${1 + Math.random() * 1.5}rem;
                pointer-events: none;
                z-index: 9999;
                transition: all 1s cubic-bezier(0.34, 1.56, 0.64, 1);
                opacity: 1;
            `;
            document.body.appendChild(confetti);

            // Animate outward
            requestAnimationFrame(() => {
                const angle = (i / 10) * Math.PI * 2;
                const distance = 80 + Math.random() * 100;
                confetti.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance - 60}px) rotate(${Math.random() * 360}deg) scale(0.3)`;
                confetti.style.opacity = '0';
            });

            // Remove after animation
            setTimeout(() => confetti.remove(), 1200);
        }
    }

    // --- Random floating decorations with slight parallax on scroll ---
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const scrollY = window.scrollY;
                const decorations = document.querySelector('.floating-decorations');
                if (decorations) {
                    decorations.style.transform = `translateY(${scrollY * 0.15}px)`;
                }
                ticking = false;
            });
            ticking = true;
        }
    });

    // --- Add hover sound effect feel with subtle scale on cards ---
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            const icon = card.querySelector('.card-icon');
            if (icon) {
                icon.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
            }
        });
    });

    // --- Smooth reveal of section title ---
    const sectionTitle = document.querySelector('.section-title-wrapper');
    if (sectionTitle) {
        const titleObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    titleObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        sectionTitle.style.opacity = '0';
        sectionTitle.style.transform = 'translateY(30px)';
        sectionTitle.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        titleObserver.observe(sectionTitle);
    }
});
