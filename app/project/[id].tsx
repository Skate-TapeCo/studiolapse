// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useProject } from '../../src/context/ProjectContext';

const PROJECTS_KEY = 'studiolapse:projects';

async function deleteClip(projectId: string, clipIndex: number) {
  const raw = await AsyncStorage.getItem(PROJECTS_KEY);
  const list = raw ? JSON.parse(raw) : [];
  const updated = list.map((p: any) => {
    if (p.id !== projectId) return p;
    const newClips = Array.isArray(p.clips) ? [...p.clips] : [];
    newClips.splice(clipIndex, 1);
    return { ...p, clips: newClips };
  });
  await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(updated));
}

async function deleteProject(projectId: string, router: any) {
  const raw = await AsyncStorage.getItem(PROJECTS_KEY);
  const list = raw ? JSON.parse(raw) : [];
  const updated = list.filter((p: any) => p.id !== projectId);
  await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(updated));
  router.replace('/(tabs)/projects');
}

async function renameProject(projectId: string, newName: string) {
  const name = (newName || '').trim() || 'Untitled';
  const raw = await AsyncStorage.getItem(PROJECTS_KEY);
  const list = raw ? JSON.parse(raw) : [];
  const updated = list.map((p: any) => (p.id === projectId ? { ...p, name } : p));
  await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(updated));
  return updated.find((p: any) => p.id === projectId) || null;
}

export default function ProjectDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { setSelectedProjectId } = useProject();

  const [project, setProject] = useState<any | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [editName, setEditName] = useState('');

  // NEW: export picker state
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [targetDurationSec, setTargetDurationSec] = useState<number | null>(null);

  const loadProject = useCallback(async () => {
    const raw = await AsyncStorage.getItem(PROJECTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const found = list.find((p: any) => p.id === String(id)) || null;
    if (found && Array.isArray(found.clips)) {
      found.clips = [...found.clips].sort((a, b) => b.createdAt - a.createdAt); // newest on top
    }
    setProject(found);
    setEditName(found?.name || '');
  }, [id]);

  useEffect(() => { loadProject(); }, [loadProject]);

  useFocusEffect(
    useCallback(() => {
      loadProject();
    }, [loadProject])
  );

  if (!project) {
    return (
      <View style={s.container}>
        <Text style={s.title}>Project</Text>
        <Text style={s.muted}>Loading…</Text>
      </View>
    );
  }

  const total = Array.isArray(project.clips) ? project.clips.length : 0;

  return (
    <View style={s.container}>
      <Text style={s.title}>{project.name}</Text>

      <Pressable
        onPress={() => {
          setSelectedProjectId(project.id);
          router.push('/camera');
        }}
        style={s.recordBtn}
      >
        <Text style={s.recordText}>Record for this Project</Text>
      </Pressable>

      {/* Export button now opens duration picker */}
      <View style={s.exportRow}>
        <Pressable
          onPress={() => setExportModalVisible(true)}
          style={s.exportBtn}
        >
          <Text style={s.exportText}>Export Timelapse</Text>
        </Pressable>
        <Text style={s.chosenText}>
          {targetDurationSec ? `Chosen: ${targetDurationSec}s` : 'No duration chosen'}
        </Text>
      </View>

      {!renaming ? (
        <View style={s.actionsRow}>
          <Pressable onPress={() => setRenaming(true)} style={s.renameBtn}>
            <Text style={s.renameText}>Rename</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Alert.alert(
                'Delete Project',
                'Delete this project and all its clips?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: async () => { await deleteProject(project.id, router); } },
                ]
              );
            }}
            style={s.deleteProjectBtn}
          >
            <Text style={s.deleteProjectText}>Delete Project</Text>
          </Pressable>
        </View>
      ) : (
        <View style={s.renameRow}>
          <TextInput
            value={editName}
            onChangeText={setEditName}
            placeholder="Project name"
            style={s.input}
          />
          <Pressable
            onPress={async () => {
              const updated = await renameProject(project.id, editName);
              setProject(updated);
              setRenaming(false);
            }}
            style={s.saveBtn}
          >
            <Text style={s.saveText}>Save</Text>
          </Pressable>
          <Pressable onPress={() => { setEditName(project.name); setRenaming(false); }} style={s.cancelBtn}>
            <Text style={s.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={Array.isArray(project.clips) ? project.clips : []}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item, index }) => (
          <View style={s.clipRow}>
            <Pressable
              style={{ flex: 1 }}
              onPress={() => router.push({ pathname: '/player', params: { uri: item.uri, title: `Clip ${total - index}` } })}
            >
              <Text style={s.clipTitle}>Clip {total - index}</Text>
              <Text style={s.clipMeta}>{new Date(item.createdAt).toLocaleString()}</Text>
              <Text style={s.uri} numberOfLines={1}>{item.uri}</Text>
            </Pressable>

            <Pressable
              onPress={async () => {
                try {
                  await Share.share({
                    title: `Clip ${total - index}`,
                    message: item.uri,
                    url: item.uri
                  });
                } catch {}
              }}
              style={s.shareBtn}
            >
              <Text style={s.shareText}>Share</Text>
            </Pressable>

            <Pressable
              onPress={async () => {
                await deleteClip(project.id, index);
                await loadProject();
              }}
              style={s.deleteBtn}
            >
              <Text style={s.deleteText}>Delete</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={s.muted}>No clips yet for this project.</Text>}
      />

      {/* Duration picker modal */}
      <Modal
        visible={exportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setExportModalVisible(false)}
      >
        <View style={s.backdrop}>
          <View style={s.card}>
            <Text style={s.modalTitle}>Choose final timelapse length</Text>
            <View style={s.optionsRow}>
              {[20, 30, 45, 60].map((sec) => (
                <Pressable
                  key={sec}
                  onPress={() => setTargetDurationSec(sec)}
                  style={[
                    s.optionBtn,
                    targetDurationSec === sec && s.optionBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      s.optionText,
                      targetDurationSec === sec && s.optionTextActive,
                    ]}
                  >
                    {sec}s
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={[s.optionBtn, s.optionBtnDisabled]} disabled>
              <Text style={[s.optionText, s.optionTextDisabled]}>Custom (Pro later)</Text>
            </Pressable>
            <View style={s.modalActions}>
              <Pressable onPress={() => setExportModalVisible(false)} style={s.cancelBtn2}>
                <Text style={s.cancelText2}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  muted: { color: '#666' },

  recordBtn: { backgroundColor: '#1f6feb', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, marginBottom: 12, alignSelf: 'flex-start' },
  recordText: { color: '#fff', fontWeight: '700' },

  exportRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  exportBtn: { backgroundColor: '#111', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, alignSelf: 'flex-start' },
  exportText: { color: '#fff', fontWeight: '700' },
  chosenText: { color: '#555' },

  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  renameBtn: { backgroundColor: '#1f6feb', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  renameText: { color: '#fff', fontWeight: '700' },
  deleteProjectBtn: { backgroundColor: '#b02727', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  deleteProjectText: { color: '#fff', fontWeight: '700' },

  renameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 10, height: 40 },
  saveBtn: { backgroundColor: '#1f6feb', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  saveText: { color: '#fff', fontWeight: '700' },
  cancelBtn: { backgroundColor: '#eee', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  cancelText: { color: '#333', fontWeight: '700' },

  clipRow: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', alignItems: 'center' },
  clipTitle: { fontSize: 16, fontWeight: '600' },
  clipMeta: { color: '#666', marginBottom: 4 },
  uri: { fontSize: 12, color: '#444' },
  shareBtn: { backgroundColor: '#444', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, marginLeft: 10 },
  shareText: { color: '#fff', fontWeight: '600' },
  deleteBtn: { backgroundColor: '#d9534f', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, marginLeft: 10 },
  deleteText: { color: '#fff', fontWeight: '600' },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  card: { backgroundColor: '#fff', width: '100%', borderRadius: 14, padding: 16, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: { borderWidth: 1, borderColor: '#ccc', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  optionBtnActive: { borderColor: '#111', backgroundColor: '#111' },
  optionText: { color: '#111', fontWeight: '700' },
  optionTextActive: { color: '#fff' },
  optionBtnDisabled: { opacity: 0.4, borderStyle: 'dashed' },
  optionTextDisabled: { color: '#666' },
  modalActions: { marginTop: 4, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  cancelBtn2: { backgroundColor: '#eee', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  cancelText2: { color: '#333', fontWeight: '700' },
});
