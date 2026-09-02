import React, { createContext, useContext, useState, useCallback } from 'react';

type Lang = 'en' | 'he';

const translations = {
  en: {
    myEvents: 'My Events',
    newEvent: 'New Event',
    cloneEvent: 'Clone Event',
    eventName: 'Event Name',
    eventDate: 'Event Date',
    create: 'Create',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    guests: 'Guests',
    groups: 'Groups',
    expected: 'Expected',
    totalGuests: 'Total Guests',
    treeView: 'Tree View',
    addGroup: 'New Group',
    addGuest: 'Add Guest',
    editGuest: 'Edit Guest',
    addSubgroup: 'Add Subgroup',
    deleteGroup: 'Delete Group',
    deleteGroupConfirm: 'Delete "$1" and all its subgroups? This cannot be undone.',
    groupName: 'Group Name',
    parentGroup: 'Parent Group',
    noneTopLevel: 'None (top-level group)',
    groupHint: 'Groups organize your guests into a tree (e.g. "Bride\'s Family" → "Mom\'s Side")',
    name: 'Name',
    phone: 'Phone',
    email: 'Email',
    notes: 'Notes',
    giftDescription: 'Gift Description',
    expectedToArrive: 'Expected to arrive',
    coming: 'Coming',
    notComing: 'Not coming',
    arrived: 'Arrived',
    remove: 'Remove',
    removeGuestConfirm: 'Remove $1 from this group?',
    search: 'Search guests by name, phone, or email...',
    noGuestsFound: 'No guests found',
    noGroupsYet: 'No groups yet',
    tapToCreate: 'Tap + to create your first group',
    direct: 'Direct',
    inSubtree: 'In Subtree',
    subgroups: 'Subgroups',
    guestsInGroup: 'Guests in this group',
    noGuestsYet: 'No guests yet',
    viewAsTree: 'View as Tree',
    editGroup: 'Edit Group',
    moveGroup: 'Move Group',
    edgeWeight: 'Group Distance',
    edgeWeightHint: 'How strongly this group is separated from its parent. Higher weight = guests here are less likely to share a table with people outside this branch. Lower = more mixing allowed. Default: 1.',
    seatingArrangement: 'Seating Arrangement',
    generateSeating: 'Generate Seating',
    maxTableSize: 'Max Table Size',
    alpha: 'Alpha (α)',
    alphaHint: 'Controls how much we penalize lonely guests. Higher α = stronger penalty for guests sitting far from family. Default: 2.0',
    pParam: 'P (exponent)',
    pHint: 'Exponent on the loneliness penalty. Higher p = harsher punishment for very lonely guests. p=2 squares the penalty. Default: 2.0',
    tables: 'Tables',
    table: 'Table',
    noTables: 'No seating arrangement yet',
    cloneFrom: 'Clone from',
    selectEvent: 'Select an event',
    noEvents: 'No events yet. Create your first one!',
    language: 'Language',
    total: 'total',
    generating: 'Generating...',
    generationResults: 'Generation Results',
    saveArrangement: 'Save',
    discardAll: 'Discard All',
    unsavedWarning: 'You have unsaved generated arrangements. They will be lost if you leave.',
    stayHere: 'Stay',
    leaveAnyway: 'Leave',
    tablesCount: 'tables',
    coherency: 'Coherency',
    loneliness: 'Loneliness',
    count: 'Count',
    sortBy: 'Sort by',
    loneliestGroup: 'Loneliest',
    subtreeView: 'Subtree View',
    pickSubtree: 'Pick a subtree',
    pickArrangement: 'Pick an arrangement',
    viewSubtreeSeating: 'View Subtree Seating',
    outsideGuests: 'Outside subtree',
    saved: 'Saved',
    noCandidates: 'No candidates',
  },
  he: {
    myEvents: 'האירועים שלי',
    newEvent: 'אירוע חדש',
    cloneEvent: 'שכפול אירוע',
    eventName: 'שם האירוע',
    eventDate: 'תאריך האירוע',
    create: 'צור',
    cancel: 'ביטול',
    save: 'שמור',
    delete: 'מחק',
    guests: 'אורחים',
    groups: 'קבוצות',
    expected: 'צפויים',
    totalGuests: 'סה"כ אורחים',
    treeView: 'תצוגת עץ',
    addGroup: 'קבוצה חדשה',
    addGuest: 'הוסף אורח',
    editGuest: 'ערוך אורח',
    addSubgroup: 'הוסף תת-קבוצה',
    deleteGroup: 'מחק קבוצה',
    deleteGroupConfirm: 'למחוק את "$1" וכל תתי-הקבוצות? לא ניתן לבטל.',
    groupName: 'שם הקבוצה',
    parentGroup: 'קבוצת אב',
    noneTopLevel: 'ללא (קבוצה ראשית)',
    groupHint: 'קבוצות מארגנות את האורחים בעץ (למשל "משפחת הכלה" ← "צד אמא")',
    name: 'שם',
    phone: 'טלפון',
    email: 'אימייל',
    notes: 'הערות',
    giftDescription: 'תיאור מתנה',
    expectedToArrive: 'צפוי להגיע',
    coming: 'מגיע',
    notComing: 'לא מגיע',
    arrived: 'הגיע',
    remove: 'הסר',
    removeGuestConfirm: 'להסיר את $1 מהקבוצה?',
    search: 'חפש אורחים לפי שם, טלפון או אימייל...',
    noGuestsFound: 'לא נמצאו אורחים',
    noGroupsYet: 'אין קבוצות עדיין',
    tapToCreate: 'לחץ + ליצירת הקבוצה הראשונה',
    direct: 'ישירים',
    inSubtree: 'בתת-עץ',
    subgroups: 'תתי-קבוצות',
    guestsInGroup: 'אורחים בקבוצה זו',
    noGuestsYet: 'אין אורחים עדיין',
    viewAsTree: 'הצג כעץ',
    editGroup: 'ערוך קבוצה',
    moveGroup: 'העבר קבוצה',
    edgeWeight: 'מרחק קבוצה',
    edgeWeightHint: 'כמה הקבוצה מופרדת מההורה שלה. משקל גבוה = פחות סיכוי שאורחים ישבו עם אנשים מחוץ לענף הזה. נמוך = יותר ערבוב. ברירת מחדל: 1.',
    seatingArrangement: 'סידור הושבה',
    generateSeating: 'צור סידור הושבה',
    maxTableSize: 'גודל שולחן מקסימלי',
    alpha: 'אלפא (α)',
    alphaHint: 'שולט בעוצמת העונש על אורחים בודדים. α גבוה = עונש חזק יותר על אורחים שיושבים רחוק מהמשפחה. ברירת מחדל: 2.0',
    pParam: 'P (מעריך)',
    pHint: 'מעריך על עונש הבדידות. p גבוה = עונש חמור יותר לאורחים מאוד בודדים. p=2 מעלה בריבוע. ברירת מחדל: 2.0',
    tables: 'שולחנות',
    table: 'שולחן',
    noTables: 'אין סידור הושבה עדיין',
    cloneFrom: 'שכפל מ',
    selectEvent: 'בחר אירוע',
    noEvents: 'אין אירועים עדיין. צור את הראשון!',
    language: 'שפה',
    total: 'סה"כ',
    generating: 'מייצר...',
    generationResults: 'תוצאות ייצור',
    saveArrangement: 'שמור',
    discardAll: 'מחק הכל',
    unsavedWarning: 'יש לך סידורים שלא נשמרו. הם יימחקו אם תעזוב.',
    stayHere: 'הישאר',
    leaveAnyway: 'עזוב',
    tablesCount: 'שולחנות',
    coherency: 'קוהרנטיות',
    loneliness: 'בדידות',
    count: 'כמות',
    sortBy: 'מיין לפי',
    loneliestGroup: 'הכי בודד',
    subtreeView: 'תצוגת תת-עץ',
    pickSubtree: 'בחר תת-עץ',
    pickArrangement: 'בחר סידור',
    viewSubtreeSeating: 'הצג הושבת תת-עץ',
    outsideGuests: 'מחוץ לתת-עץ',
    saved: 'נשמר',
    noCandidates: 'אין מועמדים',
  },
} as const;

type TranslationKey = keyof typeof translations.en;

interface I18nContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey, ...args: string[]) => string;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');

  const t = useCallback((key: TranslationKey, ...args: string[]) => {
    let str = translations[lang][key] ?? translations.en[key] ?? key;
    args.forEach((a, i) => { str = str.replace(`$${i + 1}`, a); });
    return str;
  }, [lang]);

  const isRTL = lang === 'he';

  return (
    <I18nContext.Provider value={{ lang, setLang, t, isRTL }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be inside I18nProvider');
  return ctx;
};
