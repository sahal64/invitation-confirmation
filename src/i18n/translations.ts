import { Language } from '../types';

export interface Translations {
  // Public Form
  formTitle: string;
  formDescription: string;
  nationalDayBadge: string;
  requiredHint: string;
  requiredAsterisk: string;
  nameLabel: string;
  namePlaceholder: string;
  organisationLabel: string;
  organisationPlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  jobTitleLabel: string;
  jobTitlePlaceholder: string;
  joinLabel: string;
  joinSelectPlaceholder: string;
  joinYes: string;
  joinNo: string;
  hasGuestLabel: string;
  hasGuestYes: string;
  hasGuestNo: string;
  guestCountLabel: string;
  guestCountPlaceholder: string;
  guestCountOption: (n: number) => string;
  guestCountCustomOption: string;
  customGuestCountLabel: string;
  customGuestCountPlaceholder: string;
  valCustomGuestCountRequired: string;
  valCustomGuestCountMin: string;
  ratingLabel: string;
  ratingHint: string;
  starsCount: (n: number) => string;
  submitButton: string;
  submittingButton: string;
  clearButton: string;
  clearConfirm: string;
  confirmationTitle: string;
  confirmationMessage: string;
  submitAnotherButton: string;

  // Google reCAPTCHA
  recaptchaLabel: string;
  valRecaptchaRequired: string;
  valRecaptchaFailed: string;
  valRecaptchaExpired: string;
  valRecaptchaConfigError: string;
  
  // Validation Errors
  valNameRequired: string;
  valOrganisationRequired: string;
  valEmailRequired: string;
  valEmailInvalid: string;
  valJobTitleRequired: string;
  valJoinRequired: string;
  valHasGuestRequired: string;
  valGuestCountRequired: string;
  valGeneralError: string;
  dbNotConfiguredError: string;
  
  // Navigation & General
  navPublicForm: string;
  navAdminDashboard: string;
  languageSelect: string;
  switchToLang: string;
  backToForm: string;
  administrator: string;

  // Admin Dashboard
  adminTitle: string;
  adminSubtitle: string;
  adminLoginTitle: string;
  adminLoginSubtitle: string;
  adminEmailLabel: string;
  adminPasswordLabel: string;
  adminLoginButton: string;
  adminLoggingIn: string;
  adminLogoutButton: string;
  adminDemoNotice: string;
  totalSubmissions: string;
  attendingCount: string;
  notAttendingCount: string;
  avgRating: string;
  searchPlaceholder: string;
  filterAll: string;
  filterJoin: string;
  filterLanguage: string;
  colDate: string;
  colName: string;
  colOrganisation: string;
  colEmail: string;
  colJobTitle: string;
  colJoin: string;
  colGuest: string;
  colRating: string;
  colLanguage: string;
  colActions: string;
  viewDetails: string;
  exportCsv: string;
  exportExcel: string;
  printRecord: string;
  printPdf: string;
  close: string;
  noSubmissionsFound: string;
  showingRecords: (from: number, to: number, total: number) => string;
  prevPage: string;
  nextPage: string;
  detailsTitle: string;
  submissionId: string;
  submittedAt: string;
  exportNotice: string;
  sampleBadge: string;
  removeSampleData: string;
  devNotice: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // Exact wording from source form
    formTitle: "invitation confirmation -National day",
    formDescription: "Date 25-11-2026  Time :6 PM to 10 PM",
    nationalDayBadge: "National Day Celebration",
    requiredHint: "Indicates required question",
    requiredAsterisk: "*",
    nameLabel: "Name",
    namePlaceholder: "Your answer",
    organisationLabel: "Organisation Name",
    organisationPlaceholder: "Your answer",
    emailLabel: "Email",
    emailPlaceholder: "Your email",
    jobTitleLabel: "Job Title",
    jobTitlePlaceholder: "Your answer",
    joinLabel: "Will you be attending the event?",
    joinSelectPlaceholder: "Select an option...",
    joinYes: "Yes, I will attend",
    joinNo: "No, I am unable to attend",
    hasGuestLabel: "Will you be accompanied by a guest?",
    hasGuestYes: "Yes",
    hasGuestNo: "No",
    guestCountLabel: "How many guests will be attending with you?",
    guestCountPlaceholder: "Select number of guests...",
    guestCountOption: (n) => `${n} Guest${n > 1 ? 's' : ''}`,
    guestCountCustomOption: "Custom (More than 5)",
    customGuestCountLabel: "Enter exact number of accompanying guests",
    customGuestCountPlaceholder: "e.g. 6, 7, 10...",
    valCustomGuestCountRequired: "Please enter the number of accompanying guests",
    valCustomGuestCountMin: "The number of accompanying guests must be greater than 5",
    ratingLabel: "Rating",
    ratingHint: "Rate on a scale from 1 to 5 stars",
    starsCount: (n) => `${n} star${n === 1 ? '' : 's'}`,
    submitButton: "Submit",
    submittingButton: "Submitting...",
    clearButton: "Clear form",
    clearConfirm: "Are you sure you want to clear your answers?",
    confirmationTitle: "Response recorded",
    confirmationMessage: "Thanks for submitting your contact info!",
    submitAnotherButton: "Submit another response",

    // Google reCAPTCHA
    recaptchaLabel: "Security Verification",
    valRecaptchaRequired: "Please check the box to confirm you are not a robot",
    valRecaptchaFailed: "reCAPTCHA verification failed. Please try again.",
    valRecaptchaExpired: "Verification expired. Please check the box again.",
    valRecaptchaConfigError: "reCAPTCHA site key is not configured in .env",

    // Validation
    valNameRequired: "This is a required question",
    valOrganisationRequired: "This is a required question",
    valEmailRequired: "This is a required question",
    valEmailInvalid: "Must be a valid email address",
    valJobTitleRequired: "This is a required question",
    valJoinRequired: "Please select your attendance status",
    valHasGuestRequired: "Please indicate if you will be accompanied by a guest",
    valGuestCountRequired: "Please select the number of guests",
    valGeneralError: "An error occurred while submitting. Please try again.",
    dbNotConfiguredError: "Database service is not configured. Please contact the event administrator.",

    // Nav
    navPublicForm: "Public Form",
    navAdminDashboard: "Admin Dashboard",
    languageSelect: "Language",
    switchToLang: "Русский",
    backToForm: "Back to Form",
    administrator: "Administrator",

    // Admin
    adminTitle: "Responses & Attendance Management",
    adminSubtitle: "Secure overview and administrative records for the National Day invitation form.",
    adminLoginTitle: "Admin Portal Sign In",
    adminLoginSubtitle: "Enter your credentials to access confidential event submissions.",
    adminEmailLabel: "Admin Email",
    adminPasswordLabel: "Password",
    adminLoginButton: "Sign In to Dashboard",
    adminLoggingIn: "Signing in...",
    adminLogoutButton: "Sign Out",
    adminDemoNotice: "Development Mode: Local Storage active. Connect Supabase for production.",
    totalSubmissions: "Total Responses",
    attendingCount: "Attending (YES)",
    notAttendingCount: "Declined (No)",
    avgRating: "Average Rating",
    searchPlaceholder: "Search by name, email, or job title...",
    filterAll: "All Responses",
    filterJoin: "Attendance Status",
    filterLanguage: "Interface Language",
    colDate: "Submitted At",
    colName: "Name",
    colOrganisation: "Organisation",
    colEmail: "Email",
    colJobTitle: "Job Title",
    colJoin: "Attending",
    colGuest: "Guests",
    colRating: "Rating",
    colLanguage: "Language",
    colActions: "Actions",
    viewDetails: "View Details",
    exportCsv: "Export CSV",
    exportExcel: "Export Excel (.xlsx)",
    printRecord: "Print Record",
    printPdf: "Print / Save PDF",
    close: "Close",
    noSubmissionsFound: "No submissions match your search or filter criteria.",
    showingRecords: (from, to, total) => `Showing ${from}-${to} of ${total} submissions`,
    prevPage: "Previous",
    nextPage: "Next",
    detailsTitle: "Submission Details",
    submissionId: "Submission ID",
    submittedAt: "Date & Time",
    exportNotice: "Use CSV or Excel for reviewing responses, and PDF for printable records.",
    sampleBadge: "Sample",
    removeSampleData: "Remove Sample Data",
    devNotice: "Dev Mode: Local Storage Active",
  },
  ru: {
    // Faithful Russian translation of source form
    formTitle: "Подтверждение приглашения — Национальный день",
    formDescription: "Дата: 25.11.2026  Время: с 18:00 до 22:00",
    nationalDayBadge: "Празднование Национального дня",
    requiredHint: "Обязательные для заполнения поля",
    requiredAsterisk: "*",
    nameLabel: "Имя",
    namePlaceholder: "Мой ответ",
    organisationLabel: "Название организации",
    organisationPlaceholder: "Мой ответ",
    emailLabel: "Электронная почта",
    emailPlaceholder: "example@domain.com",
    jobTitleLabel: "Должность",
    jobTitlePlaceholder: "Мой ответ",
    joinLabel: "Вы планируете присутствовать на мероприятии?",
    joinSelectPlaceholder: "Выберите вариант присутствия...",
    joinYes: "Да, я буду присутствовать",
    joinNo: "К сожалению, я не смогу присутствовать",
    hasGuestLabel: "Планируете ли вы прийти с гостями?",
    hasGuestYes: "Да",
    hasGuestNo: "Нет",
    guestCountLabel: "Сколько гостей будет с вами?",
    guestCountPlaceholder: "Выберите количество гостей...",
    guestCountOption: (n) => `${n} ${n === 1 ? 'гость' : n < 5 ? 'гостя' : 'гостей'}`,
    guestCountCustomOption: "Свой вариант (более 5)",
    customGuestCountLabel: "Укажите точное количество сопровождающих гостей",
    customGuestCountPlaceholder: "например: 6, 7, 10...",
    valCustomGuestCountRequired: "Пожалуйста, укажите количество сопровождающих гостей",
    valCustomGuestCountMin: "Количество сопровождающих гостей должно быть больше 5",
    ratingLabel: "Оценка",
    ratingHint: "Оценка по шкале от 1 до 5 звёзд",
    starsCount: (n) => `${n} звёзд`,
    submitButton: "Отправить",
    submittingButton: "Отправка...",
    clearButton: "Очистить форму",
    clearConfirm: "Вы уверены, что хотите очистить все введенные ответы?",
    confirmationTitle: "Ответ записан",
    confirmationMessage: "Спасибо за отправку ваших контактных данных!",
    submitAnotherButton: "Отправить ещё один ответ",

    // Google reCAPTCHA
    recaptchaLabel: "Проверка безопасности",
    valRecaptchaRequired: "Пожалуйста, подтвердите, что вы не робот",
    valRecaptchaFailed: "Проверка reCAPTCHA не удалась. Пожалуйста, попробуйте еще раз.",
    valRecaptchaExpired: "Срок проверки истек. Пожалуйста, отметьте галочку снова.",
    valRecaptchaConfigError: "Ключ reCAPTCHA не настроен в файле .env",

    // Validation
    valNameRequired: "Это обязательный вопрос",
    valOrganisationRequired: "Это обязательный вопрос",
    valEmailRequired: "Это обязательный вопрос",
    valEmailInvalid: "Укажите действительный адрес электронной почты",
    valJobTitleRequired: "Это обязательный вопрос",
    valJoinRequired: "Пожалуйста, укажите ваш статус присутствия",
    valHasGuestRequired: "Пожалуйста, укажите, придете ли вы с гостями",
    valGuestCountRequired: "Пожалуйста, выберите количество гостей",
    valGeneralError: "Произошла ошибка при отправке. Пожалуйста, попробуйте еще раз.",
    dbNotConfiguredError: "Служба базы данных не настроена. Пожалуйста, обратитесь к администратору.",

    // Nav
    navPublicForm: "Публичная форма",
    navAdminDashboard: "Панель администратора",
    languageSelect: "Язык",
    switchToLang: "English",
    backToForm: "Вернуться к форме",
    administrator: "Администратор",

    // Admin
    adminTitle: "Управление ответами и посещаемостью",
    adminSubtitle: "Защищенный обзор и реестр ответов на приглашение ко Дню нации.",
    adminLoginTitle: "Вход в панель администратора",
    adminLoginSubtitle: "Введите учетные данные для доступа к конфиденциальным ответам.",
    adminEmailLabel: "Email администратора",
    adminPasswordLabel: "Пароль",
    adminLoginButton: "Войти в систему",
    adminLoggingIn: "Вход...",
    adminLogoutButton: "Выйти",
    adminDemoNotice: "Режим разработки: используется локальное хранилище. Подключите Supabase для рабочей среды.",
    totalSubmissions: "Всего ответов",
    attendingCount: "Присутствуют (Да)",
    notAttendingCount: "Отклонили (Нет)",
    avgRating: "Средний рейтинг",
    searchPlaceholder: "Поиск по имени, email или должности...",
    filterAll: "Все ответы",
    filterJoin: "Статус участия",
    filterLanguage: "Язык интерфейса",
    colDate: "Дата отправки",
    colName: "Имя",
    colOrganisation: "Организация",
    colEmail: "Email",
    colJobTitle: "Должность",
    colJoin: "Присутствие",
    colGuest: "Гости",
    colRating: "Оценка",
    colLanguage: "Язык",
    colActions: "Действия",
    viewDetails: "Подробнее",
    exportCsv: "Экспорт в CSV",
    exportExcel: "Экспорт в Excel (.xlsx)",
    printRecord: "Печать записи",
    printPdf: "Печать / Сохранить в PDF",
    close: "Закрыть",
    noSubmissionsFound: "По заданным критериям ответов не найдено.",
    showingRecords: (from, to, total) => `Показано ${from}-${to} из ${total} ответов`,
    prevPage: "Назад",
    nextPage: "Вперед",
    detailsTitle: "Детали ответа",
    submissionId: "ID записи",
    submittedAt: "Дата и время",
    exportNotice: "Используйте CSV или Excel для анализа ответов, а PDF — для печатных документов.",
    sampleBadge: "Тестовый",
    removeSampleData: "Удалить тестовые данные",
    devNotice: "Режим Dev: локальное хранилище",
  }
};
