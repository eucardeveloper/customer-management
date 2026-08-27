export type Lang = 'en' | 'tr';

export const translations = {
  en: {
    // App
    appTitle: 'CRM Platform',
    appSubtitle: 'Enterprise Edition',
    live: 'Live',
    logout: 'Logout',

    // Navigation
    dashboard: 'Dashboard',
    customers: 'Customers',
    orders: 'Orders',
    analytics: 'Analytics',
    aiAgent: 'AI Agent',
    userManagement: 'User Management',

    // Dashboard KPIs
    totalRevenue: 'Total Revenue',
    totalCustomers: 'Total Customers',
    totalOrders: 'Total Orders',
    fulfillmentRate: 'Fulfillment Rate',
    pendingOrders: 'Pending Orders',
    topCustomers: 'Top Customers by Revenue',
    recentOrders: 'Recent Orders',
    revenueOverTime: 'Revenue Over Time',

    // Customers
    addCustomer: 'Add Customer',
    editCustomer: 'Edit Customer',
    deleteCustomer: 'Delete Customer',
    searchCustomers: 'Search customers...',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    customerType: 'Customer Type',
    individual: 'Individual (Person)',
    company: 'Company / Organization',
    noCustomers: 'No customers found',

    // Orders
    addOrder: 'Add Order',
    editOrder: 'Edit Order',
    deleteOrder: 'Delete Order',
    searchOrders: 'Search orders...',
    product: 'Product',
    price: 'Price ($)',
    quantity: 'Quantity',
    status: 'Status',
    date: 'Date',
    customer: 'Customer',
    total: 'Total',
    noOrders: 'No orders found',
    exportExcel: 'Export Excel',

    // User Management
    addUser: 'Add User',
    username: 'Username',
    password: 'Password',
    role: 'Role',
    actions: 'Actions',
    changeRole: 'Change Role',
    deleteUser: 'Delete User',
    searchUsers: 'Search by username, email or role...',
    noUsers: 'No users found',
    registeredAccounts: 'registered accounts',
    createUser: 'Create',

    // Analytics
    ordersByStatus: 'Orders by Status',
    customersByType: 'Customers by Type',
    revenueByMonth: 'Revenue by Month',

    // AI Agent
    aiPlaceholder: 'Ask about your customers, orders, revenue...',
    send: 'Send',
    thinking: 'Thinking...',

    // Dialogs
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    confirm: 'Confirm',
    deleteConfirm: 'Are you sure you want to delete this item?',
    deleteUserConfirm: 'Are you sure you want to delete this user?',

    // Snackbar
    saved: 'Saved successfully.',
    deleted: 'Deleted successfully.',
    error: 'An error occurred.',
    userCreated: 'User created.',
    userDeleted: 'User deleted.',
    roleUpdated: 'Role updated.',
    deleteFailed: 'Delete failed.',
    createFailed: 'Create failed.',
    roleUpdateFailed: 'Role update failed.',
    allFieldsRequired: 'All fields required.',

    // Misc
    refresh: 'Refresh',
    id: 'ID',
    noData: 'No data',
    loading: 'Loading...',
  },
  tr: {
    // App
    appTitle: 'CRM Platform',
    appSubtitle: 'Kurumsal Sürüm',
    live: 'Canlı',
    logout: 'Çıkış',

    // Navigation
    dashboard: 'Panel',
    customers: 'Müşteriler',
    orders: 'Siparişler',
    analytics: 'Analitik',
    aiAgent: 'AI Asistan',
    userManagement: 'Kullanıcı Yönetimi',

    // Dashboard KPIs
    totalRevenue: 'Toplam Gelir',
    totalCustomers: 'Toplam Müşteri',
    totalOrders: 'Toplam Sipariş',
    fulfillmentRate: 'Tamamlanma Oranı',
    pendingOrders: 'Bekleyen Siparişler',
    topCustomers: 'Gelire Göre En İyi Müşteriler',
    recentOrders: 'Son Siparişler',
    revenueOverTime: 'Zaman İçinde Gelir',

    // Customers
    addCustomer: 'Müşteri Ekle',
    editCustomer: 'Müşteri Düzenle',
    deleteCustomer: 'Müşteri Sil',
    searchCustomers: 'Müşteri ara...',
    firstName: 'Ad',
    lastName: 'Soyad',
    email: 'E-posta',
    phone: 'Telefon',
    customerType: 'Müşteri Tipi',
    individual: 'Bireysel (Kişi)',
    company: 'Şirket / Kuruluş',
    noCustomers: 'Müşteri bulunamadı',

    // Orders
    addOrder: 'Sipariş Ekle',
    editOrder: 'Sipariş Düzenle',
    deleteOrder: 'Sipariş Sil',
    searchOrders: 'Sipariş ara...',
    product: 'Ürün',
    price: 'Fiyat (₺)',
    quantity: 'Adet',
    status: 'Durum',
    date: 'Tarih',
    customer: 'Müşteri',
    total: 'Toplam',
    noOrders: 'Sipariş bulunamadı',
    exportExcel: 'Excel\'e Aktar',

    // User Management
    addUser: 'Kullanıcı Ekle',
    username: 'Kullanıcı Adı',
    password: 'Şifre',
    role: 'Rol',
    actions: 'İşlemler',
    changeRole: 'Rol Değiştir',
    deleteUser: 'Kullanıcı Sil',
    searchUsers: 'Kullanıcı adı, e-posta veya rol ile ara...',
    noUsers: 'Kullanıcı bulunamadı',
    registeredAccounts: 'kayıtlı hesap',
    createUser: 'Oluştur',

    // Analytics
    ordersByStatus: 'Duruma Göre Siparişler',
    customersByType: 'Tipe Göre Müşteriler',
    revenueByMonth: 'Aylık Gelir',

    // AI Agent
    aiPlaceholder: 'Müşteriler, siparişler, gelir hakkında sorun...',
    send: 'Gönder',
    thinking: 'Düşünüyor...',

    // Dialogs
    cancel: 'İptal',
    save: 'Kaydet',
    delete: 'Sil',
    confirm: 'Onayla',
    deleteConfirm: 'Bu öğeyi silmek istediğinizden emin misiniz?',
    deleteUserConfirm: 'Bu kullanıcıyı silmek istediğinizden emin misiniz?',

    // Snackbar
    saved: 'Başarıyla kaydedildi.',
    deleted: 'Başarıyla silindi.',
    error: 'Bir hata oluştu.',
    userCreated: 'Kullanıcı oluşturuldu.',
    userDeleted: 'Kullanıcı silindi.',
    roleUpdated: 'Rol güncellendi.',
    deleteFailed: 'Silme başarısız.',
    createFailed: 'Oluşturma başarısız.',
    roleUpdateFailed: 'Rol güncelleme başarısız.',
    allFieldsRequired: 'Tüm alanlar zorunludur.',

    // Misc
    refresh: 'Yenile',
    id: 'ID',
    noData: 'Veri yok',
    loading: 'Yükleniyor...',
  },
};

export function useTranslation(lang: Lang) {
  const t = (key: keyof typeof translations.en): string => translations[lang][key] ?? translations.en[key];
  return { t };
}
