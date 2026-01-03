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

    container.innerHTML = featuredBooks.map((book, index) => {
        return `
            <article class="border border-gray-200 hover:border-gray-300 transition-colors">
                <a href="livre/index.html?id=${book.id}" class="block p-6 h-full flex flex-col group">
                    <div class="aspect-[3/4] bg-gray-50 mb-4 flex items-center justify-center">
                        <span class="text-gray-400 text-sm">Couverture</span>
                    </div>
                    <h3 class="font-serif text-lg font-semibold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors">
                        ${book.title}
                    </h3>
                    <p class="font-sans text-sm text-gray-600 mb-3">${book.author}</p>
                    <p class="font-sans text-sm text-gray-500 line-clamp-3 flex-grow mb-4">${book.description}</p>
                    <div class="pt-4 border-t border-gray-100">
                        <span class="text-xs text-gray-400">${book.year} • ${book.category}</span>
                    </div>
                </a>
            </article>
        `;
    }).join('');
}

