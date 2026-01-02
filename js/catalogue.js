// Gestion de la page catalogue
document.addEventListener('DOMContentLoaded', function() {
    loadAllBooks();
    setupFilters();
});

let currentCategory = 'all';

function loadAllBooks(category = 'all') {
    const grid = document.getElementById('books-grid');
    if (!grid) return;

    let booksToShow = category === 'all' ? books : getBooksByCategory(category);

    if (booksToShow.length === 0) {
        grid.innerHTML = '<p class="text-gray-500 col-span-full text-center py-12">Aucun livre dans cette catégorie.</p>';
        return;
    }

    grid.innerHTML = booksToShow.map(book => `
        <a href="../livre/index.html?id=${book.id}" class="group block">
            <div class="bg-white border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 h-full">
                <div class="aspect-[3/4] bg-gray-100 mb-4 flex items-center justify-center">
                    <span class="text-gray-400 text-sm">Couverture</span>
                </div>
                <h3 class="font-serif text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary transition-colors">
                    ${book.title}
                </h3>
                <p class="font-sans text-sm text-gray-600 mb-3">${book.author}</p>
                <p class="font-sans text-xs text-gray-500 mb-3 line-clamp-2">${book.description}</p>
                <div class="flex items-center justify-between text-xs text-gray-400">
                    <span>${book.year}</span>
                    <span>${book.category}</span>
                </div>
            </div>
        </a>
    `).join('');
}

function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Retirer la classe active de tous les boutons
            filterButtons.forEach(b => {
                b.classList.remove('active', 'border-primary', 'text-primary', 'bg-primary', 'text-white');
                b.classList.add('border-gray-300', 'bg-white');
            });
            
            // Ajouter la classe active au bouton cliqué
            this.classList.add('active', 'border-primary', 'text-primary');
            this.classList.remove('border-gray-300');
            
            // Filtrer les livres
            const category = this.getAttribute('data-category');
            currentCategory = category;
            loadAllBooks(category);
        });
    });
}

