import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { GuestGroup, Guest, Event, SeatingConfig, TableAssignment, SeatingArrangement } from './types';

interface StoreContextType {
  // Events
  events: Event[];
  currentEvent: Event | null;
  setCurrentEventId: (id: string | null) => void;
  addEvent: (name: string, date?: string) => Event;
  cloneEvent: (sourceId: string, newName: string) => Event;
  deleteEvent: (id: string) => void;
  updateEvent: (id: string, updates: Partial<Event>) => void;
  // Groups (operate on current event)
  groups: GuestGroup[];
  addGroup: (name: string, parentId: string | null) => GuestGroup;
  updateGroup: (id: string, updates: Partial<GuestGroup>) => void;
  deleteGroup: (id: string) => void;
  moveGroup: (id: string, newParentId: string | null) => void;
  reorderGroup: (id: string, direction: 'up' | 'down') => void;
  // Guests
  addGuest: (groupId: string, guest: Omit<Guest, 'id'>) => void;
  updateGuest: (groupId: string, guestId: string, updates: Partial<Guest>) => void;
  removeGuest: (groupId: string, guestId: string) => void;
  // Helpers
  getChildren: (parentId: string | null) => GuestGroup[];
  getGroup: (id: string) => GuestGroup | undefined;
  getSubtreeGroups: (rootId: string) => GuestGroup[];
  totalExpectedGuests: () => number;
  // Seating
  updateSeatingConfig: (config: Partial<SeatingConfig>) => void;
  addArrangement: (name: string, tables: TableAssignment[], config: SeatingConfig) => SeatingArrangement;
  updateArrangement: (id: string, updates: Partial<SeatingArrangement>) => void;
  deleteArrangement: (id: string) => void;
  // Subtree export
  exportSubtreeToEvent: (rootGroupId: string, targetEventId: string) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from './auth';

let nextId = Date.now();
const genId = () => String(nextId++);

const STORAGE_KEY = 'seating_data';

function loadFromStorage(): Event[] {
  if (Platform.OS !== 'web') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveToStorage(events: Event[]) {
  if (Platform.OS !== 'web') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(events)); } catch {}
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>(() => {
    const stored = loadFromStorage();
    return stored.length > 0 ? stored : [];
  });
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [firestoreLoaded, setFirestoreLoaded] = useState(false);
  const [demoLoaded, setDemoLoaded] = useState(false);

  // Load demo event if available (debug mode)
  useEffect(() => {
    if (demoLoaded) return;
    setDemoLoaded(true);
    if (Platform.OS !== 'web') return;
    fetch('/demo-event.json').then(r => {
      if (!r.ok) return;
      return r.json();
    }).then(event => {
      if (!event) return;
      setEvents(prev => {
        if (prev.some(e => e.name === event.name)) return prev;
        return [...prev, event];
      });
    }).catch(() => {});
  }, [demoLoaded]);

  // Load from Firestore when user logs in
  useEffect(() => {
    if (!user) { setFirestoreLoaded(false); return; }
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data.events && Array.isArray(data.events) && data.events.length > 0) {
            setEvents(data.events);
          }
        }
      } catch (e) { console.warn('Firestore load failed, using local data', e); }
      setFirestoreLoaded(true);
    };
    load();
  }, [user?.uid]);

  // Persist: Firestore if logged in, localStorage always
  useEffect(() => {
    saveToStorage(events);
    if (user && firestoreLoaded) {
      setDoc(doc(db, 'users', user.uid), { events: JSON.parse(JSON.stringify(events)) }, { merge: true }).catch(e =>
        console.warn('Firestore save failed', e)
      );
    }
  }, [events, user, firestoreLoaded]);

  const currentEvent = events.find(e => e.id === currentEventId) ?? null;
  const groups = currentEvent?.groups ?? [];

  // Helper to update current event's groups
  const setGroups = useCallback((fn: (prev: GuestGroup[]) => GuestGroup[]) => {
    if (!currentEventId) return;
    setEvents(prev => prev.map(e =>
      e.id === currentEventId ? { ...e, groups: fn(e.groups) } : e
    ));
  }, [currentEventId]);

  const addEvent = useCallback((name: string, date?: string) => {
    const ev: Event = {
      id: genId(), name, date, groups: [],
      seatingConfig: { maxTableSize: 10, alpha: 2.0, p: 2.0 },
      arrangements: [],
      createdAt: Date.now(),
    };
    setEvents(prev => [...prev, ev]);
    return ev;
  }, []);

  const cloneEvent = useCallback((sourceId: string, newName: string) => {
    const source = events.find(e => e.id === sourceId);
    if (!source) throw new Error('Source event not found');
    // Deep clone groups with new IDs
    const idMap = new Map<string, string>();
    const newGroups = source.groups.map(g => {
      const newId = genId();
      idMap.set(g.id, newId);
      return { ...g, id: newId, guests: g.guests.map(gu => ({ ...gu, id: genId() })) };
    });
    // Remap parentIds
    for (const g of newGroups) {
      g.parentId = g.parentId ? (idMap.get(g.parentId) ?? null) : null;
    }
    const ev: Event = {
      id: genId(), name: newName, date: source.date, groups: newGroups,
      seatingConfig: { ...source.seatingConfig },
      arrangements: [],
      createdAt: Date.now(),
    };
    setEvents(prev => [...prev, ev]);
    return ev;
  }, [events]);

  const deleteEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    if (currentEventId === id) setCurrentEventId(null);
  }, [currentEventId]);

  const updateEvent = useCallback((id: string, updates: Partial<Event>) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const getChildren = useCallback((parentId: string | null) =>
    groups.filter(g => g.parentId === parentId).sort((a, b) => a.createdAt - b.createdAt), [groups]);

  const getGroup = useCallback((id: string) => groups.find(g => g.id === id), [groups]);

  const getSubtreeGroups = useCallback((rootId: string): GuestGroup[] => {
    const result: GuestGroup[] = [];
    const visit = (id: string) => {
      const g = groups.find(gr => gr.id === id);
      if (g) { result.push(g); groups.filter(gr => gr.parentId === id).forEach(c => visit(c.id)); }
    };
    visit(rootId);
    return result;
  }, [groups]);

  const addGroup = useCallback((name: string, parentId: string | null) => {
    const g: GuestGroup = { id: genId(), name, parentId, guests: [], edgeWeight: 1, createdAt: Date.now() };
    setGroups(prev => [...prev, g]);
    return g;
  }, [setGroups]);

  const updateGroup = useCallback((id: string, updates: Partial<GuestGroup>) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
  }, [setGroups]);

  const deleteGroup = useCallback((id: string) => {
    setGroups(prev => {
      const toDelete = new Set<string>();
      const visit = (gid: string) => { toDelete.add(gid); prev.filter(g => g.parentId === gid).forEach(c => visit(c.id)); };
      visit(id);
      return prev.filter(g => !toDelete.has(g.id));
    });
  }, [setGroups]);

  const moveGroup = useCallback((id: string, newParentId: string | null) => {
    // Prevent moving to own subtree
    const subtreeIds = new Set(getSubtreeGroups(id).map(g => g.id));
    if (newParentId && subtreeIds.has(newParentId)) return;
    setGroups(prev => prev.map(g => g.id === id ? { ...g, parentId: newParentId } : g));
  }, [setGroups, getSubtreeGroups]);

  const reorderGroup = useCallback((id: string, direction: 'up' | 'down') => {
    setGroups(prev => {
      const g = prev.find(gr => gr.id === id);
      if (!g) return prev;
      const siblings = prev.filter(gr => gr.parentId === g.parentId).sort((a, b) => a.createdAt - b.createdAt);
      const idx = siblings.findIndex(s => s.id === id);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= siblings.length) return prev;
      // Swap createdAt to change order
      const tmpTime = siblings[idx].createdAt;
      return prev.map(gr => {
        if (gr.id === siblings[idx].id) return { ...gr, createdAt: siblings[swapIdx].createdAt };
        if (gr.id === siblings[swapIdx].id) return { ...gr, createdAt: tmpTime };
        return gr;
      });
    });
  }, [setGroups]);

  const addGuest = useCallback((groupId: string, guest: Omit<Guest, 'id'>) => {
    setGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, guests: [...g.guests, { ...guest, id: genId() }] } : g
    ));
  }, [setGroups]);

  const updateGuest = useCallback((groupId: string, guestId: string, updates: Partial<Guest>) => {
    setGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, guests: g.guests.map(gu => gu.id === guestId ? { ...gu, ...updates } : gu) } : g
    ));
  }, [setGroups]);

  const removeGuest = useCallback((groupId: string, guestId: string) => {
    setGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, guests: g.guests.filter(gu => gu.id !== guestId) } : g
    ));
  }, [setGroups]);

  const totalExpectedGuests = useCallback(() =>
    groups.reduce((sum, g) => sum + g.guests.filter(gu => gu.expectedToArrive).length, 0), [groups]);

  const updateSeatingConfig = useCallback((config: Partial<SeatingConfig>) => {
    if (!currentEventId) return;
    setEvents(prev => prev.map(e =>
      e.id === currentEventId ? { ...e, seatingConfig: { ...e.seatingConfig, ...config } } : e
    ));
  }, [currentEventId]);

  const addArrangement = useCallback((name: string, tables: TableAssignment[], config: SeatingConfig) => {
    if (!currentEventId) throw new Error('No event');
    const arr: SeatingArrangement = { id: genId(), name, config, tables, createdAt: Date.now() };
    setEvents(prev => prev.map(e =>
      e.id === currentEventId ? { ...e, arrangements: [...(e.arrangements ?? []), arr] } : e
    ));
    return arr;
  }, [currentEventId]);

  const updateArrangement = useCallback((arrId: string, updates: Partial<SeatingArrangement>) => {
    if (!currentEventId) return;
    setEvents(prev => prev.map(e =>
      e.id === currentEventId
        ? { ...e, arrangements: (e.arrangements ?? []).map(a => a.id === arrId ? { ...a, ...updates } : a) }
        : e
    ));
  }, [currentEventId]);

  const deleteArrangement = useCallback((arrId: string) => {
    if (!currentEventId) return;
    setEvents(prev => prev.map(e =>
      e.id === currentEventId
        ? { ...e, arrangements: (e.arrangements ?? []).filter(a => a.id !== arrId) }
        : e
    ));
  }, [currentEventId]);

  const exportSubtreeToEvent = useCallback((rootGroupId: string, targetEventId: string) => {
    // Get subtree from current event
    const subtree = getSubtreeGroups(rootGroupId);
    if (subtree.length === 0) return;
    // Deep clone with new IDs
    const idMap = new Map<string, string>();
    const newGroups = subtree.map(g => {
      const newId = genId();
      idMap.set(g.id, newId);
      return { ...g, id: newId, guests: g.guests.map(gu => ({ ...gu, id: genId() })), createdAt: Date.now() };
    });
    // Remap parentIds; root of subtree becomes top-level in target
    for (const g of newGroups) {
      if (g.parentId && idMap.has(g.parentId)) {
        g.parentId = idMap.get(g.parentId)!;
      } else {
        g.parentId = null; // root of exported subtree
      }
    }
    setEvents(prev => prev.map(e =>
      e.id === targetEventId ? { ...e, groups: [...e.groups, ...newGroups] } : e
    ));
  }, [getSubtreeGroups]);

  return (
    <StoreContext.Provider value={{
      events, currentEvent, setCurrentEventId,
      addEvent, cloneEvent, deleteEvent, updateEvent,
      groups, addGroup, updateGroup, deleteGroup, moveGroup, reorderGroup,
      addGuest, updateGuest, removeGuest,
      getChildren, getGroup, getSubtreeGroups, totalExpectedGuests,
      updateSeatingConfig, addArrangement, updateArrangement, deleteArrangement,
      exportSubtreeToEvent,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be inside StoreProvider');
  return ctx;
};
