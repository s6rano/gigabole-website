// Charger les détails d'un livre
document.addEventListener('DOMContentLoaded', function() {
    loadBookDetails();
});

function loadBookDetails() {
    // Récupérer l'ID du livre depuis l'URL
    let bookId = null;
    
    // Essayer d'abord avec le query parameter
    const urlParams = new URLSearchParams(window.location.search);
    bookId = urlParams.get('id');
    
    // Sinon, essayer depuis le chemin du fichier
    if (!bookId) {
        const pathParts = window.location.pathname.split('/');
        const filename = pathParts[pathParts.length - 1];
        if (filename && filename !== 'index.html') {
            bookId = filename.replace('.html', '');
        }
    }
    
    const book = getBookById(bookId);
    
    if (!book) {
        document.querySelector('main').innerHTML = `
            <section class="container mx-auto px-6 py-16">
                <div class="text-center">
                    <h1 class="font-serif text-4xl font-bold text-primary mb-4">Livre non trouvé</h1>
                    <p class="text-gray-600 mb-8">Le livre que vous recherchez n'existe pas.</p>
                    <a href="../catalogue/index.html" class="text-primary hover:underline">Retour au catalogue</a>
                </div>
            </section>
        `;
        return;
    }
    
    // Remplir les détails du livre
    document.title = `${book.title} - Gigabole`;
    
    const bookContainer = document.getElementById('book-details');
    if (bookContainer) {
        bookContainer.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <!-- Couverture -->
                <div class="flex justify-center lg:justify-start">
                    <div class="w-full max-w-md">
                        <div class="aspect-[3/4] bg-gray-100 border border-gray-200 flex items-center justify-center">
                            <span class="text-gray-400">Couverture</span>
                        </div>
                    </div>
                </div>
                
                <!-- Informations -->
                <div class="space-y-6">
                    <div>
                        <h1 class="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
                            ${book.title}
                        </h1>
                        <p class="font-sans text-xl text-gray-700 mb-2">${book.author}</p>
                        <div class="flex items-center gap-4 text-sm text-gray-500">
                            <span>${book.year}</span>
                            <span>•</span>
                            <span>${book.category}</span>
                            <span>•</span>
                            <span>${book.pages} pages</span>
                        </div>
                    </div>
                    
                    <div class="border-t border-gray-200 pt-6">
                        <h2 class="font-serif text-2xl font-semibold text-gray-900 mb-4">Description</h2>
                        <p class="font-sans text-gray-700 leading-relaxed text-lg">
                            ${book.description}
                        </p>
                    </div>
                    
                    <div class="border-t border-gray-200 pt-6">
                        <h3 class="font-sans font-semibold text-gray-900 mb-2">Détails</h3>
                        <dl class="space-y-2 text-sm">
                            <div class="flex">
                                <dt class="font-medium text-gray-700 w-24">ISBN :</dt>
                                <dd class="text-gray-600">${book.isbn}</dd>
                            </div>
                            <div class="flex">
                                <dt class="font-medium text-gray-700 w-24">Pages :</dt>
                                <dd class="text-gray-600">${book.pages}</dd>
                            </div>
                            <div class="flex">
                                <dt class="font-medium text-gray-700 w-24">Catégorie :</dt>
                                <dd class="text-gray-600">${book.category}</dd>
                            </div>
                            <div class="flex">
                                <dt class="font-medium text-gray-700 w-24">Année :</dt>
                                <dd class="text-gray-600">${book.year}</dd>
                            </div>
                        </dl>
                    </div>
                    
                    <div class="pt-4">
                        <a href="../catalogue/index.html" class="inline-block text-primary hover:underline font-sans">
                            ← Retour au catalogue
                        </a>
                    </div>
                    
                    <!-- Navigation vers autres livres -->
                    <div class="border-t border-gray-200 pt-6 mt-6">
                        <div class="flex flex-wrap gap-4 text-sm">
                            <span class="text-gray-500">Catégorie:</span>
                            <a href="../catalogue/index.html" class="text-primary hover:underline">${book.category}</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

