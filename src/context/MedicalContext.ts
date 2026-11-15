import { createContext, useContext } from 'react';
import type { useMedicalState } from '../hooks/useMedicalState';

export type Medical = ReturnType<typeof useMedicalState>;
export const MedicalContext = createContext<Medical | null>(null);
export const useMedical = () => useContext(MedicalContext);
