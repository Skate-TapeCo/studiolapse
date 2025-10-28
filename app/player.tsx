// @ts-nocheck
import { Video } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Player() {
  const { uri, title } = useLocalSearchParams();
  const router = useRouter();
  const ref = useRef<Video | null>(null);
  const [status, setStatus] = useState<any>({});

  useEffect(() => {
    ScreenOrientation.unlockAsync();
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  if (!uri) {
    return (
      <View style={s.container}>
        <Text style={s.title}>No video</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.smallBtn}>
          <Text style={s.smallBtnText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>{title || 'Clip'}</Text>
      <View style={s.player}>
        <Video
          ref={ref}
          style={s.video}
          source={{ uri: String(uri) }}
          useNativeControls
          resizeMode="contain"
          shouldPlay
          onPlaybackStatusUpdate={setStatus}
        />
      </View>
      <View style={s.controls}>
        <TouchableOpacity onPress={() => ref.current?.playAsync()} style={s.smallBtn}>
          <Text style={s.smallBtnText}>Play</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => ref.current?.pauseAsync()} style={s.smallBtn}>
          <Text style={s.smallBtnText}>Pause</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={s.smallBtn}>
          <Text style={s.smallBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.meta}>{status?.positionMillis ? Math.round(status.positionMillis / 1000) : 0}s</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 16 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  player: { flex: 1, backgroundColor: '#000', borderRadius: 12, overflow: 'hidden' },
  video: { width: '100%', height: '100%' },
  controls: { flexDirection: 'row', gap: 12, marginTop: 12 },
  smallBtn: { backgroundColor: '#222', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  smallBtnText: { color: '#fff', fontWeight: '600' },
  meta: { color: '#aaa', marginTop: 8 },
});
