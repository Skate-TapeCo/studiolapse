// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { useProject } from '../../src/context/ProjectContext';

const KEY = 'studiolapse:projects';
const BRAND_ORANGE = '#FF3A1E';
const BRAND_CHARCOAL = '#2A2F33';

type Project = {
  id: string;
  name: string;
  createdAt: number;
  clips?: { uri: string; createdAt: number }[];
};

export default function Projects() {
  const router = useRouter();
  const { selectedProjectId, setSelectedProjectId } = useProject();
  const [name, setName] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);

  const load = useCallback(async () => {
    const raw = await AsyncStorage.getItem(KEY);
    const list: Project[] = raw ? JSON.parse(raw) : [];
    const sorted = [...list].sort((a, b) => b.createdAt - a.createdAt);
    setProjects(sorted);
  }, []);

  useEffect(() => { load(); }, [load]);

  useFocusEffect(
    useCallback(() => { load(); }, [load])
  );

  const add = async () => {
    const p: Project = {
      id: Date.now().toString(),
      name: (name || '').trim() || 'Untitled',
      createdAt: Date.now(),
      clips: [],
    };
    const next = [p, ...projects];
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    setProjects(next);
    setName('');
  };

  const openProject = (id: string) => {
    router.push(`/project/${id}`);
  };

  const renderItem = ({ item }: { item: Project }) => {
    const isSelected = selectedProjectId === item.id;
    return (
      <View
        style={[
          s.rowContainer,
          isSelected
            ? { borderColor: BRAND_ORANGE, backgroundColor: '#FFE9E5' }
            : { borderColor: '#eee', backgroundColor: '#fff' },
        ]}
      >
        <Pressable style={{ flex: 1 }} onPress={() => setSelectedProjectId(item.id)}>
          <Text style={s.name}>{item.name}</Text>
          <Text style={s.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
          {isSelected ? <Text style={s.selectedTag}>Selected</Text> : null}
        </Pressable>
        <Pressable onPress={() => openProject(item.id)} style={s.openBtn}>
          <Text style={s.openBtnText}>Open</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={[s.container, { paddingTop: 16 + (StatusBar.currentHeight || 0) }]}>
      <Text style={s.title}>Projects</Text>

      <View style={s.addRow}>
        <TextInput
          placeholder="New project name"
          value={name}
          onChangeText={setName}
          style={s.input}
        />
        <Pressable onPress={add} style={s.addBtn}>
          <Text style={s.addBtnText}>Add Project</Text>
        </Pressable>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={s.sep} />}
        ListEmptyComponent={<Text style={s.empty}>No projects yet.</Text>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '900', color: BRAND_CHARCOAL, marginBottom: 12 },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 10, paddingHorizontal: 10, height: 40 },
  addBtn: { backgroundColor: BRAND_ORANGE, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  addBtnText: { color: '#fff', fontWeight: '800' },

  rowContainer: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: { fontSize: 16, fontWeight: '700', color: BRAND_CHARCOAL },
  meta: { color: '#666', marginTop: 2 },
  selectedTag: { marginTop: 4, fontSize: 12, fontWeight: '800', color: BRAND_ORANGE },

  openBtn: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: BRAND_CHARCOAL, borderRadius: 10, marginLeft: 10 },
  openBtnText: { color: '#fff', fontWeight: '800' },

  sep: { height: 10 },
  empty: { color: '#666', textAlign: 'center', marginTop: 24 },
});
