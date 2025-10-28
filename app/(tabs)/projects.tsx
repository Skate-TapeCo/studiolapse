// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useProject } from '../../src/context/ProjectContext';

const KEY = 'studiolapse:projects';

export default function Projects() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [projects, setProjects] = useState([]);
  const { selectedProjectId, setSelectedProjectId } = useProject();

  const load = async () => {
    const raw = await AsyncStorage.getItem(KEY);
    setProjects(raw ? JSON.parse(raw) : []);
  };

  useEffect(() => { load(); }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const add = async () => {
    const p = { id: Date.now().toString(), name: name.trim() || 'Untitled', createdAt: Date.now(), clips: [] };
    const next = [p, ...projects];
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    setProjects(next);
    setName('');
  };

  const openProject = (id: string) => {
    router.push(`/project/${id}`);
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedProjectId === item.id;
    return (
      <View style={[s.rowContainer, { borderColor: isSelected ? '#6aa84f' : '#eee', backgroundColor: isSelected ? '#e7f5e7' : '#fff' }]}>
        <Pressable style={{ flex:1 }} onPress={() => setSelectedProjectId(item.id)}>
          <Text style={{ fontSize:16, fontWeight:'600' }}>{item.name}</Text>
          <Text style={{ color:'#666' }}>{new Date(item.createdAt).toLocaleString()}</Text>
          {isSelected ? <Text style={{ fontSize:12, marginTop:4 }}>Selected</Text> : null}
        </Pressable>
        <Pressable onPress={() => openProject(item.id)} style={s.openBtn}>
          <Text style={s.openBtnText}>Open</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={{ flex:1, padding:16 }}>
      <Text style={s.title}>Projects</Text>
      <View style={{ flexDirection:'row', gap:8, marginBottom:12 }}>
        <TextInput
          placeholder="New project name"
          value={name}
          onChangeText={setName}
          style={s.input}
        />
        <Pressable onPress={add} style={s.addBtn}>
          <Text style={s.addBtnText}>Add</Text>
        </Pressable>
      </View>
      <FlatList
        data={projects}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={{ color:'#666' }}>No projects yet.</Text>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  title:{ fontSize:22, fontWeight:'700', marginBottom:12 },
  input:{ flex:1, borderWidth:1, borderColor:'#ccc', borderRadius:8, paddingHorizontal:10, height:40 },
  addBtn:{ backgroundColor:'#111', borderRadius:8, paddingHorizontal:16, justifyContent:'center', alignItems:'center' },
  addBtnText:{ color:'#fff', fontWeight:'600' },
  rowContainer:{ paddingVertical:10, borderBottomWidth:1, borderColor:'#eee', borderWidth:1, borderRadius:10, paddingHorizontal:12, marginBottom:10, flexDirection:'row', alignItems:'center' },
  openBtn:{ paddingVertical:8, paddingHorizontal:12, backgroundColor:'#111', borderRadius:8, marginLeft:10 },
  openBtnText:{ color:'#fff', fontWeight:'600' },
});
