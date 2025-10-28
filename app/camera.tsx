// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import React, { ComponentRef, useEffect, useRef, useState } from 'react';
import { Alert, Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useProject } from '../src/context/ProjectContext';

type CamInst = ComponentRef<typeof CameraView>;
const PROJECTS_KEY = 'studiolapse:projects';

async function addClipToProject(projectId: string, clip: { uri: string; createdAt: number }) {
  const raw = await AsyncStorage.getItem(PROJECTS_KEY);
  const list = raw ? JSON.parse(raw) : [];
  const next = list.map((p: any) => {
    if (p.id === projectId) {
      const clips = Array.isArray(p.clips) ? p.clips : [];
      return { ...p, clips: [{ uri: clip.uri, createdAt: clip.createdAt }, ...clips] };
    }
    return p;
  });
  await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
}

export default function CameraScreen() {
  const router = useRouter();
  const camRef = useRef<CamInst | null>(null);

  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();

  const { selectedProjectId } = useProject();

  const [hasLib, setHasLib] = useState<boolean | null>(null);
  const [recording, setRecording] = useState(false);
  const [ready, setReady] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    (async () => {
      const lib = await MediaLibrary.requestPermissionsAsync();
      setHasLib(lib.status === 'granted');
    })();
  }, []);

  useEffect(() => {
    let t: any;
    if (recording) {
      setRecordSeconds(0);
      t = setInterval(() => {
        setRecordSeconds((s) => s + 1);
        setBlink((b) => !b);
      }, 1000);
    } else {
      setRecordSeconds(0);
      setBlink(true);
    }
    return () => clearInterval(t);
  }, [recording]);

  if (!camPerm || !micPerm) return <View style={styles.center}><Text>Checking permissions…</Text></View>;

  if (!camPerm.granted || !micPerm.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ marginBottom: 10, textAlign: 'center' }}>StudioLapse needs Camera and Microphone permissions.</Text>
        {!camPerm.granted && <Button title="Grant Camera" onPress={requestCamPerm} />}
        {!micPerm.granted && <View style={{ height: 8 }} />}
        {!micPerm.granted && <Button title="Grant Microphone" onPress={requestMicPerm} />}
      </View>
    );
  }

  const onReady = () => setReady(true);

  const saveVideo = async (uri?: string) => {
    if (!uri) return;
    if (!selectedProjectId) {
      Alert.alert('Select a project', 'Open the Projects tab and tap a project first.');
      setRecording(false);
      return;
    }
    if (hasLib) {
      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync('StudioLapse', asset, false);
    }
    const clip = { uri, createdAt: Date.now() };
    try {
      await addClipToProject(selectedProjectId, clip);
      Alert.alert('Saved', 'Clip saved and linked to your project.');
    } catch (e: any) {
      Alert.alert('Error', `Saved to gallery, but could not link to project: ${e?.message || String(e)}`);
    }
    setRecording(false);
    router.back();
  };

  const startRecording = async () => {
    if (!ready || !camRef.current) {
      Alert.alert('One sec', 'Camera is still starting. Try again in a moment.');
      return;
    }
    setRecording(true);
    const inst: any = camRef.current;
    try {
      if (typeof inst.startRecording === 'function') {
        await inst.startRecording({
          onRecordingFinished: (video: any) => saveVideo(video?.uri),
          onRecordingError: (e: any) => {
            setRecording(false);
            Alert.alert('Error', `Recording failed: ${e?.message || String(e)}`);
          },
        });
      } else if (typeof inst.recordAsync === 'function') {
        const video = await inst.recordAsync();
        await saveVideo(video?.uri);
      } else {
        setRecording(false);
        Alert.alert('Error', 'This build does not expose a recording method on CameraView.');
      }
    } catch (e: any) {
      setRecording(false);
      Alert.alert('Error', `Could not start recording: ${e?.message || String(e)}`);
    }
  };

  const stopRecording = async () => {
    const inst: any = camRef.current;
    try {
      if (typeof inst.stopRecording === 'function') await inst.stopRecording();
    } catch {}
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <CameraView
        ref={camRef}
        style={{ flex: 1 }}
        facing="back"
        mode="video"
        videoQuality="720p"
        onCameraReady={onReady}
      />

      {recording && (
        <View style={styles.indicatorWrapper}>
          <View style={[styles.dot, { opacity: blink ? 1 : 0.2 }]} />
          <Text style={styles.timerText}>
            {String(Math.floor(recordSeconds / 60)).padStart(2, '0')}:{String(recordSeconds % 60).padStart(2, '0')}
          </Text>
        </View>
      )}

      <View style={styles.controls}>
        {!recording ? (
          <TouchableOpacity
            onPress={startRecording}
            style={[styles.btn, { backgroundColor: ready ? 'red' : '#444' }]}
            disabled={!ready}
          />
        ) : (
          <TouchableOpacity onPress={stopRecording} style={[styles.btn, { backgroundColor: 'white' }]} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  controls: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
  btn: { width: 72, height: 72, borderRadius: 36 },
  indicatorWrapper: {
    position: 'absolute', top: 40, left: 20, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8
  },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'red', marginRight: 8 },
  timerText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
