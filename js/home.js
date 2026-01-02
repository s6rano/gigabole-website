// Charger les livres en vedette sur la page d'accueil
document.addEventListener('DOMContentLoaded', function() {
    loadFeaturedBooks();
});

function loadFeaturedBooks() {
    const container = document.getElementById('featured-books');
    if (!container) return;

    // Obtenir les 3 livres les plus récents
    const featuredBooks = getRecentBooks(3);

    if (featuredBooks.length === 0) {
        container.innerHTML = '<p class="text-gray-500">Aucun livre disponible pour le moment.</p>';
        return;
    }

    container.innerHTML = featuredBooks.map(book => `
        <a href="livre/index.html?id=${book.id}" class="group block">
            <div class="bg-white border border-gray-200 p-6 hover:shadow-lg transition-all duration-200">
                <div class="aspect-[3/4] bg-gray-100 mb-4 flex items-center justify-center">
                    <span class="text-gray-400 text-sm">Couverture</span>
                </div>
                <h3 class="font-serif text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary transition-colors">
                    ${book.title}
                </h3>
                <p class="font-sans text-sm text-gray-600 mb-2">${book.author}</p>
                <p class="font-sans text-sm text-gray-500 line-clamp-3">${book.description}</p>
            </div>
        </a>
    `).join('');
}

