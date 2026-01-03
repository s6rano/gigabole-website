// Scroll animations
document.addEventListener('DOMContentLoaded', function() {
    initScrollAnimations();
});

window.initScrollAnimations = function() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Ne plus observer cet élément une fois visible
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observer tous les éléments avec fade-in-up
    document.querySelectorAll('.fade-in-up').forEach(el => {
        // Ne ré-observer que les éléments non encore visibles
        if (!el.classList.contains('visible')) {
            observer.observe(el);
        }
    });
};

function initScrollAnimations() {
    window.initScrollAnimations();
}

