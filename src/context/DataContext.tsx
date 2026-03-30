import { createContext, useContext, useState, ReactNode } from 'react';
import { 
  customers as initialCustomers, 
  equipment as initialEquipment,
  Customer, 
  Equipment 
} from '@/data/mockData';

interface DataContextType {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  equipment: Equipment[];
  setEquipment: React.Dispatch<React.SetStateAction<Equipment[]>>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [equipment, setEquipment] = useState<Equipment[]>(initialEquipment);

  return (
    <DataContext.Provider value={{ customers, setCustomers, equipment, setEquipment }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
