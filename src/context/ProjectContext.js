import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const SELECTED_PROJECT_KEY = 'studiolapse:selectedProjectId';
const PROJECTS_KEY = 'studiolapse:projects';

const ProjectContext = createContext({
  selectedProjectId: null,
  setSelectedProjectId: () => {},
  clearSelectedProject: () => {},
});

export function ProjectProvider({ children }) {
  const [selectedProjectId, setSelectedProjectIdState] = useState(null);

  // Load saved selected project, but only if it still exists
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(SELECTED_PROJECT_KEY);
        if (!saved) {
          setSelectedProjectIdState(null);
          return;
        }

        const rawProjects = await AsyncStorage.getItem(PROJECTS_KEY);
        if (!rawProjects) {
          // no projects at all, kill stale selection
          await AsyncStorage.removeItem(SELECTED_PROJECT_KEY);
          setSelectedProjectIdState(null);
          return;
        }

        const projects = JSON.parse(rawProjects);
        const exists =
          Array.isArray(projects) &&
          projects.some((p) => p && p.id === saved);

        if (exists) {
          setSelectedProjectIdState(saved);
        } else {
          // selected project was deleted
          await AsyncStorage.removeItem(SELECTED_PROJECT_KEY);
          setSelectedProjectIdState(null);
        }
      } catch (e) {
        console.warn('Failed to load selected project:', e);
        setSelectedProjectIdState(null);
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
    <ProjectContext.Provider
      value={{ selectedProjectId, setSelectedProjectId, clearSelectedProject }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  return useContext(ProjectContext);
}
