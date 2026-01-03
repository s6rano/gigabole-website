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
    const isHomePage = basePath === '';
    
    header.innerHTML = `
        <nav class="border-b border-gray-200 bg-cream">
            <div class="container mx-auto px-6 py-4">
                <div class="flex items-center justify-between">
                    <a href="${basePath}index.html" class="font-serif text-2xl font-bold text-primary">
                        Gigabole
                    </a>
                    <ul class="flex items-center space-x-8">
                        <li>
                            <a href="${basePath}index.html" class="text-gray-700 hover:text-primary transition-colors">
                                Accueil
                            </a>
                        </li>
                        <li>
                            <a href="${basePath}catalogue/index.html" class="text-gray-700 hover:text-primary transition-colors">
                                Catalogue
                            </a>
                        </li>
                        <li>
                            <a href="${basePath}index.html#apropos" class="text-gray-700 hover:text-primary transition-colors">
                                À propos
                            </a>
                        </li>
                        <li>
                            <a href="${basePath}index.html#contact" class="text-gray-700 hover:text-primary transition-colors">
                                Contact
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    `;
}

function loadFooter() {
    const footer = document.getElementById('footer');
    if (!footer) return;
    
    const basePath = getBasePath();
    
    footer.innerHTML = `
        <footer class="bg-gray-900 text-white mt-0">
            <div class="container mx-auto px-6 py-16">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div>
                        <h3 class="font-serif text-2xl font-bold text-white mb-4">Gigabole</h3>
                        <p class="text-gray-300 text-sm leading-relaxed">
                            Éditeur indépendant dédié à la publication de livres de qualité.
                        </p>
                    </div>
                    <div>
                        <h4 class="font-sans text-sm font-semibold text-white mb-4 uppercase tracking-wide">
                            Navigation
                        </h4>
                        <ul class="space-y-3">
                            <li><a href="${basePath}index.html" class="text-gray-300 hover:text-primary text-sm transition-colors animated-link inline-block">Accueil</a></li>
                            <li><a href="${basePath}catalogue/index.html" class="text-gray-300 hover:text-primary text-sm transition-colors animated-link inline-block">Catalogue</a></li>
                            <li><a href="${basePath}index.html#apropos" class="text-gray-300 hover:text-primary text-sm transition-colors animated-link inline-block">À propos</a></li>
                            <li><a href="${basePath}index.html#contact" class="text-gray-300 hover:text-primary text-sm transition-colors animated-link inline-block">Contact</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-sans text-sm font-semibold text-white mb-4 uppercase tracking-wide">
                            Contact
                        </h4>
                        <ul class="space-y-3 text-sm text-gray-300">
                            <li>
                                <a href="mailto:contact@gigabole.fr" class="hover:text-primary transition-colors">
                                    contact@gigabole.fr
                                </a>
                            </li>
                            <li>Suivez-nous sur les réseaux sociaux</li>
                        </ul>
                    </div>
                </div>
                <div class="border-t border-gray-800 mt-12 pt-8 text-center text-sm text-gray-400">
                    <p>&copy; ${new Date().getFullYear()} Gigabole. Tous droits réservés.</p>
                </div>
            </div>
        </footer>
    `;
}

