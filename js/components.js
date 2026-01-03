// Get base path for navigation links
function getBasePath() {
    const path = window.location.pathname;
    if (path.includes('/catalogue/') || path.includes('/livre/')) {
        return '../';
    }
    return '';
}

// Load Header Component
document.addEventListener('DOMContentLoaded', function() {
    loadHeader();
    loadFooter();
});

function loadHeader() {
    const header = document.getElementById('header');
    if (!header) return;
    
    const basePath = getBasePath();
    const currentPath = window.location.pathname;
    const isCatalogue = currentPath.includes('catalogue');
    const isLivre = currentPath.includes('livre');
    
    header.innerHTML = `
        <header class="bg-cream border-b border-gray-200">
            <nav class="container mx-auto px-6 py-6">
                <div class="flex items-center justify-between">
                    <div>
                        <a href="${basePath}index.html" class="flex items-center">
                            <img src="${basePath}images/logo-gigabole_bleu-sur-transparent.png" alt="Gigabole éditions" class="h-8 md:h-10">
                        </a>
                    </div>
                    <ul class="flex items-center space-x-6 font-sans text-sm">
                        <li>
                            <a href="${basePath}index.html" class="text-gray-600 hover:text-gray-900 transition-colors ${!isCatalogue && !isLivre ? 'font-semibold text-gray-900' : ''}">
                                Accueil
                            </a>
                        </li>
                        <li>
                            <a href="${basePath}catalogue/index.html" class="text-gray-600 hover:text-gray-900 transition-colors ${isCatalogue ? 'font-semibold text-gray-900' : ''}">
                                Catalogue
                            </a>
                        </li>
                        <li>
                            <a href="${basePath}index.html#apropos" class="text-gray-600 hover:text-gray-900 transition-colors">
                                À propos
                            </a>
                        </li>
                        <li>
                            <a href="${basePath}index.html#contact" class="text-gray-600 hover:text-gray-900 transition-colors">
                                Contact
                            </a>
                        </li>
                    </ul>
                </div>
            </nav>
        </header>
    `;
}

function loadFooter() {
    const footer = document.getElementById('footer');
    if (!footer) return;
    
    const basePath = getBasePath();
    
    footer.innerHTML = `
        <footer class="bg-cream border-t border-gray-200 mt-0">
            <div class="container mx-auto px-6 py-12">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    <div>
                        <img src="${basePath}images/monogramme-gigabole_blanc-sur-bleu.png" alt="Gigabole éditions" class="h-12 mb-3">
                        <p class="text-gray-600 text-sm leading-relaxed">
                            Éditeur indépendant dédié à la publication de livres de qualité.
                        </p>
                    </div>
                    <div>
                        <h4 class="font-sans text-xs font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                            Navigation
                        </h4>
                        <ul class="space-y-2">
                            <li><a href="${basePath}index.html" class="text-gray-600 hover:text-gray-900 text-sm transition-colors">Accueil</a></li>
                            <li><a href="${basePath}catalogue/index.html" class="text-gray-600 hover:text-gray-900 text-sm transition-colors">Catalogue</a></li>
                            <li><a href="${basePath}index.html#apropos" class="text-gray-600 hover:text-gray-900 text-sm transition-colors">À propos</a></li>
                            <li><a href="${basePath}index.html#contact" class="text-gray-600 hover:text-gray-900 text-sm transition-colors">Contact</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-sans text-xs font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                            Contact
                        </h4>
                        <ul class="space-y-2 text-sm text-gray-600">
                            <li>
                                <a href="mailto:contact@gigabole.fr" class="hover:text-gray-900 transition-colors">
                                    contact@gigabole.fr
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
                <div class="border-t border-gray-200 pt-8 text-center text-xs text-gray-500">
                    <p>&copy; ${new Date().getFullYear()} Gigabole. Tous droits réservés.</p>
                </div>
            </div>
        </footer>
    `;
}

