import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const SELECTED_PROJECT_KEY = 'studiolapse:selectedProjectId';

const ProjectContext = createContext({
  selectedProjectId: null,
  setSelectedProjectId: () => {},
  clearSelectedProject: () => {},
});

export function ProjectProvider({ children }) {
  const [selectedProjectId, setSelectedProjectIdState] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(SELECTED_PROJECT_KEY);
        if (saved) setSelectedProjectIdState(saved);
      } catch (e) {
        console.warn('Failed to load selected project:', e);
      }
    })();
  }, []);

  const setSelectedProjectId = useCallback(async (projectId) => {
    try {
      setSelectedProjectIdState(projectId);
      if (projectId) {
        await AsyncStorage.setItem(SELECTED_PROJECT_KEY, projectId);
      } else {
        await AsyncStorage.removeItem(SELECTED_PROJECT_KEY);
      }
    } catch (e) {
      console.warn('Failed to save selected project:', e);
    }
  }, []);

  const clearSelectedProject = useCallback(() => {
    setSelectedProjectId(null);
  }, [setSelectedProjectId]);

  return (
    <ProjectContext.Provider value={{ selectedProjectId, setSelectedProjectId, clearSelectedProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  return useContext(ProjectContext);
}
