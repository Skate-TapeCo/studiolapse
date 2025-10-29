// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { ComponentRef, useEffect, useRef, useState } from 'react';
import { Alert, Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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

  const insets = useSafeAreaInsets();

  // Keep camera screen portrait; allow rotation elsewhere after we leave
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);

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

  if (!camPerm || !micPerm) {
    return <View style={s.center}><Text>Checking permissions…</Text></View>;
  }

  if (!camPerm.granted || !micPerm.granted) {
    return (
      <View style={s.center}>
        <Text style={{ marginBottom: 10, textAlign: 'center' }}>
          StudioLapse needs Camera and Microphone permissions.
        </Text>
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
    router.back(); // player screen can now rotate because we unlock on unmount
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
    <SafeAreaView style={s.full} edges={['top','bottom','left','right']}>
      <View style={s.previewWrap}>
        <CameraView
          ref={camRef}
          style={s.preview}
          facing="back"
          mode="video"
          videoQuality="720p"
          ratio="16:9"
          onCameraReady={onReady}
        />
      </View>

      {recording && (
        <View style={[s.indicator, { top: insets.top + 12, left: 16 }]}>
          <View style={[s.dot, { opacity: blink ? 1 : 0.25 }]} />
          <Text style={s.timer}>
            {String(Math.floor(recordSeconds / 60)).padStart(2, '0')}:
            {String(recordSeconds % 60).padStart(2, '0')}
          </Text>
        </View>
      )}

      <View style={[s.controls, { marginBottom: insets.bottom + 20 }]}>
        {!recording ? (
          <TouchableOpacity
            onPress={startRecording}
            style={[s.btn, { backgroundColor: ready ? 'red' : '#444' }]}
            disabled={!ready}
          />
        ) : (
          <TouchableOpacity onPress={stopRecording} style={[s.btn, { backgroundColor: 'white' }]} />
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  full: { flex: 1, backgroundColor: '#000' },
  previewWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  preview: { width: '100%', height: '100%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  controls: { position: 'absolute', bottom: 0, width: '100%', alignItems: 'center' },
  btn: { width: 72, height: 72, borderRadius: 36 },
  indicator: {
    position: 'absolute', flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8
  },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'red', marginRight: 8 },
  timer: { color: 'white', fontSize: 16, fontWeight: '600' },
});
