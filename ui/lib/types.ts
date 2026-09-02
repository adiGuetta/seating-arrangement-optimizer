export interface Guest {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  expectedToArrive: boolean;
  arrivedConfirmed: boolean;
  giftDescription?: string;
}

export interface GuestGroup {
  id: string;
  name: string;
  parentId: string | null;
  guests: Guest[];
  edgeWeight: number;
  createdAt: number;
}

export interface SeatingConfig {
  maxTableSize: number;
  alpha: number;
  p: number;
}

export interface TableAssignment {
  tableId: number;
  guests: { guestId: string; guestName: string; groupId: string; groupName: string }[];
}

export interface SeatingArrangement {
  id: string;
  name: string;
  config: SeatingConfig;
  tables: TableAssignment[];
  createdAt: number;
}

export interface Event {
  id: string;
  name: string;
  date?: string;
  groups: GuestGroup[];
  seatingConfig: SeatingConfig;
  arrangements: SeatingArrangement[];
  createdAt: number;
}
