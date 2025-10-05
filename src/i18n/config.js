import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Translation resources
const resources = {
  en: {
    translation: {
      // Common
      welcome: 'Welcome',
      login: 'Login',
      logout: 'Logout',
      register: 'Register',
      email: 'Email',
      password: 'Password',
      username: 'Username',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      search: 'Search',
      filter: 'Filter',
      loading: 'Loading...',
      
      // Navigation
      home: 'Home',
      events: 'Events',
      myTickets: 'My Tickets',
      profile: 'Profile',
      scanner: 'Scanner',
      
      // Auth
      loginTitle: 'Event Ticketing System',
      loginSubtitle: 'Your gateway to amazing events',
      welcomeBack: 'Welcome Back',
      loginToContinue: 'Login to continue',
      dontHaveAccount: "Don't have an account?",
      alreadyHaveAccount: 'Already have an account?',
      signIn: 'Sign In',
      createAccount: 'Create Account',
      
      // Events
      upcomingEvents: 'Upcoming Events',
      eventDetails: 'Event Details',
      purchaseTicket: 'Purchase Ticket',
      location: 'Location',
      date: 'Date',
      price: 'Price',
      attendees: 'Attendees',
      
      // Tickets
      ticketCode: 'Ticket Code',
      ticketStatus: 'Status',
      purchaseDate: 'Purchase Date',
      validationDate: 'Validation Date',
      
      // Messages
      success: 'Success',
      error: 'Error',
      loginSuccess: 'Login successful',
      loginFailed: 'Login failed',
      registrationSuccess: 'Registration successful',
      ticketPurchased: 'Ticket purchased successfully',
      
      // Admin
      dashboard: 'Dashboard',
      createEvent: 'Create Event',
      manageEvents: 'Manage Events',
      totalEvents: 'Total Events',
      totalRevenue: 'Total Revenue',
      totalCustomers: 'Total Customers',
    }
  },
  es: {
    translation: {
      // Common
      welcome: 'Bienvenido',
      login: 'Iniciar Sesión',
      logout: 'Cerrar Sesión',
      register: 'Registrarse',
      email: 'Correo Electrónico',
      password: 'Contraseña',
      username: 'Usuario',
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      search: 'Buscar',
      filter: 'Filtrar',
      loading: 'Cargando...',
      
      // Navigation
      home: 'Inicio',
      events: 'Eventos',
      myTickets: 'Mis Entradas',
      profile: 'Perfil',
      scanner: 'Escáner',
      
      // Auth
      loginTitle: 'Sistema de Venta de Entradas',
      loginSubtitle: 'Tu puerta a eventos increíbles',
      welcomeBack: 'Bienvenido de Nuevo',
      loginToContinue: 'Inicia sesión para continuar',
      dontHaveAccount: '¿No tienes cuenta?',
      alreadyHaveAccount: '¿Ya tienes cuenta?',
      signIn: 'Iniciar Sesión',
      createAccount: 'Crear Cuenta',
      
      // Events
      upcomingEvents: 'Próximos Eventos',
      eventDetails: 'Detalles del Evento',
      purchaseTicket: 'Comprar Entrada',
      location: 'Ubicación',
      date: 'Fecha',
      price: 'Precio',
      attendees: 'Asistentes',
      
      // Tickets
      ticketCode: 'Código de Entrada',
      ticketStatus: 'Estado',
      purchaseDate: 'Fecha de Compra',
      validationDate: 'Fecha de Validación',
      
      // Messages
      success: 'Éxito',
      error: 'Error',
      loginSuccess: 'Inicio de sesión exitoso',
      loginFailed: 'Error al iniciar sesión',
      registrationSuccess: 'Registro exitoso',
      ticketPurchased: 'Entrada comprada exitosamente',
      
      // Admin
      dashboard: 'Panel de Control',
      createEvent: 'Crear Evento',
      manageEvents: 'Gestionar Eventos',
      totalEvents: 'Total de Eventos',
      totalRevenue: 'Ingresos Totales',
      totalCustomers: 'Total de Clientes',
    }
  },
  fr: {
    translation: {
      // Common
      welcome: 'Bienvenue',
      login: 'Connexion',
      logout: 'Déconnexion',
      register: "S'inscrire",
      email: 'Email',
      password: 'Mot de passe',
      username: "Nom d'utilisateur",
      save: 'Enregistrer',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Modifier',
      search: 'Rechercher',
      filter: 'Filtrer',
      loading: 'Chargement...',
      
      // Navigation
      home: 'Accueil',
      events: 'Événements',
      myTickets: 'Mes Billets',
      profile: 'Profil',
      scanner: 'Scanner',
      
      // Auth
      loginTitle: 'Système de Billetterie',
      loginSubtitle: 'Votre porte vers des événements incroyables',
      welcomeBack: 'Bon Retour',
      loginToContinue: 'Connectez-vous pour continuer',
      dontHaveAccount: "Vous n'avez pas de compte?",
      alreadyHaveAccount: 'Vous avez déjà un compte?',
      signIn: 'Se Connecter',
      createAccount: 'Créer un Compte',
      
      // Events
      upcomingEvents: 'Événements à Venir',
      eventDetails: "Détails de l'Événement",
      purchaseTicket: 'Acheter un Billet',
      location: 'Lieu',
      date: 'Date',
      price: 'Prix',
      attendees: 'Participants',
      
      // Tickets
      ticketCode: 'Code du Billet',
      ticketStatus: 'Statut',
      purchaseDate: "Date d'Achat",
      validationDate: 'Date de Validation',
      
      // Messages
      success: 'Succès',
      error: 'Erreur',
      loginSuccess: 'Connexion réussie',
      loginFailed: 'Échec de la connexion',
      registrationSuccess: 'Inscription réussie',
      ticketPurchased: 'Billet acheté avec succès',
      
      // Admin
      dashboard: 'Tableau de Bord',
      createEvent: 'Créer un Événement',
      manageEvents: 'Gérer les Événements',
      totalEvents: 'Total des Événements',
      totalRevenue: 'Revenu Total',
      totalCustomers: 'Total des Clients',
    }
  }
};

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    }
  });

// Load saved language preference
AsyncStorage.getItem('language').then(language => {
  if (language) {
    i18n.changeLanguage(language);
  }
});

export default i18n;