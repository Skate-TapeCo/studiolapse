// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView, TouchableOpacity } from 'react-native-gesture-handler';
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
    setProjects(Array.isArray(list) ? list : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const add = async () => {
    const trimmed = (name || '').trim().slice(0, 25);

    const p: Project = {
      id: Date.now().toString(),
      name: trimmed || 'Untitled',
      createdAt: Date.now(),
      clips: [],
    };

    const next = [p, ...projects];
    setProjects(next);
    setName('');
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  };

  const openProject = (id: string) => {
    router.push(`/project/${id}`);
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Project>) => {
    const isSelected = selectedProjectId === item.id;

    return (
      <View
        style={[
          s.rowContainer,
          isSelected
            ? { borderColor: BRAND_ORANGE, backgroundColor: '#FFE9E5' }
            : { borderColor: '#eee', backgroundColor: '#fff' },
          isActive ? { opacity: 0.9 } : null,
        ]}
      >
        <TouchableOpacity
          onLongPress={drag}
          delayLongPress={150}
          disabled={isActive}
          style={s.dragHandle}
        >
          <Text style={s.dragText}>≡</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          disabled={isActive}
          onPress={() => setSelectedProjectId(item.id)}
          style={s.leftCol}
        >
          <Text style={s.name} numberOfLines={1} ellipsizeMode="tail">
            {(item.name || '').slice(0, 25)}
          </Text>

          <Text style={s.meta} numberOfLines={1}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>

          {isSelected ? <Text style={s.selectedTag}>Selected</Text> : null}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          disabled={isActive}
          onPress={() => openProject(item.id)}
          style={s.openBtn}
        >
          <Text style={s.openBtnText}>Open</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[s.container, { paddingTop: 16 + (StatusBar.currentHeight || 0) }]}>
        <Text style={s.title}>Projects</Text>

        <View style={s.addRow}>
          <TextInput
            placeholder="New project name"
            value={name}
            onChangeText={setName}
            style={s.input}
            maxLength={25}
          />
          <TouchableOpacity activeOpacity={0.8} onPress={add} style={s.addBtn}>
            <Text style={s.addBtnText}>Add Project</Text>
          </TouchableOpacity>
        </View>

        <DraggableFlatList
          data={projects}
          keyExtractor={(p) => p.id}
          renderItem={renderItem}
          activationDistance={12}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          ListEmptyComponent={<Text style={s.empty}>No projects yet.</Text>}
          onDragEnd={async ({ data }) => {
            setProjects(data);
            await AsyncStorage.setItem(KEY, JSON.stringify(data));
          }}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '900', color: BRAND_CHARCOAL, marginBottom: 12 },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  addBtn: { backgroundColor: BRAND_ORANGE, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  addBtnText: { color: '#fff', fontWeight: '800' },

  rowContainer: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  dragHandle: {
    width: 34,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#f2f2f2',
  },
  dragText: { fontSize: 20, fontWeight: '900', color: '#666', marginTop: -2 },

  leftCol: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },

  name: { fontSize: 16, fontWeight: '700', color: BRAND_CHARCOAL },
  meta: { color: '#666', marginTop: 2 },
  selectedTag: { marginTop: 4, fontSize: 12, fontWeight: '800', color: BRAND_ORANGE },

  openBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: BRAND_CHARCOAL,
    borderRadius: 10,
    alignSelf: 'center',
  },
  openBtnText: { color: '#fff', fontWeight: '800' },

  sep: { height: 10 },
  empty: { color: '#666', textAlign: 'center', marginTop: 24 },
});
