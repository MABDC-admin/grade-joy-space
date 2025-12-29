import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface School {
  id: string;
  name: string;
  code: string;
}

interface SchoolContextType {
  schools: School[];
  selectedSchoolId: string | null;
  setSelectedSchoolId: (id: string | null) => void;
  selectedSchool: School | null;
  loading: boolean;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchSchools();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const fetchSchools = async () => {
    try {
      const { data } = await supabase
        .from('schools')
        .select('id, name, code')
        .order('name');
      setSchools(data || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedSchool = selectedSchoolId 
    ? schools.find(s => s.id === selectedSchoolId) || null 
    : null;

  return (
    <SchoolContext.Provider value={{
      schools,
      selectedSchoolId,
      setSelectedSchoolId,
      selectedSchool,
      loading
    }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  const context = useContext(SchoolContext);
  if (context === undefined) {
    throw new Error('useSchool must be used within a SchoolProvider');
  }
  return context;
}
