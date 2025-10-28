// @ts-nocheck
import { Video } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Player() {
  const { uri, title } = useLocalSearchParams();
  const router = useRouter();
  const ref = useRef<Video | null>(null);
  const [status, setStatus] = useState<any>({});

  if (!uri) {
    return (
      <View style={s.center}>
        <Text style={s.noVid}>No video</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.smallBtn}>
          <Text style={s.smallBtnTxt}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { width, height } = Dimensions.get('window');

  return (
    <View style={s.full}>
      <Video
        ref={ref}
        style={{ width, height }}
        source={{ uri: String(uri) }}
        useNativeControls
        resizeMode="contain"
        shouldPlay
        onPlaybackStatusUpdate={setStatus}
      />
      <View style={s.controls}>
        <TouchableOpacity onPress={() => ref.current?.playAsync()} style={s.smallBtn}><Text style={s.smallBtnTxt}>Play</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => ref.current?.pauseAsync()} style={s.smallBtn}><Text style={s.smallBtnTxt}>Pause</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={s.smallBtn}><Text style={s.smallBtnTxt}>Done</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  full: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  controls: { position: 'absolute', bottom: 12, left: 12, right: 12, flexDirection: 'row', gap: 12, justifyContent: 'center' },
  smallBtn: { backgroundColor: '#222', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  smallBtnTxt: { color: '#fff', fontWeight: '600' },
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  noVid: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
});
