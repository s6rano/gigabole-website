// Charger les livres en vedette sur la page d'accueil
document.addEventListener('DOMContentLoaded', function() {
    loadFeaturedBooks();
    
    // Ré-initialiser les animations après chargement des livres
    setTimeout(() => {
        if (window.initScrollAnimations) {
            window.initScrollAnimations();
        }
    }, 100);
});

// Générer une rotation aléatoire entre -2 et +2 degrés
function getRandomRotation() {
    return (Math.random() * 4 - 2).toFixed(2);
}

// Générer un décalage vertical aléatoire pour effet asymétrique
function getRandomOffset() {
    return Math.random() * 20 - 10;
}

function loadFeaturedBooks() {
    const container = document.getElementById('featured-books');
    if (!container) return;

    // Obtenir les 3 livres les plus récents
    const featuredBooks = getRecentBooks(3);

    if (featuredBooks.length === 0) {
        container.innerHTML = '<p class="text-gray-500">Aucun livre disponible pour le moment.</p>';
        return;
    }

    container.innerHTML = featuredBooks.map((book, index) => {
        const rotation = getRandomRotation();
        const offsetY = getRandomOffset();
        const delay = index * 0.1;
        
        return `
            <div class="fade-in-up" style="transition-delay: ${delay}s; transform: translateY(${offsetY}px);">
                <a href="livre/index.html?id=${book.id}" class="group block h-full">
                    <div class="bg-white border border-gray-200 p-6 interactive-card h-full flex flex-col">
                        <div class="aspect-[3/4] bg-gray-100 mb-4 flex items-center justify-center book-cover" 
                             style="--rotation: ${rotation}deg; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                            <span class="text-gray-400 text-sm">Couverture</span>
                        </div>
                        <h3 class="font-serif text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary transition-colors">
                            ${book.title}
                        </h3>
                        <p class="font-sans text-sm text-gray-600 mb-3">${book.author}</p>
                        <p class="font-sans text-sm text-gray-500 line-clamp-3 flex-grow">${book.description}</p>
                        <div class="mt-4 pt-4 border-t border-gray-100">
                            <span class="text-xs text-gray-400">${book.year} • ${book.category}</span>
                        </div>
                    </div>
                </a>
            </div>
        `;
    }).join('');
}

