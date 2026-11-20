import { useContext } from 'react';
import { StudyContext, type StudyContextValue } from './StudyContext';

export function useStudy(): StudyContextValue {
  const value = useContext(StudyContext);
  if (!value) throw new Error('useStudy must be used inside <StudyProvider>');
  return value;
}
