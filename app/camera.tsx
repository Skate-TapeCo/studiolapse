// @ts-nocheck
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import React, { ComponentRef, useEffect, useRef, useState } from 'react';
import { Alert, Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type CamInst = ComponentRef<typeof CameraView>;

export default function CameraScreen() {
  const router = useRouter();
  const camRef = useRef<CamInst | null>(null);

  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();
  const [hasLib, setHasLib] = useState<boolean | null>(null);
  const [recording, setRecording] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const lib = await MediaLibrary.requestPermissionsAsync();
      setHasLib(lib.status === 'granted');
    })();
  }, []);

  if (!camPerm || !micPerm) {
    return <View style={styles.center}><Text>Checking permissions…</Text></View>;
  }

  if (!camPerm.granted || !micPerm.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ marginBottom: 10, textAlign: 'center' }}>
          StudioLapse needs Camera and Microphone permissions to record video.
        </Text>
        {!camPerm.granted && <Button title="Grant Camera" onPress={requestCamPerm} />}
        {!micPerm.granted && <View style={{ height: 8 }} />}
        {!micPerm.granted && <Button title="Grant Microphone" onPress={requestMicPerm} />}
      </View>
    );
  }

  const onReady = () => {
    setReady(true);
    try {
      const inst: any = camRef.current;
      const keys = inst ? Object.getOwnPropertyNames(Object.getPrototypeOf(inst)) : [];
      console.log('CameraView instance methods:', keys);
    } catch (e) {
      console.log('Probe error:', e);
    }
  };

  const saveVideo = async (uri?: string) => {
    if (!uri) return;
    if (hasLib) {
      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync('StudioLapse', asset, false);
    }
    Alert.alert('Saved', 'Session clip saved to your Gallery (StudioLapse).');
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
        // Newer API
        await inst.startRecording({
          onRecordingFinished: (video: any) => saveVideo(video?.uri),
          onRecordingError: (e: any) => {
            setRecording(false);
            Alert.alert('Error', `Recording failed: ${e?.message || String(e)}`);
          },
        });
      } else if (typeof inst.recordAsync === 'function') {
        // Older-style API
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
      if (typeof inst.stopRecording === 'function') {
        await inst.stopRecording();
      } else if (inst) {
        // recordAsync path stops when we return from await; no action needed
      }
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
});
