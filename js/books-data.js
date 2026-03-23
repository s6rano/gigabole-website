// Données des livres
const books = [
    {
        id: 'livre-1',
        title: 'Les Voyages Intérieurs',
        author: 'Marie Dubois',
        description: 'Un récit poétique qui explore les paysages intérieurs de l\'âme humaine à travers un voyage initiatique.',
        cover: 'images/covers/les-voyages-interieurs.jpg',
        year: 2024,
        category: 'Jeunesse',
        pages: 280,
        isbn: '978-2-1234-5678-9'
    },
    {
        id: 'livre-2',
        title: 'L\'Art du Silence',
        author: 'Jean-Pierre Martin',
        description: 'Une réflexion profonde sur la communication et la puissance du silence dans notre monde moderne.',
        cover: 'images/covers/l-art-du-silence.jpg',
        year: 2023,
        category: 'Pratique',
        pages: 192,
        isbn: '978-2-1234-5679-6'
    },
    {
        id: 'livre-3',
        title: 'Les Jardins Secrets',
        author: 'Sophie Laurent',
        description: 'Un roman historique qui nous plonge dans les jardins français du XVIIIe siècle et leurs secrets.',
        cover: 'images/covers/les-jardins-secrets.jpg',
        year: 2024,
        category: 'Tous publics',
        pages: 350,
        isbn: '978-2-1234-5680-2'
    },
    {
        id: 'livre-4',
        title: 'Échos du Passé',
        author: 'Antoine Rousseau',
        description: 'Une collection de nouvelles qui explorent les résonances du passé dans le présent.',
        cover: 'images/covers/echos-du-passe.jpg',
        year: 2023,
        category: 'Tous publics',
        pages: 240,
        isbn: '978-2-1234-5681-9'
    },
    {
        id: 'livre-5',
        title: 'La Cité des Rêves',
        author: 'Claire Moreau',
        description: 'Un conte philosophique sur une cité où les rêves deviennent réalité.',
        cover: 'images/covers/la-cite-des-reves.jpg',
        year: 2024,
        category: 'Jeunesse',
        pages: 210,
        isbn: '978-2-1234-5682-6'
    },
    {
        id: 'livre-6',
        title: 'Mémoires d\'un Éditeur',
        author: 'Robert Petit',
        description: 'Les souvenirs et réflexions d\'un éditeur sur quarante ans de carrière dans l\'édition.',
        cover: 'images/covers/memoires-d-un-editeur.jpg',
        year: 2023,
        category: 'Tous publics',
        pages: 320,
        isbn: '978-2-1234-5683-3'
    },
    {
        id: 'livre-7',
        title: 'La Mécanique des Fadaises',
        author: 'À compléter',
        description: 'À compléter.',
        cover: 'images/covers/mecanique-des-fadaises.jpg',
        year: 2024,
        category: 'Tous publics',
        pages: 0,
        isbn: 'À compléter'
    },
    {
        id: 'livre-8',
        title: 'Les Trois Timides',
        author: 'À compléter',
        description: 'À compléter.',
        cover: 'images/covers/les-trois-timides.jpg',
        year: 2024,
        category: 'Jeunesse',
        pages: 0,
        isbn: 'À compléter'
    },
    {
        id: 'livre-9',
        title: 'Guide de l\'Éclairage',
        author: 'À compléter',
        description: 'À compléter.',
        cover: 'images/covers/eclairage-atout-deco.jpg',
        year: 2024,
        category: 'Pratique',
        pages: 0,
        isbn: 'À compléter'
    },
    {
        id: 'livre-10',
        title: 'Galerie des Chroniques Minuscules',
        author: 'À compléter',
        description: 'À compléter.',
        cover: 'images/covers/galerie-chroniques-miniuscules.jpg',
        year: 2024,
        category: 'Tous publics',
        pages: 0,
        isbn: 'À compléter'
    }
];

// Fonction pour obtenir un livre par ID
function getBookById(id) {
    return books.find(book => book.id === id);
}

// Fonction pour obtenir les livres par catégorie
function getBooksByCategory(category) {
    return books.filter(book => book.category === category);
}

// Fonction pour obtenir les livres récents
function getRecentBooks(limit = 3) {
    return books
        .sort((a, b) => b.year - a.year)
        .slice(0, limit);
}

